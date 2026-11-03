import { acceptHMRUpdate, defineStore } from 'pinia'
import type { IDirectoryEntry, IPublicUser } from '../types'
import { api } from '../api'
import { from_base64 } from '../crypto/encoding'
import { safety_number, verify_device_certificate } from '../crypto/identity'
import { vault_get, vault_set } from '../crypto/vault'

const DIRECTORY_MAX_AGE = 60 * 1000

interface PinnedIdentity {
  identity_public_key: string
  // The user compared the safety number with this contact
  verified: boolean
}

export interface IdentityChange {
  User_id: number
  User_name: string
  new_identity_public_key: string
}

// Identity keys of other users are pinned the first time they are seen (trust on first use).
// The server can't swap them afterwards: a different key raises an alert and is refused until
// the user accepts it, ideally after comparing the new safety number.
export const useDirectoryStore = defineStore('directory', () => {
  const user_store = useUserStore()
  const device_store = useDeviceStore()

  const pinned: Ref<Record<number, PinnedIdentity>> = ref({})
  const changes: Ref<Record<number, IdentityChange>> = ref({})
  const entries = new Map<number, { entry: IDirectoryEntry; fetched_at: number }>()

  function record_id() {
    return `u${user_store.user?.User_id}:identities`
  }

  async function load() {
    pinned.value = await vault_get<Record<number, PinnedIdentity>>(record_id()) ?? {}
    changes.value = {}
    entries.clear()
  }

  async function save() {
    await vault_set(record_id(), pinned.value)
  }

  async function fetch_entry(User_id: number, max_age = DIRECTORY_MAX_AGE): Promise<IDirectoryEntry> {
    const cached = entries.get(User_id)
    if (cached && Date.now() - cached.fetched_at < max_age)
      return cached.entry
    const { data } = await api.get(`/users/${User_id}/directory`)
    const entry = data as IDirectoryEntry
    entries.set(User_id, { entry, fetched_at: Date.now() })
    await observe([entry])
    return entry
  }

  // Compare identity keys given by the server with the pinned ones, and pin unknown ones
  async function observe(users: IPublicUser[]) {
    let pinned_new = false
    for (const observed of users) {
      if (!observed.identity_public_key || observed.User_id === user_store.user?.User_id)
        continue
      const pin = pinned.value[observed.User_id]
      if (!pin) {
        pinned.value[observed.User_id] = { identity_public_key: observed.identity_public_key, verified: false }
        pinned_new = true
      }
      else if (pin.identity_public_key !== observed.identity_public_key) {
        changes.value[observed.User_id] = {
          User_id: observed.User_id,
          User_name: observed.User_name,
          new_identity_public_key: observed.identity_public_key,
        }
      }
    }
    if (pinned_new)
      await save()
  }

  // Identity key trusted for a user, used to validate every MLS credential
  async function trusted_identity(User_id: number): Promise<Uint8Array | null> {
    const own_device = device_store.device
    if (own_device && User_id === own_device.User_id)
      return own_device.identity_public_key
    if (!pinned.value[User_id]) {
      try {
        await fetch_entry(User_id)
      }
      catch {
        return null
      }
    }
    const pin = pinned.value[User_id]
    return pin ? from_base64(pin.identity_public_key) : null
  }

  // Devices of a user certified by the trusted identity key, the others are ignored
  async function certified_devices(User_id: number) {
    const entry = await fetch_entry(User_id)
    const identity_public_key = await trusted_identity(User_id)
    if (!identity_public_key)
      return []
    return entry.devices.filter(entry_device => verify_device_certificate(
      identity_public_key,
      entry_device.User_id,
      entry_device.Device_id,
      from_base64(entry_device.signature_public_key),
      from_base64(entry_device.certificate),
    ))
  }

  function safety_number_with(User_id: number): string | null {
    const own_device = device_store.device
    const pin = pinned.value[User_id]
    if (!own_device || !pin)
      return null
    return safety_number(
      { User_id: own_device.User_id, identity_public_key: own_device.identity_public_key },
      { User_id, identity_public_key: from_base64(pin.identity_public_key) },
    )
  }

  function is_verified(User_id: number): boolean {
    return !!pinned.value[User_id]?.verified
  }

  async function mark_verified(User_id: number) {
    const pin = pinned.value[User_id]
    if (!pin)
      return
    pin.verified = true
    await save()
  }

  // Trust the new identity key of a user, who reset their phrase or the server is lying:
  // only the safety number can tell, so the contact goes back to unverified.
  async function accept_change(User_id: number) {
    const change = changes.value[User_id]
    if (!change)
      return
    pinned.value[User_id] = { identity_public_key: change.new_identity_public_key, verified: false }
    delete changes.value[User_id]
    entries.delete(User_id)
    await save()
  }

  return {
    pinned,
    changes,
    load,
    fetch_entry,
    observe,
    trusted_identity,
    certified_devices,
    safety_number_with,
    is_verified,
    mark_verified,
    accept_change,
  }
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useDirectoryStore, import.meta.hot))
