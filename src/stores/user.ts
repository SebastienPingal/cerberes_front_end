import { acceptHMRUpdate, defineStore } from 'pinia'
import type { IUser } from '../types'
import { api, error_message, is_status } from '../api'

export const useUserStore = defineStore('user', () => {
  // The session lives in an httpOnly cookie: nothing about the user is kept in localStorage
  const user: Ref<IUser | null> = ref(null)
  const is_initialized = ref(false)

  api.interceptors.response.use(undefined, (error) => {
    if (is_status(error, 401))
      user.value = null
    return Promise.reject(error)
  })

  async function initialize_session() {
    try {
      await get_user()
    }
    catch (error) {
      if (!is_status(error, 401))
        console.error('Failed to restore session:', error_message(error))
    }
    finally {
      is_initialized.value = true
    }
  }

  async function get_user() {
    const response = await api.get('/users/me')
    user.value = response.data as IUser
  }

  async function register(User_name: string, User_email: string, User_password: string) {
    try {
      const response = await api.post('/auth/register', { User_name, User_email, User_password })
      user.value = response.data as IUser
    }
    catch (error) {
      throw new Error(error_message(error))
    }
  }

  async function login(User_email: string, User_password: string) {
    try {
      const response = await api.post('/auth/login', { User_email, User_password })
      user.value = response.data as IUser
    }
    catch (error) {
      throw new Error(error_message(error))
    }
  }

  async function logout() {
    try {
      await api.post('/auth/logout')
    }
    finally {
      user.value = null
    }
  }

  async function set_identity(identity_public_key: string) {
    try {
      const response = await api.put('/users/me/identity', { identity_public_key })
      user.value = response.data as IUser
    }
    catch (error) {
      throw new Error(error_message(error))
    }
  }

  async function add_contact(contact_uuid: string) {
    try {
      await api.post('/contacts', null, { params: { uuid: contact_uuid } })
      await get_user()
    }
    catch (error) {
      throw new Error(error_message(error))
    }
  }

  function contact_name(User_id: number): string | undefined {
    if (user.value?.User_id === User_id)
      return user.value.User_name
    return user.value?.contact_list.find(contact => contact.Contact_User_id === User_id)?.User.User_name
      ?? user.value?.demands.find(demand => demand.User_id === User_id)?.AddedBy.User_name
  }

  return {
    user,
    is_initialized,
    initialize_session,
    get_user,
    register,
    login,
    logout,
    set_identity,
    add_contact,
    contact_name,
  }
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useUserStore, import.meta.hot))
