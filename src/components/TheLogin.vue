<script setup lang='ts'>
const user_store = useUserStore()
const email = ref('')
const password = ref('')

async function login() {
  await user_store.login(email.value, password.value)
}
</script>

<template>
  <div class="flex flex-col items-center">
    <h1>Log in</h1>
    <form class="w-250px flex flex-col gap-3" @submit.prevent="login">
      <input v-model="email" class="input" type="text" placeholder="Email">
      <input v-model="password" class="input" type="password" placeholder="Password">
      <o-button type="submit">
        Log in
      </o-button>
    </form>
  </div>
</template>

<style scoped>
.input {
  @apply p-1 rounded
}
</style>
