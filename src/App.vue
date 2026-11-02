<script setup lang="ts">
// https://github.com/vueuse/head
// you can use this to manipulate the document head in any components,
// they will be rendered correctly in the html results with vite-ssg

useHead({
  title: 'Cerberes',
  meta: [
    { name: 'description', content: 'End-to-end encrypted chat, where users own their keys' },
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

const user_store = useUserStore()
const device_store = useDeviceStore()
const directory_store = useDirectoryStore()
const conversation_store = useConversationStore()

// Session lifecycle: user (cookie) -> device (local keys) -> conversations (MLS groups)
watch(() => user_store.user?.User_id, async (User_id) => {
  conversation_store.reset()
  device_store.lock()
  if (User_id)
    await device_store.load()
})

watch(() => device_store.status, async (status) => {
  if (status !== 'ready') {
    conversation_store.stop()
    return
  }
  await directory_store.load()
  if (user_store.user)
    await directory_store.observe(user_store.user.contact_list.map(contact => contact.User))
  await conversation_store.load()
  conversation_store.start()
})

onMounted(() => {
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')
  darkQuery.addEventListener('change', () => {
    preferredDark.value = darkQuery.matches
  })
  preferredDark.value = darkQuery.matches

  user_store.initialize_session()
})
</script>

<template>
  <RouterView />
</template>
