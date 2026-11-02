import {
  type CiphersuiteImpl,
  type ClientConfig,
  type ClientState,
  type Credential,
  type KeyPackage,
  type PrivateKeyPackage,
  type PrivateMessage,
  type Proposal,
  acceptAll,
  createApplicationMessage,
  createCommit,
  createGroup,
  decodeGroupState,
  decodeMlsMessage,
  defaultCapabilities,
  defaultKeyPackageEqualityConfig,
  defaultKeyRetentionConfig,
  defaultLifetime,
  defaultLifetimeConfig,
  defaultPaddingConfig,
  emptyPskIndex,
  encodeGroupState,
  encodeMlsMessage,
  generateKeyPackageWithKey,
  getCiphersuiteFromName,
  getCiphersuiteImpl,
  joinGroup,
  processPrivateMessage,
  zeroOutUint8Array,
} from 'ts-mls'
// Not part of the public API of ts-mls 1.x, see decrypt_application_message
import { unprotectPrivateMessage } from 'ts-mls/messageProtection.js'
import { from_base64, random_id, to_base64, utf8_decode, utf8_encode } from './encoding'
import { verify_device_certificate } from './identity'

// Every MLS operation of the app goes through this module, so the MLS engine can be swapped
// without touching the rest of the code.

// Mandatory to implement ciphersuite of RFC 9420
const CIPHERSUITE = 'MLS_128_DHKEMX25519_AES128GCM_SHA256_Ed25519'

let cipher_suite_promise: Promise<CiphersuiteImpl> | null = null

export function get_cipher_suite(): Promise<CiphersuiteImpl> {
  if (!cipher_suite_promise)
    cipher_suite_promise = getCiphersuiteImpl(getCiphersuiteFromName(CIPHERSUITE))
  return cipher_suite_promise
}

// ___________________________________
// Credentials: a device presents its certificate, signed by its owner's identity key

export interface DeviceCredential {
  User_id: number
  Device_id: string
  certificate: Uint8Array
}

export interface DeviceKeys extends DeviceCredential {
  signature_public_key: Uint8Array
  signature_private_key: Uint8Array
}

export function make_credential(device: DeviceCredential): Credential {
  return {
    credentialType: 'basic',
    identity: utf8_encode(JSON.stringify({
      v: 1,
      User_id: device.User_id,
      Device_id: device.Device_id,
      certificate: to_base64(device.certificate),
    })),
  }
}

export function parse_credential(credential: Credential): DeviceCredential | null {
  if (credential.credentialType !== 'basic')
    return null
  try {
    const parsed = JSON.parse(utf8_decode(credential.identity))
    if (parsed.v !== 1 || !Number.isInteger(parsed.User_id) || typeof parsed.Device_id !== 'string' || typeof parsed.certificate !== 'string')
      return null
    return { User_id: parsed.User_id, Device_id: parsed.Device_id, certificate: from_base64(parsed.certificate) }
  }
  catch {
    return null
  }
}

// Gives the identity key a user is trusted to have, or null when it is unknown or changed
export type IdentityResolver = (User_id: number) => Promise<Uint8Array | null>

// The authentication service ties every MLS leaf to a real user: its signature key must be
// certified by the identity key we trust for the user it claims to be.
export function make_client_config(resolve_identity: IdentityResolver): ClientConfig {
  return {
    keyRetentionConfig: defaultKeyRetentionConfig,
    lifetimeConfig: defaultLifetimeConfig,
    keyPackageEqualityConfig: defaultKeyPackageEqualityConfig,
    paddingConfig: defaultPaddingConfig,
    authService: {
      async validateCredential(credential: Credential, signature_public_key: Uint8Array) {
        const device = parse_credential(credential)
        if (!device)
          return false
        const identity_public_key = await resolve_identity(device.User_id)
        if (!identity_public_key)
          return false
        return verify_device_certificate(identity_public_key, device.User_id, device.Device_id, signature_public_key, device.certificate)
      },
    },
  }
}

export async function generate_signature_key_pair(): Promise<{ publicKey: Uint8Array, signKey: Uint8Array }> {
  const cipher_suite = await get_cipher_suite()
  return cipher_suite.signature.keygen()
}

// Erase key material that MLS says must not be kept, once the new state is safely stored
export function wipe(consumed: Uint8Array[]) {
  consumed.forEach(zeroOutUint8Array)
}

// ___________________________________
// Key packages: published so that other devices can add this one to their groups

export interface LocalKeyPackage {
  KeyPackage_ref: string
  public_package: KeyPackage
  private_package: PrivateKeyPackage
}

export async function generate_key_package(device: DeviceKeys): Promise<LocalKeyPackage> {
  const cipher_suite = await get_cipher_suite()
  const { publicPackage, privatePackage } = await generateKeyPackageWithKey(
    make_credential(device),
    defaultCapabilities(),
    defaultLifetime,
    [],
    { signKey: device.signature_private_key, publicKey: device.signature_public_key },
    cipher_suite,
  )
  return { KeyPackage_ref: random_id(), public_package: publicPackage, private_package: privatePackage }
}

export function encode_key_package(key_package: KeyPackage): Uint8Array {
  return encodeMlsMessage({ version: 'mls10', wireformat: 'mls_key_package', keyPackage: key_package })
}

export function decode_key_package(bytes: Uint8Array): KeyPackage {
  const decoded = decodeMlsMessage(bytes, 0)?.[0]
  if (!decoded || decoded.wireformat !== 'mls_key_package')
    throw new Error('Expected a key package')
  return decoded.keyPackage
}

export function key_package_owner(key_package: KeyPackage): DeviceCredential | null {
  return parse_credential(key_package.leafNode.credential)
}

// ___________________________________
// Groups

export function encode_state(state: ClientState): Uint8Array {
  return encodeGroupState(state)
}

export function decode_state(bytes: Uint8Array, config: ClientConfig): ClientState {
  const decoded = decodeGroupState(bytes, 0)
  if (!decoded)
    throw new Error('Corrupted group state')
  return { ...decoded[0], clientConfig: config }
}

export function epoch_of(state: ClientState): number {
  return Number(state.groupContext.epoch)
}

export function is_active(state: ClientState): boolean {
  return state.groupActiveState.kind === 'active'
}

export interface GroupMember extends DeviceCredential {
  leaf_index: number
}

// Devices currently in the group, read from the leaves of the ratchet tree
export function list_members(state: ClientState): GroupMember[] {
  return state.ratchetTree.flatMap((node, node_index) => {
    if (node_index % 2 !== 0 || !node || node.nodeType !== 'leaf')
      return []
    const device = parse_credential(node.leaf.credential)
    return device ? [{ ...device, leaf_index: node_index / 2 }] : []
  })
}

export function own_leaf_index(state: ClientState): number {
  return state.privatePath.leafIndex
}

// The conversation id of the server is used as the MLS group id
export async function create_group(Conversation_id: string, own_key_package: LocalKeyPackage, config: ClientConfig): Promise<ClientState> {
  const cipher_suite = await get_cipher_suite()
  return createGroup(utf8_encode(Conversation_id), own_key_package.public_package, own_key_package.private_package, [], cipher_suite, config)
}

export interface CommitOutput {
  new_state: ClientState
  commit: Uint8Array
  welcome?: Uint8Array
  consumed: Uint8Array[]
}

// Add and remove devices. The welcome embeds the ratchet tree, so new devices need nothing else to join.
export async function create_membership_commit(state: ClientState, added: KeyPackage[], removed_leaf_indexes: number[]): Promise<CommitOutput> {
  const cipher_suite = await get_cipher_suite()
  const proposals: Proposal[] = [
    ...added.map((keyPackage): Proposal => ({ proposalType: 'add', add: { keyPackage } })),
    ...removed_leaf_indexes.map((removed): Proposal => ({ proposalType: 'remove', remove: { removed } })),
  ]
  const result = await createCommit({ state, cipherSuite: cipher_suite }, { extraProposals: proposals, ratchetTreeExtension: true })
  return {
    new_state: result.newState,
    commit: encodeMlsMessage(result.commit),
    welcome: result.welcome
      ? encodeMlsMessage({ version: 'mls10', wireformat: 'mls_welcome', welcome: result.welcome })
      : undefined,
    consumed: result.consumed,
  }
}

export async function join_from_welcome(welcome_bytes: Uint8Array, own_key_package: LocalKeyPackage, config: ClientConfig): Promise<ClientState> {
  const decoded = decodeMlsMessage(welcome_bytes, 0)?.[0]
  if (!decoded || decoded.wireformat !== 'mls_welcome')
    throw new Error('Expected a welcome message')
  const cipher_suite = await get_cipher_suite()
  return joinGroup(decoded.welcome, own_key_package.public_package, own_key_package.private_package, emptyPskIndex, cipher_suite, undefined, undefined, config)
}

// ___________________________________
// Messages

export async function encrypt_application_message(state: ClientState, plaintext: Uint8Array) {
  const cipher_suite = await get_cipher_suite()
  const result = await createApplicationMessage(state, plaintext, cipher_suite)
  return {
    new_state: result.newState,
    message: encodeMlsMessage({ version: 'mls10', wireformat: 'mls_private_message', privateMessage: result.privateMessage }),
    consumed: result.consumed,
  }
}

export type IncomingResult =
  | { kind: 'state', new_state: ClientState, consumed: Uint8Array[] }
  | { kind: 'application', new_state: ClientState, plaintext: Uint8Array, sender: DeviceCredential, consumed: Uint8Array[] }

export async function process_incoming_message(state: ClientState, bytes: Uint8Array): Promise<IncomingResult> {
  const decoded = decodeMlsMessage(bytes, 0)?.[0]
  if (!decoded || decoded.wireformat !== 'mls_private_message')
    throw new Error('Expected a private message')
  const private_message = decoded.privateMessage
  if (private_message.contentType === 'application')
    return decrypt_application_message(state, private_message)

  const cipher_suite = await get_cipher_suite()
  const result = await processPrivateMessage(state, private_message, emptyPskIndex, cipher_suite, acceptAll)
  return { kind: 'state', new_state: result.newState, consumed: result.consumed }
}

// Same as the application message branch of processPrivateMessage in ts-mls 1.6.4, which does not
// return who sent the message. We need the sender authenticated by MLS, not the one the server claims.
// ts-mls 2 returns senderLeafIndex: this function can go away when upgrading.
async function decrypt_application_message(state: ClientState, private_message: PrivateMessage): Promise<IncomingResult> {
  const cipher_suite = await get_cipher_suite()
  const current_epoch = state.groupContext.epoch
  if (private_message.epoch > current_epoch)
    throw new Error('Message from a future epoch')

  const historical = private_message.epoch < current_epoch
    ? state.historicalReceiverData.get(private_message.epoch)
    : undefined
  if (private_message.epoch < current_epoch && !historical)
    throw new Error('Message from an epoch whose keys are no longer kept')

  const receiver = historical ?? {
    senderDataSecret: state.keySchedule.senderDataSecret,
    secretTree: state.secretTree,
    ratchetTree: state.ratchetTree,
    groupContext: state.groupContext,
  }
  const result = await unprotectPrivateMessage(
    receiver.senderDataSecret,
    private_message,
    receiver.secretTree,
    receiver.ratchetTree,
    receiver.groupContext,
    state.clientConfig.keyRetentionConfig,
    cipher_suite,
  )

  const content = result.content.content
  if (content.contentType !== 'application')
    throw new Error('Expected an application message')
  if (content.sender.senderType !== 'member')
    throw new Error('Application messages must come from a member')
  const sender_node = receiver.ratchetTree[content.sender.leafIndex * 2]
  const sender = sender_node?.nodeType === 'leaf' ? parse_credential(sender_node.leaf.credential) : null
  if (!sender)
    throw new Error('Unknown sender')

  const new_state: ClientState = historical
    ? { ...state, historicalReceiverData: new Map(state.historicalReceiverData).set(private_message.epoch, { ...historical, secretTree: result.tree }) }
    : { ...state, secretTree: result.tree }

  return { kind: 'application', new_state, plaintext: content.applicationData, sender, consumed: result.consumed }
}
