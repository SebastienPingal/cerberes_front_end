import { acceptHMRUpdate, defineStore } from 'pinia'
import axios from 'axios'
import type { IContact, IConversation, IUser } from '../types'

export const useUserStore = defineStore('user', () => {
  const api_url = import.meta.env.VITE_API_URL
  const encryption_store = useEncryptionStore()
  const conversation_store = useConversationStore()
  const indexedDB_store = useIndexedDBStore()

  const user = ref(useStorage('curent_user', <IUser | null>null, undefined, {
    serializer: {
      read: (v: any) => v ? JSON.parse(v) : null,
      write: (v: any) => JSON.stringify(v),
    },
  }))

  async function register(User_name: string, User_email: string, User_password: string) {
    try {
      await axios.post(`${api_url}/auth/register`, {
        User_name,
        User_email,
        User_password,
      }, {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true,
      }).then((response) => {
        user.value = response.data as IUser
      })
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
      const response = await axios.post(`${api_url}/auth/login`, {
        User_email,
        User_password,
      }, {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true,
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
      const response = await axios.get(`${api_url}/users/me`, {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true,
      })
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
        if (error.response?.status === 401)
          logout()
        else
          throw new Error(error.response?.data)
      }
      else { console.error(error) }
    }
  }

  async function update_public_keys() {
    try {
      const response = await axios.patch(`${api_url}/users/public_keys`, {
        encryption_public_key: encryption_store.encryption_keypair?.publicKey,
        signing_public_key: encryption_store.signing_keypair?.publicKey,
      }, {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true,
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
      await axios.post(`${api_url}/contacts?uuid=${contact_uuid}`, {}, {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true,
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

  async function create_conversation(members_id: number[]) {
    try {
      await axios.post(`${api_url}/conversations`, {
        members_id,
      }, {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true,
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

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useUserStore as any, import.meta.hot))
