import { acceptHMRUpdate, defineStore } from 'pinia'
import axios from 'axios'
import type { IContact, IConversation, IUser } from '../types'

const api_url = import.meta.env.VITE_API_URL

// Create axios instance with default config
const api = axios.create({
  baseURL: api_url,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  // Ensure cookies are handled properly in production
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
})

// Add request interceptor to ensure credentials are sent
api.interceptors.request.use((config) => {
  // eslint-disable-next-line no-console
  console.log('🌐 Making request:', config.method?.toUpperCase(), config.url)
  config.withCredentials = true
  return config
})

export const useUserStore = defineStore('user', () => {
  const encryption_store = useEncryptionStore()
  const conversation_store = useConversationStore()
  const indexedDB_store = useIndexedDBStore()

  // Add debug logging for storage initialization
  const storedUser = useStorage('curent_user', <IUser | null>null, undefined, {
    serializer: {
      read: (v: any) => {
        // eslint-disable-next-line no-console
        console.log('📖 Reading from storage:', v)
        return v ? JSON.parse(v) : null
      },
      write: (v: any) => {
        // eslint-disable-next-line no-console
        console.log('📝 Writing to storage:', v)
        return JSON.stringify(v)
      },
    },
  })

  const user = ref(storedUser)

  // Add watcher to debug user changes
  watch(user, (newValue) => {
    // eslint-disable-next-line no-console
    console.log('👤 User state changed:', newValue)
  }, { immediate: true })

  async function register(User_name: string, User_email: string, User_password: string) {
    try {
      const response = await api.post('/auth/register', {
        User_name,
        User_email,
        User_password,
      })
      user.value = response.data as IUser
    }
    catch (error) {
      if (axios.isAxiosError(error))
        throw new Error(error.response?.data)
      else
        console.error(error)
    }
  }

  async function login(User_email: string, User_password: string) {
    try {
      const response = await api.post('/auth/login', {
        User_email,
        User_password,
      })
      user.value = response.data as IUser
      await indexedDB_store.retrieveAndSetKeyPairs()
      conversation_store.get_all_new_messages()
    }
    catch (error) {
      if (axios.isAxiosError(error))
        throw new Error(error.response?.data)
      else
        console.error(error)
    }
  }

  async function get_user() {
    try {
      const response = await api.get('/users/me')
      user.value = response.data as IUser
      conversation_store.conversations.forEach((conversation: IConversation) => {
        conversation.Users?.forEach((that_user: IUser) => {
          const contact = user.value.contact_list?.find((contact: IContact) => contact.Contact_id === that_user.User_id) ?? user.value.demands?.find((contact: IContact) => contact.User_id === that_user.User_id)
          that_user.encryption_public_key = contact.User?.encryption_public_key ?? contact.AddedBy?.encryption_public_key
          that_user.signing_public_key = contact.User?.signing_public_key ?? contact.AddedBy?.signing_public_key
        })
      })
      await conversation_store.get_all_new_messages()
    }
    catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          console.error('🔑 Authentication failed:', error.response?.data)
          logout()
        }
        else {
          throw new Error(error.response?.data)
        }
      }
      else {
        console.error('🔑 Error fetching user:', error)
        throw error
      }
    }
  }

  async function update_public_keys() {
    try {
      const response = await api.patch('/users/public_keys', {
        encryption_public_key: encryption_store.encryption_keypair?.publicKey,
        signing_public_key: encryption_store.signing_keypair?.publicKey,
      })
      user.value = response.data as IUser
    }
    catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401)
          logout()
        else
          throw new Error(error.response?.data)
      }
      else { console.error(error) }
    }
  }

  async function add_contact(contact_uuid: string) {
    try {
      await api.post(`/contacts?uuid=${contact_uuid}`)
      await get_user()
    }
    catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401)
          logout()
        else
          throw new Error(error.response?.data)
      }
      else { console.error(error) }
    }
  }

  async function create_conversation(members_id: number[]) {
    try {
      await api.post('/conversations', {
        members_id,
      })
      await get_user()
    }
    catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401)
          logout()
        else
          throw new Error(error.response?.data)
      }
      else { console.error(error) }
    }
  }

  function logout() {
    user.value = null
  }

  return {
    user,
    login,
    register,
    get_user,
    update_public_keys,
    add_contact,
    create_conversation,
    logout,
  }
})

// Add response interceptor to handle cookie-related errors
api.interceptors.response.use(
  (response) => {
    // eslint-disable-next-line no-console
    console.log('✅ Response received:', response.config.method?.toUpperCase(), response.config.url, response.status)
    return response
  },
  (error) => {
    if (axios.isAxiosError(error)) {
      console.error('❌ Request failed:', error.config?.method?.toUpperCase(), error.config?.url, error.response?.status)
      if (error.response?.status === 401) {
        console.error('🔑 Session expired or invalid:', error.response?.data)
        useUserStore().logout()
      }
    }
    return Promise.reject(error)
  },
)

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useUserStore as any, import.meta.hot))
