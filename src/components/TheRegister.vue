<script setup lang="ts">
import { OMessage } from 'onu-ui'

const user_store = useUserStore()
const name = ref('')
const email = ref('')
const password = ref('')
const passwordConfirm = ref('')
const displayed_error = ref('')
const loading = ref(false)

async function register() {
  if (password.value.length < 8) {
    OMessage({
      content: 'Password must be at least 8 characters',
      type: 'warning',
    })
    return
  }
  if (password.value !== passwordConfirm.value) {
    OMessage({
      content: 'Passwords do not match',
      type: 'warning',
    })
    return
  }
  if (password.value.length > 64) {
    OMessage({
      content: 'Password must be at most 64 characters',
      type: 'warning',
    })
    return
  }
  if (name.value.length < 1) {
    OMessage({
      content: 'You must enter a name',
      type: 'warning',
    })
    return
  }
  if (name.value.length > 64) {
    OMessage({
      content: 'Name must be at most 64 characters',
      type: 'warning',
    })
    return
  }
  if (email.value.length < 1) {
    OMessage({
      content: 'You must enter an email',
      type: 'warning',
    })
    return
  }
  if (email.value.length > 64) {
    OMessage({
      content: 'Email must be at most 64 characters',
      type: 'warning',
    })
    return
  }
  const email_regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!email_regex.test(email.value)) {
    OMessage({
      content: 'Email must be valid',
      type: 'warning',
    })
    return
  }

  loading.value = true
  displayed_error.value = ''
  try {
    await user_store.register(name.value, email.value, password.value)
  }
  catch (error) {
    const typed_error = error as Error
    console.error(typed_error.message)
    OMessage({
      content: typed_error.message,
      type: 'warning',
    })
  }
  loading.value = false
}
</script>

<template>
  <div class="card">
    <h1>Register</h1>
    <div class="w-250px flex flex-col gap-2">
      <input v-model="name" class="input" type="text" placeholder="Name">
      <input v-model="email" class="input" type="text" placeholder="Email">
      <input v-model="password" class="input" type="password" placeholder="Password">
      <input v-model="passwordConfirm" class="input" type="password" placeholder="Confirm Password">
    </div>

    <o-button :loading="loading" type="submit" class="w-250px" @click="register">
      {{ loading ? 'Registering~~' : 'Register' }}
    </o-button>
  </div>
</template>

<style scoped>
.input {
  @apply p-1 rounded
}
</style>
