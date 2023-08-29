<script setup lang="ts">
const user_store = useUserStore()
const user = computed(() => user_store.user)
</script>

<template>
  <div class="header w-max-7xl w-full flex justify-between">
    <img src="../assets/logo.png" alt="logo">
    <h1 v-if="user">
      {{ user.User_name }}
    </h1>
  </div>
</template>
