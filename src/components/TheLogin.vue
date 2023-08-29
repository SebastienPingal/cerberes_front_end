<script setup lang='ts'>
import { OMessage } from 'onu-ui'

const user_store = useUserStore()
const email = ref('')
const password = ref('')

async function login() {
  try {
    await user_store.login(email.value, password.value)
  }
  catch (error) {
    const typed_error = error as Error
    console.error(typed_error.message)
    OMessage({
      content: typed_error.message,
      type: 'warning',
    })
  }
}
</script>

<template>
  <div class="card">
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
