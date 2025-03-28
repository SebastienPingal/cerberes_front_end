<script setup lang="ts">
import axios from 'axios'

// https://github.com/vueuse/head
// you can use this to manipulate the document head in any components,
// they will be rendered correctly in the html results with vite-ssg

useHead({
  title: 'Cerberes',
  meta: [
    { name: 'description', content: 'Opinionated Vite Starter Template' },
    {
      name: 'theme-color',
      content: () => (isDark.value ? '#00aba9' : '#ffffff'),
    },
  ],
  link: [
    {
      rel: 'icon',
      type: 'image/svg+xml',
      href: () => (preferredDark.value ? '/favicon-dark.svg' : '/favicon.svg'),
    },
  ],
})

const indexedDB_store = useIndexedDBStore()
const user_store = useUserStore()

onMounted(async () => {
  // eslint-disable-next-line no-console
  console.log('🚀 App mounted')
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')
  darkQuery.addEventListener('change', () => {
    preferredDark.value = darkQuery.matches
  })
  preferredDark.value = darkQuery.matches

  // eslint-disable-next-line no-console
  console.log('👤 Current user state:', user_store.user)
  if (user_store.user) {
    try {
      // eslint-disable-next-line no-console
      console.log('🔄 Attempting to restore user session...')
      await user_store.initializeSession()
      // eslint-disable-next-line no-console
      console.log('✅ User session restored successfully')
      await indexedDB_store.retrieveAndSetKeyPairs()
      // eslint-disable-next-line no-console
      console.log('🔑 Key pairs retrieved successfully')
    }
    catch (error) {
      console.error('⚠️ Failed to restore authentication state:', error)
      // Only logout if we get a 401 or 403 response
      if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
        // eslint-disable-next-line no-console
        console.log('🔒 Session expired, logging out...')
        user_store.logout()
      }
      else {
        // eslint-disable-next-line no-console
        console.log('🔄 Retrying session restoration...')
        // Retry once after a short delay
        setTimeout(async () => {
          try {
            await user_store.initializeSession()
            // eslint-disable-next-line no-console
            console.log('✅ User session restored on retry')
            await indexedDB_store.retrieveAndSetKeyPairs()
          }
          catch (retryError) {
            console.error('❌ Failed to restore session after retry:', retryError)
            user_store.logout()
          }
        }, 1000)
      }
    }
  }
  else {
    // eslint-disable-next-line no-console
    console.log('ℹ️ No user found in storage')
  }
})

// Add error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Unhandled promise rejection:', event.reason)
})

document.addEventListener('visibilitychange', () => {
  if (document.hidden)
    indexedDB_store.closeDB()
})
</script>

<template>
  <RouterView />
</template>
