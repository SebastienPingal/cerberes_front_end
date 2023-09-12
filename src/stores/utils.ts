import { acceptHMRUpdate, defineStore } from 'pinia'

export const useUtilsStore = defineStore('utils', () => {
  const encryption_store = useEncryptionStore()
  const indexedDB_store = useIndexedDBStore()
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

  function retrieve_keys() {
    const fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = 'application/json,text/plain'

    fileInput.addEventListener('change', async (event) => {
      const files = (event.target as HTMLInputElement).files
      if (files && files.length > 0) {
        const file = files[0]
        const reader = new FileReader()

        reader.onload = async (e) => {
          const text = (e.target as FileReader).result as string
          try {
            const json = JSON.parse(text)
            // Validate and use the keys
            if (
              json.encryptionPublicKey
              && json.encryptionSecretKey
              && json.signingPublicKey
              && json.signingSecretKey
            ) {
              // Convert base64 to Uint8Array
              const encryptionPublicKey = Uint8Array.from(
                atob(json.encryptionPublicKey),
                c => c.charCodeAt(0),
              )
              const encryptionSecretKey = Uint8Array.from(
                atob(json.encryptionSecretKey),
                c => c.charCodeAt(0),
              )
              const signingPublicKey = Uint8Array.from(
                atob(json.signingPublicKey),
                c => c.charCodeAt(0),
              )
              const signingSecretKey = Uint8Array.from(
                atob(json.signingSecretKey),
                c => c.charCodeAt(0),
              )

              encryption_store.setKeyPairs(
                signingPublicKey,
                signingSecretKey,
                encryptionPublicKey,
                encryptionSecretKey,
              )
              await indexedDB_store.storeKeyPair()
            }
            else {
              console.error('Invalid keys format')
            }
          }
          catch (err) {
            console.error('Error parsing keys JSON', err)
          }
        }

        reader.onerror = () => {
          console.error('Error reading file')
        }

        reader.readAsText(file)
      }
    })

    // Simulate a click event to open the file picker dialog
    fileInput.click()
  }

  async function delete_keypairs_from_all_stores() {
    encryption_store.delete_keypairs()
    await indexedDB_store.delete_indexedDB_keypair()
  }

  return {
    download_keys,
    retrieve_keys,
    delete_keypairs_from_all_stores,
  }
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useUserStore as any, import.meta.hot))
