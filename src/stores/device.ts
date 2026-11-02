import { acceptHMRUpdate, defineStore } from 'pinia'
import { api, error_message, set_api_device } from '../api'
import { bytes_equal, from_base64, to_base64 } from '../crypto/encoding'
import { type IdentityKeyPair, derive_identity, sign_device_certificate, verify_device_certificate } from '../crypto/identity'
import { type DeviceKeys, type LocalKeyPackage, decode_key_package, encode_key_package, generate_key_package, generate_signature_key_pair } from '../crypto/mls'
import { vault_delete, vault_delete_all, vault_get, vault_set } from '../crypto/vault'

// Keep enough key packages on the server for other devices to add this one to new groups
const MIN_KEY_PACKAGES = 10
const TARGET_KEY_PACKAGES = 30

export type DeviceStatus = 'unknown' | 'needs_identity' | 'needs_device' | 'ready'

interface StoredDevice extends DeviceKeys {
  Device_name: string
  // Identity key derived locally from the phrase when this device was set up
  identity_public_key: Uint8Array
}

interface StoredKeyPackage {
  public_package: Uint8Array
  private_package: LocalKeyPackage['private_package']
}

function guess_device_name(): string {
  const agent = navigator.userAgent
  const browser = /Edg\//.test(agent)
    ? 'Edge'
    : /Firefox\//.test(agent)
      ? 'Firefox'
      : /Chrome\//.test(agent)
        ? 'Chrome'
        : /Safari\//.test(agent) ? 'Safari' : 'Navigateur'
  const system = /Android/.test(agent)
    ? 'Android'
    : /iPhone|iPad/.test(agent)
      ? 'iOS'
      : /Mac OS X/.test(agent)
        ? 'macOS'
        : /Windows/.test(agent) ? 'Windows' : /Linux/.test(agent) ? 'Linux' : ''
  return system ? `${browser} sur ${system}` : browser
}

export const useDeviceStore = defineStore('device', () => {
  const user_store = useUserStore()
  const status: Ref<DeviceStatus> = ref('unknown')
  const device = shallowRef<StoredDevice | null>(null)

  function prefix(User_id: number) {
    return `u${User_id}:`
  }

  // Find this browser's device for the logged in user, or tell what setup it needs
  async function load() {
    const this_user = user_store.user
    if (!this_user) {
      lock()
      return
    }
    const stored = await vault_get<StoredDevice>(`${prefix(this_user.User_id)}device`)
    const server_identity = this_user.identity_public_key ? from_base64(this_user.identity_public_key) : null

    // A stored device is only usable with the identity it was certified by
    if (stored && server_identity && bytes_equal(stored.identity_public_key, server_identity)
      && verify_device_certificate(stored.identity_public_key, stored.User_id, stored.Device_id, stored.signature_public_key, stored.certificate)) {
      device.value = stored
      set_api_device(stored.Device_id)
      status.value = 'ready'
      replenish_key_packages().catch(error => console.error('Unable to publish key packages:', error_message(error)))
      return
    }
    status.value = server_identity ? 'needs_device' : 'needs_identity'
  }

  // First device of the account: the phrase creates the identity
  async function setup_identity(phrase: string) {
    const identity = await derive_identity(phrase)
    try {
      await user_store.set_identity(to_base64(identity.public_key))
      await register_device(identity)
    }
    finally {
      identity.secret_key.fill(0)
    }
  }

  // New device of an existing account: the phrase must give back the same identity
  async function link_device(phrase: string) {
    const this_user = user_store.user
    if (!this_user?.identity_public_key)
      throw new Error('Ce compte n\'a pas encore d\'identité')
    const identity = await derive_identity(phrase)
    try {
      if (!bytes_equal(identity.public_key, from_base64(this_user.identity_public_key)))
        throw new Error('Cette phrase ne correspond pas à l\'identité de ce compte')
      await register_device(identity)
    }
    finally {
      identity.secret_key.fill(0)
    }
  }

  async function register_device(identity: IdentityKeyPair) {
    const this_user = user_store.user
    if (!this_user)
      throw new Error('Not logged in')

    const Device_id = crypto.randomUUID()
    const Device_name = guess_device_name()
    const signature_keys = await generate_signature_key_pair()
    const certificate = sign_device_certificate(identity, this_user.User_id, Device_id, signature_keys.publicKey)

    try {
      await api.post('/devices', {
        Device_id,
        Device_name,
        signature_public_key: to_base64(signature_keys.publicKey),
        certificate: to_base64(certificate),
      })
    }
    catch (error) {
      throw new Error(error_message(error))
    }

    const stored: StoredDevice = {
      User_id: this_user.User_id,
      Device_id,
      Device_name,
      certificate,
      signature_public_key: signature_keys.publicKey,
      signature_private_key: signature_keys.signKey,
      identity_public_key: identity.public_key,
    }
    await vault_set(`${prefix(this_user.User_id)}device`, stored)
    device.value = stored
    set_api_device(Device_id)
    status.value = 'ready'
    await replenish_key_packages()
  }

  async function replenish_key_packages() {
    const this_device = device.value
    if (!this_device)
      return
    const { data } = await api.get('/key_packages/count')
    if (data.count >= MIN_KEY_PACKAGES)
      return

    const new_key_packages: LocalKeyPackage[] = []
    for (let index = data.count; index < TARGET_KEY_PACKAGES; index++)
      new_key_packages.push(await generate_key_package(this_device))

    // Private parts are stored before publishing, so a welcome can never arrive for an unknown key package
    for (const key_package of new_key_packages) {
      await vault_set(`${prefix(this_device.User_id)}kp:${key_package.KeyPackage_ref}`, {
        public_package: encode_key_package(key_package.public_package),
        private_package: key_package.private_package,
      } satisfies StoredKeyPackage)
    }
    await api.post('/key_packages', {
      key_packages: new_key_packages.map(key_package => ({
        KeyPackage_ref: key_package.KeyPackage_ref,
        key_package: to_base64(encode_key_package(key_package.public_package)),
      })),
    })
  }

  async function load_key_package(KeyPackage_ref: string): Promise<LocalKeyPackage | null> {
    if (!device.value)
      return null
    const stored = await vault_get<StoredKeyPackage>(`${prefix(device.value.User_id)}kp:${KeyPackage_ref}`)
    if (!stored)
      return null
    return {
      KeyPackage_ref,
      public_package: decode_key_package(stored.public_package),
      private_package: stored.private_package,
    }
  }

  // A key package is used once: its private keys are deleted after joining
  async function delete_key_package(KeyPackage_ref: string) {
    if (device.value)
      await vault_delete(`${prefix(device.value.User_id)}kp:${KeyPackage_ref}`)
  }

  // Erase every key, group state and message of this user from this browser
  async function forget_device() {
    const this_user = user_store.user
    if (!this_user)
      return
    await vault_delete_all(prefix(this_user.User_id))
    lock()
    await load()
  }

  function lock() {
    device.value = null
    set_api_device(null)
    status.value = 'unknown'
  }

  return {
    status,
    device,
    load,
    setup_identity,
    link_device,
    replenish_key_packages,
    load_key_package,
    delete_key_package,
    forget_device,
    lock,
  }
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useDeviceStore, import.meta.hot))
