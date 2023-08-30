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
    <o-button v-if="user" rounded @click="go_to_profile">
      {{ user.User_name }}
    </o-button>
  </div>
</template>
