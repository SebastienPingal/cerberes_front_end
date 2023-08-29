import { acceptHMRUpdate, defineStore } from 'pinia'
import axios from 'axios'

export const useUserStore = defineStore('user', () => {
  const savedName = ref('')
  const previousNames = ref(new Set<string>())
  const api_url = import.meta.env.VITE_API_URL
  const usedNames = computed(() => Array.from(previousNames.value))
  const otherNames = computed(() => usedNames.value.filter(name => name !== savedName.value))

  function setNewName(name: string) {
    if (savedName.value)
      previousNames.value.add(savedName.value)
    savedName.value = name
  }

  async function login(User_email: string, User_password: string) {
    try {
      await axios.post(`${api_url}/auth/login`, {
        User_email,
        User_password,
      }, {
        headers: { 'Content-Type': 'application/json' },
      },
      ).then((response) => {
        // put the token in the local storage
        localStorage.setItem('token', response.data.token)
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
        PGP_PublicKey: 'test',
      }, {
        headers: { 'Content-Type': 'application/json' },
      },
      ).then((response) => {
        // put the token in the local storage
        localStorage.setItem('token', response.data.token)
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
    setNewName,
    otherNames,
    savedName,
    login,
    register,
  }
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useUserStore as any, import.meta.hot))
