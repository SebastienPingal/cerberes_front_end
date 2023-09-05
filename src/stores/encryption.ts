import { acceptHMRUpdate, defineStore } from 'pinia'
import nacl from 'tweetnacl'

export const useEncryptionStore = defineStore('encryption', () => {
  const keypair: Ref<nacl.SignKeyPair | null> = ref(null)

  function setKeypair(new_keypair: nacl.SignKeyPair) {
    keypair.value = new_keypair
  }

  /**
 * Convert a mnemonic phrase into a deterministic seed using PBKDF2.
 * @param mnemonic - The input mnemonic phrase.
 * @param salt - A salt for the PBKDF2 derivation (should remain constant for consistent results).
 * @return A deterministic seed.
 */
  async function mnemonicToSeed(mnemonic: string, salt: string = 'Cerberes protège mes secrets les plus sombres'): Promise<Uint8Array> {
    const encoder = new TextEncoder()
    const mnemonicBytes = encoder.encode(mnemonic)
    const saltBytes = encoder.encode(salt)

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      mnemonicBytes,
      { name: 'PBKDF2' },
      false,
      ['deriveBits'],
    )

    const seed = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBytes,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      256, // 32 bytes (256 bits) for Ed25519 seed
    )

    return new Uint8Array(seed)
  }

  /**
 * Convert a seed into an EdDSA key pair.
 * @param seed - The input seed.
 * @return EdDSA key pair with publicKey and secretKey properties.
 */
  function seedToEdDSAKeyPair(seed: Uint8Array): nacl.SignKeyPair {
    return nacl.sign.keyPair.fromSeed(seed)
  }

  /**
 * Convert a mnemonic phrase into a deterministic EdDSA key pair.
 * @param mnemonic - The input mnemonic phrase.
 * @return EdDSA key pair with publicKey and secretKey properties.
 */
  async function mnemonicToKeyPair(mnemonic: string) {
    const seed = await mnemonicToSeed(mnemonic)
    keypair.value = seedToEdDSAKeyPair(seed)
  }

  /**
 * Encrypts a given message for a recipient using the sender's secret key and the recipient's public key.
 *
 * @param message - The plaintext message to be encrypted.
 * @param senderSecretKey - The sender's secret key.
 * @param recipientPublicKey - The recipient's public key.
 * @returns An object containing the nonce and the encrypted message.
 */
  function encryptMessage(
    message: string,
    recipientPublicKey: Uint8Array,
  ): { nonce: Uint8Array; encryptedMessage: Uint8Array } {
    const nonce = nacl.randomBytes(nacl.box.nonceLength) // Generate a nonce.
    const encryptedMessage = nacl.box(
      new TextEncoder().encode(message),
      nonce,
      recipientPublicKey,
      keypair.value?.secretKey as Uint8Array,
    )
    return { nonce, encryptedMessage }
  }

  /**
 * Decrypts a given encrypted message using the recipient's secret key and the sender's public key.
 *
 * @param encryptedData - An object containing the nonce and the encrypted message.
 * @param recipientSecretKey - The recipient's secret key.
 * @param senderPublicKey - The sender's public key.
 * @returns The decrypted message.
 */
  function decryptMessage(
    encryptedData: { nonce: Uint8Array; encryptedMessage: Uint8Array },
    recipientSecretKey: Uint8Array,
    senderPublicKey: Uint8Array,
  ): string {
    const decryptedMessage = nacl.box.open(
      encryptedData.encryptedMessage,
      encryptedData.nonce,
      senderPublicKey,
      recipientSecretKey,
    )

    if (!decryptedMessage)
      throw new Error('Could not decrypt message')

    return new TextDecoder().decode(decryptedMessage)
  }

  /**
 * Signs a given message using the sender's secret key.
 *
 * @param message - The message to be signed.
 * @param senderSecretKey - The sender's secret key.
 * @returns The signed message.
 */
  function signMessage(message: string, senderSecretKey: Uint8Array): Uint8Array {
    return nacl.sign(new TextEncoder().encode(message), senderSecretKey)
  }

  /**
 * Verifies a given signed message using the sender's public key.
 *
 * @param signedMessage - The signed message.
 * @param senderPublicKey - The sender's public key.
 * @returns The original message if the verification is successful.
 */
  function verifySignedMessage(signedMessage: Uint8Array, senderPublicKey: Uint8Array): string {
    const message = nacl.sign.open(signedMessage, senderPublicKey)
    if (!message)
      throw new Error('Signature verification failed')

    return new TextDecoder().decode(message)
  }

  return {
    mnemonicToKeyPair,
    encryptMessage,
    decryptMessage,
    signMessage,
    verifySignedMessage,
    keypair,
    setKeypair,
  }
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useEncryptionStore, import.meta.hot))
