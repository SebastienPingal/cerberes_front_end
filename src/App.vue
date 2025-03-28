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

const indexedDB_store = useIndexedDBStore()
const user_store = useUserStore()

onMounted(async () => {
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')
  darkQuery.addEventListener('change', () => {
    preferredDark.value = darkQuery.matches
  })
  preferredDark.value = darkQuery.matches

  try {
    if (user_store.user) {
      const isAuthenticated = await user_store.checkAuth()
      if (isAuthenticated) {
        await user_store.get_user()
        await indexedDB_store.retrieveAndSetKeyPairs()
      }
      else {
        user_store.logout()
      }
    }
  }
  catch (error) {
    user_store.logout()
  }
})

document.addEventListener('visibilitychange', () => {
  if (document.hidden)
    indexedDB_store.closeDB()
})
</script>

<template>
  <RouterView />
</template>
