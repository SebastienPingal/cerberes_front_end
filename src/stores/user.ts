import { acceptHMRUpdate, defineStore } from 'pinia'
import axios from 'axios'
import type { IUser } from '../types'

export const useUserStore = defineStore('user', () => {
  const api_url = import.meta.env.VITE_API_URL
  const encryption_store = useEncryptionStore()

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
      await axios.post(`${api_url}/auth/login`, {
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

  async function get_user() {
    try {
      await axios.get(`${api_url}/users/me`, {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true,
      }).then((response) => {
        user.value = response.data as IUser
      })
    }
    catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401)
          user.value = null
        else
          throw new Error(error.response?.data)
      }
      else { console.error(error) }
    }
  }

  async function update_public_keys() {
    try {
      const stringified_encryption_public_key = JSON.stringify(encryption_store.encryption_keypair?.publicKey)
      const stringified_signing_public_key = JSON.stringify(encryption_store.signing_keypair?.publicKey)
      const response = await axios.patch(`${api_url}/users/public_keys`, {
        encryption_public_key: stringified_encryption_public_key,
        signing_public_key: stringified_signing_public_key,
      }, {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true,
      })
      user.value = response.data as IUser
    }
    catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401)
          user.value = null
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
          user.value = null
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
          user.value = null
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
