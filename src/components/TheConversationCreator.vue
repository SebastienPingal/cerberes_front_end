<script setup lang="ts">
const display_store = useDisplayStore()
</script>

<template>
  <div class="fixed left-0 top-0 z-10 h-full w-full bg-black bg-opacity-50 backdrop-blur" />
  <div class="fixed top-1/3 z-10 border border-1 rounded bg-white p-2 dark:bg-black">
    <div class="flex flex-col">
      <o-button class="w-fit flex place-self-end rounded-full px-2 py-1" type="info" light @click="display_store.conversation_creator = false">
        <div i-carbon-close-large />
      </o-button>
    </div>
    <TheContactList />
  </div>
</template>
