import { acceptHMRUpdate, defineStore } from 'pinia'
import axios from 'axios'
import type { IUser } from '../types'

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

  return {
    user,
    login,
    register,
  }
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useUserStore as any, import.meta.hot))
