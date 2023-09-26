import { acceptHMRUpdate, defineStore } from 'pinia'

export const useIndexedDBStore = defineStore('indexedDB ', () => {
  const encryption_store = useEncryptionStore()
  const user_store = useUserStore()
  const user = computed(() => user_store.user)
  const dbName = 'KeyDatabase'
  const storeName = 'keys'
  let db: IDBDatabase | null = null

  // TODO : debug the error in the console when delting then importing key et vice versa

  async function retrieveAndSetKeyPairs() { // TODO: mode this to utils store
    const retrievedKeys = await retrieveKeyPair()
    if (!retrievedKeys) {
      console.error('No keys found in IndexedDB.')
      return
    }
    if (!user.value.encryption_public_key || !user.value.signing_public_key) {
      console.error('No keys found in user.')
      return
    }

    const strigified_encryption_public_key = JSON.stringify(retrievedKeys.publicEncryptionKey)
    const stringified_signing_public_key = JSON.stringify(retrievedKeys.publicSigningKey)
    if (user.value.encryption_public_key !== strigified_encryption_public_key
      || user.value.signing_public_key !== stringified_signing_public_key) {
      console.error('Stored keys doesn\'t match the user\'s keys.')
      return
    }
    encryption_store.setKeyPairs(
      retrievedKeys.publicSigningKey,
      retrievedKeys.privateSigningKey,
      retrievedKeys.publicEncryptionKey,
      retrievedKeys.privateEncryptionKey,
    )
  }

  // Initialize the database and the object store for storing keys.
  async function setupIndexedDB(): Promise<IDBDatabase> {
    if (db)
      return db // Return the existing db if already initialized

    return new Promise((resolve, reject) => {
      const request: IDBOpenDBRequest = indexedDB.open(dbName, 1)

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(storeName))
          db.createObjectStore(storeName)
      }

      request.onsuccess = (event: Event) => {
        db = (event.target as IDBOpenDBRequest).result // Assign the db here
        resolve(db)
      }

      request.onerror = () => {
        reject(new Error('Error opening IndexedDB.'))
      }
    })
  }

  // Store the key pair generated by nacl in IndexedDB.
  async function storeKeyPair() {
    db = await setupIndexedDB()
    return new Promise<void>((resolve, reject) => {
      if (!db) {
        console.error('IndexedDB not initialized.')
        reject(new Error('IndexedDB not initialized.'))
        return
      }

      const transaction: IDBTransaction = db.transaction([storeName], 'readwrite')
      const store: IDBObjectStore = transaction.objectStore(storeName)

      store.put(encryption_store.signing_keypair?.publicKey, 'publicSigningKey')
      store.put(encryption_store.signing_keypair?.secretKey, 'privateSigningKey')
      store.put(encryption_store.encryption_keypair?.publicKey, 'publicEncryptionKey')
      store.put(encryption_store.encryption_keypair?.secretKey, 'privateEncryptionKey')

      transaction.oncomplete = (
      ) => resolve(
        closeDB(),
      )
      transaction.onerror = (event) => {
        reject(event)
        closeDB()
      }
    })
  }

  // Retrieve the key pair from IndexedDB.
  async function retrieveKeyPair(): Promise<{
    publicSigningKey: Uint8Array
    privateSigningKey: Uint8Array
    publicEncryptionKey: Uint8Array
    privateEncryptionKey: Uint8Array
  }> {
    db = await setupIndexedDB()
    const retrieve_key_pair = await new Promise((resolve, reject) => {
      if (!db) {
        console.error('IndexedDB not initialized.')
        reject(new Error('IndexedDB not initialized.'))
        return
      }

      const transaction: IDBTransaction = db.transaction([storeName], 'readonly')
      const store: IDBObjectStore = transaction.objectStore(storeName)

      const publicSigningKeyRequest: IDBRequest = store.get('publicSigningKey')
      const privateSigningKeyRequest: IDBRequest = store.get('privateSigningKey')
      const publicEncryptionKeyRequest: IDBRequest = store.get('publicEncryptionKey')
      const privateEncryptionKeyRequest: IDBRequest = store.get('privateEncryptionKey')

      publicSigningKeyRequest.onerror = privateSigningKeyRequest.onerror = event => reject(event)
      publicEncryptionKeyRequest.onerror = privateEncryptionKeyRequest.onerror = event => reject(event)

      publicSigningKeyRequest.onsuccess = () => {
        privateSigningKeyRequest.onsuccess = () => {
          publicEncryptionKeyRequest.onsuccess = () => {
            privateEncryptionKeyRequest.onsuccess = () => {
              resolve({
                publicSigningKey: publicSigningKeyRequest.result as Uint8Array,
                privateSigningKey: privateSigningKeyRequest.result as Uint8Array,
                publicEncryptionKey: publicEncryptionKeyRequest.result as Uint8Array,
                privateEncryptionKey: privateEncryptionKeyRequest.result as Uint8Array,
                closeDB,
              })
            }
          }
        }
      }
    })

    return retrieve_key_pair as Promise<{
      publicSigningKey: Uint8Array
      privateSigningKey: Uint8Array
      publicEncryptionKey: Uint8Array
      privateEncryptionKey: Uint8Array
    }>
  }

  async function delete_indexedDB_keypair() {
    db = await setupIndexedDB()
    return new Promise((resolve, reject) => {
      if (!db) {
        console.error('IndexedDB not initialized.')
        reject(new Error('IndexedDB not initialized.'))
        return
      }

      const transaction: IDBTransaction = db.transaction([storeName], 'readwrite')
      const store: IDBObjectStore = transaction.objectStore(storeName)

      store.delete('publicSigningKey')
      store.delete('privateSigningKey')
      store.delete('publicEncryptionKey')
      store.delete('privateEncryptionKey')

      transaction.oncomplete = (
      ) => resolve(
        closeDB(),
      )
      transaction.onerror = (event) => {
        closeDB()
        reject(event)
      }
    })
  }

  function closeDB() {
    if (db)
      db.close()
  }

  return {
    setupIndexedDB,
    storeKeyPair,
    retrieveKeyPair,
    retrieveAndSetKeyPairs,
    delete_indexedDB_keypair,
  }
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useUtilsStore, import.meta.hot))
