import { acceptHMRUpdate, defineStore } from 'pinia'

export const useUtilsStore = defineStore('utils', () => {
  const encryption_store = useEncryptionStore()
  function uint8ArrayToBase64(buffer: Uint8Array): string {
    return btoa(String.fromCharCode(...buffer))
  }

  function serializedKeys(
    public_encryption_key: Uint8Array,
    secret_encryption_key: Uint8Array,
    public_signing_key: Uint8Array,
    secret_signing_key: Uint8Array,
  ) {
    return {
      encryptionPublicKey: uint8ArrayToBase64(public_encryption_key),
      encryptionSecretKey: uint8ArrayToBase64(secret_encryption_key),
      signingPublicKey: uint8ArrayToBase64(public_signing_key),
      signingSecretKey: uint8ArrayToBase64(secret_signing_key),
    }
  }

  function download_keys() {
    const JSonKeys = JSON.stringify(serializedKeys(
      encryption_store.encryption_keypair?.publicKey as Uint8Array,
      encryption_store.encryption_keypair?.secretKey as Uint8Array,
      encryption_store.signing_keypair?.publicKey as Uint8Array,
      encryption_store.signing_keypair?.secretKey as Uint8Array,
    ))
    const blob = new Blob([JSonKeys], { type: 'text/plain' })
    const blobURL = window.URL.createObjectURL(blob)
    const tempLink = document.createElement('a')
    tempLink.style.display = 'none'
    tempLink.href = blobURL
    tempLink.setAttribute('download', 'my_keys.json')

    document.body.appendChild(tempLink)
    tempLink.click()
    document.body.removeChild(tempLink)
    window.URL.revokeObjectURL(blobURL)

    return true
  }

  return {
    download_keys,
  }
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useUserStore as any, import.meta.hot))
