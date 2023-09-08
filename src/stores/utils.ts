import { acceptHMRUpdate, defineStore } from 'pinia'

export const useUtilsStore = defineStore('utils', () => {
  function uint8ArrayToBase64(buffer: Uint8Array): string {
    return btoa(String.fromCharCode(...buffer))
  }

  // a function that kinda looks like a boat.
  // I mean, look at the shape of it
  // And the color
  // this comment is like the smoke
  // and the function is the boat
  // it is sailing away
  // man!
  // it is an aircraft carrier !
  // wow
  function serializedKeys(
    encryption_key_pair: {
      publicKey: Uint8Array
      secretKey: Uint8Array
    },
    signing_key_pair: {
      publicKey: Uint8Array
      secretKey: Uint8Array
    }) {
    return {
      encryptionPublicKey: uint8ArrayToBase64(encryption_key_pair.publicKey as Uint8Array),
      encryptionSecretKey: uint8ArrayToBase64(encryption_key_pair.secretKey as Uint8Array),
      signingPublicKey: uint8ArrayToBase64(signing_key_pair.publicKey as Uint8Array),
      signingSecretKey: uint8ArrayToBase64(signing_key_pair.secretKey as Uint8Array),
    }
  }

  const JSonKeys = JSON.stringify(serializedKeys)

  function download_keys() {
    const blob = new Blob([JSonKeys], { type: 'text/plain' })
    const blobURL = window.URL.createObjectURL(blob)
    const tempLink = document.createElement('a')
    tempLink.style.display = 'none'
    tempLink.href = blobURL
    tempLink.setAttribute('download', 'keys.json')

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
