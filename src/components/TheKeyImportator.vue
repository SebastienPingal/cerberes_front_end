<script setup lang="ts">
const utils_store = useUtilsStore()
</script>

<template>
  <div>
    <o-button @click="utils_store.retrieve_keys">
      Import it
    </o-button>
  </div>
</template>
