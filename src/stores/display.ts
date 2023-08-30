import { acceptHMRUpdate, defineStore } from 'pinia'

export const useDisplayStore = defineStore('displays', () => {
  const login = ref(true)
  const register = ref(false)

  function toggle_login_register() {
    login.value = !login.value
    register.value = !register.value
  }

  return {
    login,
    register,
    toggle_login_register,
  }
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useUserStore as any, import.meta.hot))
