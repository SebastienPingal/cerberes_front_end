<script setup lang="ts">
defineOptions({
  name: 'IndexPage',
})

const display_store = useDisplayStore()
const user_store = useUserStore()
const user = computed(() => user_store.user)
const router = useRouter()
const test = import.meta.env.VITE_API_URL
</script>

<template>
  <div class="flex flex-col items-center gap-3">
    <img src="../../Derperus.png" alt="Derperus" class="w-250px" @click="router.push('/')">
    {{ test }}
    <p>
      <a rel="noreferrer" href="https://github.com/sebastienpingal/cerberes_front_end" target="_blank"> Cerberes </a>
    </p>
    <div v-if="!user">
      <TheLogin v-if="display_store.login" />
      <TheRegister v-if="display_store.register" />
    </div>
  </div>
</template>

<route lang="yaml">
meta:
  layout: home
</route>
