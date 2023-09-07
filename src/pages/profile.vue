<script setup lang="ts">
defineOptions({
  name: 'IndexPage',
})
const router = useRouter()
const user_store = useUserStore()
const user = computed(() => user_store.user)
</script>

<template>
  <div class="flex flex-col items-center gap-3">
    <div class="rounded-lg bg-white p-2">
      <img src="../assets/Cerberus.jpg" alt="Cerberus" class="h-6rem cursor-pointer" @click="router.push('/')">
    </div>
    <h1 class="text-2xl">
      Profile
    </h1>
    <div v-if="user">
      <div>
        {{ user.User_name }}
      </div>
      <div>
        {{ user.User_email }}
      </div>
    </div>
  </div>
</template>

<route lang="yaml">
meta:
  layout: home
</route>
