import { acceptHMRUpdate, defineStore } from 'pinia'

export const useIndexedDBStore = defineStore('indexedDB ', () => {
  const encryption_store = useEncryptionStore()
  const user_store = useUserStore()
  const user = computed(() => user_store.user)
  const dbName = 'KeyDatabase'
  const storeName = 'keys'
  let db: IDBDatabase | null = null

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
    const encryption_public_key_array = Object.values(user.value.encryption_public_key).map(Number)
    const encryption_public_key_uint8 = new Uint8Array(encryption_public_key_array)

    const signing_public_key_array = Object.values(user.value.signing_public_key).map(Number)
    const signing_public_key_uint8 = new Uint8Array(signing_public_key_array)

    if (!encryption_public_key_uint8.every((value, index) => value === retrievedKeys.publicEncryptionKey[index])
      || !signing_public_key_uint8.every((value, index) => value === retrievedKeys.publicSigningKey[index])) {
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
    if (!db)
      db = await setupIndexedDB()
    const User_id = user.value.User_id
    const response = new Promise<void>((resolve, reject) => {
      if (!db) {
        console.error('IndexedDB not initialized.')
        reject(new Error('IndexedDB not initialized.'))
        return
      }

      const transaction: IDBTransaction = db.transaction([storeName], 'readwrite')
      const store: IDBObjectStore = transaction.objectStore(storeName)

      store.put(encryption_store.signing_keypair?.publicKey, `${User_id}_publicSigningKey`)
      store.put(encryption_store.signing_keypair?.secretKey, `${User_id}_privateSigningKey`)
      store.put(encryption_store.encryption_keypair?.publicKey, `${User_id}_publicEncryptionKey`)
      store.put(encryption_store.encryption_keypair?.secretKey, `${User_id}_privateEncryptionKey`)

      transaction.oncomplete = () => {
        resolve()
      }
      transaction.onerror = (event) => {
        reject(event)
      }
    })
    return response
  }

  // Retrieve the key pair from IndexedDB.
  async function retrieveKeyPair(): Promise<{
    publicSigningKey: Uint8Array
    privateSigningKey: Uint8Array
    publicEncryptionKey: Uint8Array
    privateEncryptionKey: Uint8Array
  }> {
    const User_id = user.value.User_id
    if (!db)
      db = await setupIndexedDB()
    const retrieve_key_pair = await new Promise((resolve, reject) => {
      if (!db) {
        console.error('IndexedDB not initialized.')
        reject(new Error('IndexedDB not initialized.'))
        return
      }

      const transaction: IDBTransaction = db.transaction([storeName], 'readonly')
      const store: IDBObjectStore = transaction.objectStore(storeName)

      const publicSigningKeyRequest: IDBRequest = store.get(`${User_id}_publicSigningKey`)
      const privateSigningKeyRequest: IDBRequest = store.get(`${User_id}_privateSigningKey`)
      const publicEncryptionKeyRequest: IDBRequest = store.get(`${User_id}_publicEncryptionKey`)
      const privateEncryptionKeyRequest: IDBRequest = store.get(`${User_id}_privateEncryptionKey`)

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
    if (!db)
      db = await setupIndexedDB()
    const response = await new Promise((resolve, reject) => {
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

      transaction.onerror = (event) => {
        reject(event)
      }
    })
    return response
  }

  async function closeDB() {
    if (db)
      await db.close()
  }

  return {
    setupIndexedDB,
    storeKeyPair,
    retrieveKeyPair,
    retrieveAndSetKeyPairs,
    delete_indexedDB_keypair,
    closeDB,
  }
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useIndexedDBStore, import.meta.hot))
