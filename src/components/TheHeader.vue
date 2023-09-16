<script setup lang="ts">
const router = useRouter()
const user_store = useUserStore()
const user = computed(() => user_store.user)

function go_to_profile() {
  router.push('/profile')
}
</script>

<template>
  <div class="header w-max-7xl w-full flex justify-between">
    <div class="w-10 rounded-lg bg-white p-1" @click="router.push('/')">
      <img src="../assets/Cerberus.jpg" alt="Cerberus">
    </div>
    <o-button v-if="user" rounded @click="go_to_profile">
      {{ user.User_name }}
    </o-button>
    <o-button v-if="user" type="warning" light rounded @click="user_store.logout">
      Logout
    </o-button>
  </div>
</template>
