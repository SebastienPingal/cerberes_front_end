import { generateMnemonic, mnemonicToSeed, validateMnemonic } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'
import { ed25519 } from '@noble/curves/ed25519.js'
import { hkdf } from '@noble/hashes/hkdf.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { encode_fields, utf8_encode } from './encoding'

// The identity of a user is an Ed25519 key pair derived from a BIP39 phrase.
// The phrase is never stored: it is only asked to set up a new device.
// The identity key certifies each device, and is what contacts verify with safety numbers.

const IDENTITY_KDF_SALT = 'cerberes'
const IDENTITY_KDF_INFO = 'cerberes/identity/ed25519/v1'
const DEVICE_CERTIFICATE_LABEL = 'cerberes/device-certificate/v1'
const SAFETY_NUMBER_LABEL = 'cerberes/safety-number/v1'

export interface IdentityKeyPair {
  public_key: Uint8Array
  secret_key: Uint8Array
}

function normalize_phrase(phrase: string): string {
  return phrase.trim().toLowerCase().split(/\s+/).join(' ')
}

// 12 words, 128 bits of entropy from the browser's CSPRNG
export function generate_phrase(): string {
  return generateMnemonic(wordlist, 128)
}

export function is_valid_phrase(phrase: string): boolean {
  return validateMnemonic(normalize_phrase(phrase), wordlist)
}

export async function derive_identity(phrase: string): Promise<IdentityKeyPair> {
  if (!is_valid_phrase(phrase))
    throw new Error('Invalid recovery phrase')
  const seed = await mnemonicToSeed(normalize_phrase(phrase))
  // Domain separated derivation, so the BIP39 seed is never used directly as a key
  const secret_key = hkdf(sha256, seed, utf8_encode(IDENTITY_KDF_SALT), utf8_encode(IDENTITY_KDF_INFO), 32)
  seed.fill(0)
  return { secret_key, public_key: ed25519.getPublicKey(secret_key) }
}

// What the identity key signs to certify a device.
// Must stay byte for byte identical to the back-end (src/entities/devices/devices.helper.ts).
function certificate_message(User_id: number, Device_id: string, signature_public_key: Uint8Array): Uint8Array {
  return encode_fields([
    utf8_encode(DEVICE_CERTIFICATE_LABEL),
    utf8_encode(String(User_id)),
    utf8_encode(Device_id),
    signature_public_key,
  ])
}

export function sign_device_certificate(identity: IdentityKeyPair, User_id: number, Device_id: string, signature_public_key: Uint8Array): Uint8Array {
  return ed25519.sign(certificate_message(User_id, Device_id, signature_public_key), identity.secret_key)
}

export function verify_device_certificate(identity_public_key: Uint8Array, User_id: number, Device_id: string, signature_public_key: Uint8Array, certificate: Uint8Array): boolean {
  try {
    return ed25519.verify(certificate, certificate_message(User_id, Device_id, signature_public_key), identity_public_key)
  }
  catch {
    return false
  }
}

// Number two users compare out of band (in person, on a call) to make sure the server
// gave each of them the real identity key of the other. Same result on both sides.
export function safety_number(
  user_a: { User_id: number, identity_public_key: Uint8Array },
  user_b: { User_id: number, identity_public_key: Uint8Array },
): string {
  const [first, second] = [user_a, user_b].sort((a, b) => a.User_id - b.User_id)
  const digest = sha256(encode_fields([
    utf8_encode(SAFETY_NUMBER_LABEL),
    utf8_encode(String(first.User_id)),
    first.identity_public_key,
    utf8_encode(String(second.User_id)),
    second.identity_public_key,
  ]))
  // 6 groups of 5 digits, each from 5 bytes of the digest
  const groups: string[] = []
  for (let group = 0; group < 6; group++) {
    let value = 0
    for (let index = 0; index < 5; index++)
      value = (value * 256 + digest[group * 5 + index]) % 100000
    groups.push(value.toString().padStart(5, '0'))
  }
  return groups.join(' ')
}

// Short fingerprint of one identity key, to show on a profile
export function identity_fingerprint(identity_public_key: Uint8Array): string {
  const digest = sha256(identity_public_key)
  return Array.from(digest.slice(0, 10), byte => byte.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
    .match(/.{4}/g)!
    .join(' ')
}
