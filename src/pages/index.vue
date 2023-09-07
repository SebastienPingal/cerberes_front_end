<script setup lang="ts">
defineOptions({
  name: 'IndexPage',
})

const display_store = useDisplayStore()
const user_store = useUserStore()
const user = computed(() => user_store.user)
const router = useRouter()
</script>

<template>
  <div class="flex flex-col items-center gap-3">
    <div class="rounded-lg bg-white p-2">
      <img src="../assets/Cerberus.jpg" alt="Cerberus" class="h-6rem cursor-pointer" @click="router.push('/')">
    </div>
    <div v-if="!user">
      <TheLogin v-if="display_store.login" />
      <TheRegister v-if="display_store.register" />
    </div>
    <TheKey v-else />
  </div>
</template>

<route lang="yaml">
meta:
  layout: home
</route>
