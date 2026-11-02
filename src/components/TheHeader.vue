<script setup lang="ts">
const router = useRouter()
const user_store = useUserStore()
const user = computed(() => user_store.user)

function go_to_profile() {
  router.push('/profile')
}

async function logout() {
  await user_store.logout()
  router.push('/')
}
</script>

<template>
  <div class="header w-max-7xl h-12 w-full flex justify-between pb-2">
    <div class="flex cursor-pointer place-self-center border rounded p-1 font-bold tracking-widest uppercase hover:dark:bg-gray-8" @click="router.push('/')">
      Cerberes
    </div>
    <div class="flex gap-2">
      <o-button v-if="user" @click="go_to_profile">
        {{ user.User_name }}
      </o-button>
      <o-button v-if="user" type="warning" light @click="logout">
        Logout
      </o-button>
    </div>
  </div>
</template>
