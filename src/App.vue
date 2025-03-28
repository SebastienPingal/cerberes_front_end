// eslint-disable-next-line no-console
console.log('📜 Script starting')

<script setup lang="ts">
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

// eslint-disable-next-line no-console
console.log('🔧 Head setup complete')

const indexedDB_store = useIndexedDBStore()
const user_store = useUserStore()

// eslint-disable-next-line no-console
console.log('🏪 Stores initialized')

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
      await user_store.get_user()
      // eslint-disable-next-line no-console
      console.log('✅ User session restored successfully')
      await indexedDB_store.retrieveAndSetKeyPairs()
      // eslint-disable-next-line no-console
      console.log('🔑 Key pairs retrieved successfully')
    }
    catch (error) {
      console.error('🔑 Failed to restore authentication state:', error)
      user_store.logout()
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
