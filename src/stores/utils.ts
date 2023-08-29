import { acceptHMRUpdate, defineStore } from 'pinia'

export const useUtilsStore = defineStore('user', () => {
  function check_connection() {
    return document.cookie.split(';').some(item => item.trim().startsWith('authToken='))
  }
  return {
    check_connection,
  }
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useUserStore as any, import.meta.hot))
