<script setup lang='ts'>
import { OMessage } from 'onu-ui'

const user_store = useUserStore()
const user = computed(() => user_store.user)
const email = ref('')
const password = ref('')
const display_store = useDisplayStore()
const loading = ref(false)

async function login() {
  loading.value = true
  try {
    await user_store.login(email.value, password.value)
    OMessage({
      content: `Welcome back ${user.value?.User_name} !`,
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
    <h1>Log in</h1>
    <form class="w-250px flex flex-col items-center gap-3" @submit.prevent="login">
      <input v-model="email" class="input" type="text" placeholder="Email">
      <input v-model="password" class="input" type="password" placeholder="Password">
      <o-button :loading="loading" type="submit" class="w-fit">
        {{ loading ? 'Login in~~' : 'Log in' }}
      </o-button>
    </form>
    <div>
      You don't have an account yet?
      <span class="cursor-pointer underline hover:underline-wavy" @click="display_store.toggle_login_register">
        Register then !
      </span>
    </div>
  </div>
</template>

<style scoped>
.input {
  @apply p-1 rounded
}
</style>
