import { acceptHMRUpdate, defineStore } from 'pinia'
import nacl from 'tweetnacl'

export const useEncryptionStore = defineStore('encryption', () => {
  const signing_keypair: Ref<nacl.SignKeyPair | null> = ref(null)
  const encryption_keypair: Ref<nacl.BoxKeyPair | null> = ref(null)

  function generateSigningKeyPair() {
    return nacl.sign.keyPair()
  }

  function generateEncryptionKeyPair() {
    return nacl.box.keyPair()
  }

  /**
    * Set both the signing and encryption key pairs.
    * @param signing_keypair_public - The signing key pair's public key.
    * @param signing_keypair_secret - The signing key pair's secret key.
    * @param encryption_keypair_public - The encryption key pair's public key.
    * @param encryption_keypair_secret - The encryption key pair's secret key.
    * @return void
  * */
  function setKeyPairs(
    signing_keypair_public: Uint8Array,
    signing_keypair_secret: Uint8Array,
    encryption_keypair_public: Uint8Array,
    encryption_keypair_secret: Uint8Array,
  ) {
    signing_keypair.value = {
      publicKey: signing_keypair_public,
      secretKey: signing_keypair_secret,
    }
    encryption_keypair.value = {
      publicKey: encryption_keypair_public,
      secretKey: encryption_keypair_secret,
    }
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
    * Convert a seed into an ECDH key pair.
    *
    * @param seed - The input seed.
    * @returns ECDH key pair with publicKey and secretKey properties.
    */
  function seedToECDHKeyPair(seed: Uint8Array): nacl.BoxKeyPair {
    return nacl.box.keyPair.fromSecretKey(seed.slice(0, 32))
  }

  /**
    * Convert a mnemonic phrase into a deterministic EdDSA key pair.
    * @param mnemonic - The input mnemonic phrase.
    * @return EdDSA key pair with publicKey and secretKey properties.
    */
  async function mnemonicToKeyPair(mnemonic: string) {
    const seed = await mnemonicToSeed(mnemonic)
    signing_keypair.value = seedToEdDSAKeyPair(seed)
    encryption_keypair.value = seedToECDHKeyPair(seed)
  }

  /**
    * Encrypts a given message for a recipient using the sender's secret key and the recipient's public key.
    *
    * @param message - The plaintext message to be encrypted.
    * @param senderEncryptionSecretKey - The sender's Encryptions ecret key.
    * @param recipientEncryptionPublicKey - The recipient's Encryption public key.
    * @returns An object containing the nonce and the encrypted message.
    */
  function encryptMessage(
    message: string,
    recipientPublicEncryptionKey: Uint8Array,
    senderSecretEncryptionKey: Uint8Array,
  ): { nonce: Uint8Array; encryptedMessage: Uint8Array } {
    const nonce = nacl.randomBytes(nacl.box.nonceLength) // Generate a nonce.

    const encryptedMessage = nacl.box(
      new TextEncoder().encode(message),
      nonce,
      recipientPublicEncryptionKey,
      senderSecretEncryptionKey,
    )
    return { nonce, encryptedMessage }
  }

  /**
    * Encrypt a signed message for a recipient using the sender's secret key and the recipient's public key.
    *
    * @param signedMessage - The signed message to be encrypted.
    * @param recipientEncryptionPublicKey - The recipient's public encryption key.
    * @param senderEncryptionSecretKey - The sender's secret encryption key.
    * @returns An object containing the nonce and the encrypted message.
    *
    **/
  function encryptSignedMessage(
    signedMessage: Uint8Array,
    recipientPublicEncryptionKey: Uint8Array,
    senderSecretEncryptionKey: Uint8Array,
  ): { nonce: Uint8Array; encryptedMessage: Uint8Array } {
    const nonce = nacl.randomBytes(nacl.box.nonceLength) // Generate a nonce.

    const encryptedMessage = nacl.box(
      signedMessage,
      nonce,
      recipientPublicEncryptionKey,
      senderSecretEncryptionKey,
    )
    return { nonce, encryptedMessage }
  }

  /**
    * Sign a given message and encrypts it
    *
    * @param message - The plaintext message to be encrypted.
    * @param senderSecretSigningKey - The sender's secret signing key.
    * @param senderSecretEncryptionKey - The sender's secret encryption key.
    * @param recipientPublicEncryptionKey - The recipient's public encryption key.
    * @returns An object containing the nonce and the encrypted message.
    **/
  function signAndEncryptMessage(
    message: string,
    recipientPublicEncryptionKey: Uint8Array,
    senderSecretEncryptionKey: Uint8Array,
    senderSecretSigningKey: Uint8Array,
  ): { nonce: Uint8Array; encryptedMessage: Uint8Array } {
    const signedMessage = signMessage(
      message,
      senderSecretSigningKey,
    )

    const { nonce, encryptedMessage } = encryptSignedMessage(
      signedMessage,
      recipientPublicEncryptionKey,
      senderSecretEncryptionKey,
    )

    return { nonce, encryptedMessage }
  }

  /**
    * Decrypts a given encrypted message using the recipient's secret key and the sender's public key.
    *
    * @param encryptedData - An object containing the nonce and the encrypted message.
    * @param senderPublicEncryptionKey - The sender's public encryption key.
    * @param recipientSecretEncryptionKey - The recipient's secret key.
    * @returns The decrypted message.
    *
    */
  function decryptMessage(
    encryptedData: { nonce: Uint8Array; encryptedMessage: Uint8Array },
    senderPublicEncryptionKey: Uint8Array,
    recipientSecretEncryptionKey: Uint8Array,
  ): string {
    const decryptedMessage = nacl.box.open(
      encryptedData.encryptedMessage,
      encryptedData.nonce,
      senderPublicEncryptionKey,
      recipientSecretEncryptionKey,
    )

    if (!decryptedMessage)
      throw new Error('Could not decrypt message')

    return new TextDecoder().decode(decryptedMessage)
  }

  /**
    * Decypt a signed message using the recipient's secret key and the sender's public key.
    *
    * @param encryptedData - An object containing the nonce and the encrypted message.
    * @param senderPublicEncryptionKey - The sender's public encryption key.
    * @param recipientSecretEncryptionKey - The recipient's secret encryption key.
    * @returns The decrypted message.
    *
    **/
  function decryptSignedMessage(
    encryptedData: { nonce: Uint8Array; encryptedMessage: Uint8Array },
    senderPublicEncryptionKey: Uint8Array,
    recipientSecretEncryptionKey: Uint8Array,
  ): Uint8Array {
    const decryptedMessage = nacl.box.open(
      encryptedData.encryptedMessage,
      encryptedData.nonce,
      senderPublicEncryptionKey,
      recipientSecretEncryptionKey,
    )

    if (!decryptedMessage)
      throw new Error('Could not decrypt message')

    return decryptedMessage
  }

  /**
    * Decrypt and verify a given encrypted message using the recipient's secret key and the sender's public key.
    *
    * @param encryptedData - An object containing the nonce and the encrypted message.
    * @param senderPublicSigningKey - The sender's public signing key.
    * @param senderPublicEncryptionKey - The sender's public encryption key.
    * @param recipientSecretEncryptionKey - The recipient's secret encryption key.
    * @returns The decrypted message.
    *
    **/
  function decryptAndVerifyMessage(
    encryptedData: { nonce: Uint8Array; encryptedMessage: Uint8Array },
    senderPublicSigningKey: Uint8Array,
    senderPublicEncryptionKey: Uint8Array,
    recipientSecretEncryptionKey: Uint8Array,
  ): string {
    const decryptedMessage = decryptSignedMessage(
      encryptedData,
      senderPublicEncryptionKey,
      recipientSecretEncryptionKey,
    )

    if (!decryptedMessage)
      throw new Error('Could not decrypt message')

    const verifiedMessage = verifySignedMessage(
      decryptedMessage,
      senderPublicSigningKey,
    )

    if (!verifiedMessage)
      throw new Error('signed messade don\'t match')

    return verifiedMessage
  }

  /**
 * Signs a given message using the sender's secret key.
 *
 * @param message - The message to be signed.
 * @param senderSecretKey - The sender's secret key.
 * @returns The signed message.
 */
  function signMessage(message: string, senderSecretSigningKey: Uint8Array): Uint8Array {
    return nacl.sign(new TextEncoder().encode(message), senderSecretSigningKey)
  }

  /**
 * Verifies a given signed message using the sender's public key.
 *
 * @param signedMessage - The signed message.
 * @param senderPublicKey - The sender's public key.
 * @returns The original message if the verification is successful.
 */
  function verifySignedMessage(signedMessage: Uint8Array, senderPublicSigningKey: Uint8Array): string {
    const message = nacl.sign.open(signedMessage, senderPublicSigningKey)
    if (!message)
      throw new Error('Signature verification failed')

    return new TextDecoder().decode(message)
  }

  function delete_keypairs() {
    signing_keypair.value = null
    encryption_keypair.value = null
  }

  return {
    setKeyPairs,
    mnemonicToKeyPair,
    encryptMessage,
    signAndEncryptMessage,
    decryptAndVerifyMessage,
    decryptMessage,
    signMessage,
    verifySignedMessage,
    signing_keypair,
    encryption_keypair,
    generateSigningKeyPair,
    generateEncryptionKeyPair,
    delete_keypairs,
  }
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useEncryptionStore, import.meta.hot))
