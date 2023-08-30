<script setup lang="ts">
import { OMessage } from 'onu-ui'

const user_store = useUserStore()
const user = computed(() => user_store.user)
const name = ref('')
const email = ref('')
const password = ref('')
const passwordConfirm = ref('')
const displayed_error = ref('')
const loading = ref(false)
const display_store = useDisplayStore()

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
  if (!/[A-Z]/.test(password.value)) {
    OMessage({
      content: 'Password must contain at least one uppercase letter',
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
    OMessage({
      content: `Welcome ${user.value?.User_name} !`,
      type: 'success',
    })
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
    <form class="flex flex-col items-center gap-2" @submit.prevent="register">
      <input v-model="name" required class="input" type="text" placeholder="Name">
      <input v-model="email" required class="input" type="text" placeholder="Email">
      <input v-model="password" required class="input" type="password" placeholder="Password">
      <input v-model="passwordConfirm" required class="input" type="password" placeholder="Confirm Password">

      <o-button :loading="loading" type="submit" class="w-fit" @click="register">
        {{ loading ? 'Registering~~' : 'Register' }}
      </o-button>
    </form>
    <div>
      Already have an account ?
      <span class="cursor-pointer underline hover:underline-wavy" @click="display_store.toggle_login_register">
        Login then !
      </span>
    </div>
  </div>
</template>

<style scoped>
.input {
  @apply p-1 rounded
}
</style>
