import { from_base64, to_base64, utf8_decode, utf8_encode } from './encoding'

// Local encrypted storage for device keys, MLS group states and message history.
// Every record is encrypted with AES-GCM under a non-extractable WebCrypto key kept in IndexedDB:
// scripts can use the key but never read it, and nothing is written in clear text.
// It does not protect against code running in the page (XSS), only against reading the storage itself.

const DATABASE_NAME = 'cerberes'
const DATABASE_VERSION = 1
const KEY_STORE = 'vault_key'
const RECORD_STORE = 'records'
const VAULT_KEY_ID = 'aes-gcm'

let database_promise: Promise<IDBDatabase> | null = null
let vault_key_promise: Promise<CryptoKey> | null = null

function request_to_promise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function transaction_done(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}

function open_database(): Promise<IDBDatabase> {
  if (!database_promise) {
    database_promise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
      request.onupgradeneeded = () => {
        const database = request.result
        if (!database.objectStoreNames.contains(KEY_STORE))
          database.createObjectStore(KEY_STORE)
        if (!database.objectStoreNames.contains(RECORD_STORE))
          database.createObjectStore(RECORD_STORE)
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => {
        database_promise = null
        reject(request.error)
      }
    })
  }
  return database_promise
}

async function get_vault_key(): Promise<CryptoKey> {
  if (!vault_key_promise) {
    vault_key_promise = (async () => {
      const database = await open_database()
      const existing = await request_to_promise(
        database.transaction(KEY_STORE, 'readonly').objectStore(KEY_STORE).get(VAULT_KEY_ID),
      ) as CryptoKey | undefined
      if (existing)
        return existing

      const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
      const transaction = database.transaction(KEY_STORE, 'readwrite')
      transaction.objectStore(KEY_STORE).put(key, VAULT_KEY_ID)
      await transaction_done(transaction)
      return key
    })()
    vault_key_promise.catch(() => {
      vault_key_promise = null
    })
  }
  return vault_key_promise
}

// JSON with support for the binary and bigint values used by MLS states
function serialize(value: unknown): Uint8Array {
  return utf8_encode(JSON.stringify(value, (_key, item) => {
    if (item instanceof Uint8Array)
      return { $bytes: to_base64(item) }
    if (typeof item === 'bigint')
      return { $bigint: item.toString() }
    return item
  }))
}

function deserialize<T>(bytes: Uint8Array): T {
  return JSON.parse(utf8_decode(bytes), (_key, item) => {
    if (item && typeof item === 'object') {
      if (typeof item.$bytes === 'string')
        return from_base64(item.$bytes)
      if (typeof item.$bigint === 'string')
        return BigInt(item.$bigint)
    }
    return item
  }) as T
}

export async function vault_set(record_id: string, value: unknown): Promise<void> {
  const key = await get_vault_key()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  // The record id is authenticated, so a record can't be moved under another id
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: utf8_encode(record_id) },
    key,
    serialize(value),
  ))
  const database = await open_database()
  const transaction = database.transaction(RECORD_STORE, 'readwrite')
  transaction.objectStore(RECORD_STORE).put({ iv, ciphertext }, record_id)
  await transaction_done(transaction)
}

export async function vault_get<T>(record_id: string): Promise<T | undefined> {
  const database = await open_database()
  const record = await request_to_promise(
    database.transaction(RECORD_STORE, 'readonly').objectStore(RECORD_STORE).get(record_id),
  ) as { iv: Uint8Array; ciphertext: Uint8Array } | undefined
  if (!record)
    return undefined

  const key = await get_vault_key()
  const plaintext = new Uint8Array(await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: record.iv, additionalData: utf8_encode(record_id) },
    key,
    record.ciphertext,
  ))
  return deserialize<T>(plaintext)
}

export async function vault_delete(record_id: string): Promise<void> {
  const database = await open_database()
  const transaction = database.transaction(RECORD_STORE, 'readwrite')
  transaction.objectStore(RECORD_STORE).delete(record_id)
  await transaction_done(transaction)
}

export async function vault_list(prefix: string): Promise<string[]> {
  const database = await open_database()
  const range = IDBKeyRange.bound(prefix, `${prefix}￿`)
  const keys = await request_to_promise(
    database.transaction(RECORD_STORE, 'readonly').objectStore(RECORD_STORE).getAllKeys(range),
  )
  return keys.map(String)
}

// Delete every record starting with prefix, e.g. everything of one user on this browser
export async function vault_delete_all(prefix: string): Promise<void> {
  const database = await open_database()
  const transaction = database.transaction(RECORD_STORE, 'readwrite')
  transaction.objectStore(RECORD_STORE).delete(IDBKeyRange.bound(prefix, `${prefix}￿`))
  await transaction_done(transaction)
}
