import { acceptHMRUpdate, defineStore } from 'pinia'
import axios from 'axios'
import type { IContact, IUser } from '../types'

export const useUserStore = defineStore('user', () => {
  const api_url = import.meta.env.VITE_API_URL

  const user = ref(useStorage('curent_user', <IUser | null>null, undefined, {
    serializer: {
      read: (v: any) => v ? JSON.parse(v) : null,
      write: (v: any) => JSON.stringify(v),
    },
  }))

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

  async function add_contact(contact_uuid: string) {
    try {
      await axios.post(`${api_url}/contacts?uuid=${contact_uuid}`, {}, {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true,
      }).then((response) => {
        user.value.contact_list.push(response.data as IContact)
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

  function logout() {
    user.value = null
  }

  return {
    user,
    login,
    register,
    get_user,
    add_contact,
    logout,
  }
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useUserStore as any, import.meta.hot))
