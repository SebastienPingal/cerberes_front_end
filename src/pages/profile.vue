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
    <img src="../../Derperus.png" alt="Derperus" class="w-250px cursor-pointer" @click="router.push('/')">
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
