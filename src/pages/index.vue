<script setup lang="ts">
defineOptions({
  name: 'IndexPage',
})

const display_store = useDisplayStore()
const encryption_store = useEncryptionStore()
const user_store = useUserStore()
const user = computed(() => user_store.user)
</script>

<template>
  <div class="flex flex-col items-center gap-3 overflow-hidden">
    <div v-if="!user">
      <TheLogin v-if="display_store.login" />
      <TheRegister v-if="display_store.register" />
    </div>
    <div v-else class="w-full">
      <div v-if="encryption_store.signing_keypair && encryption_store.encryption_keypair" class="flex gap-3 w-full">
        <TheConversationList />
        <TheMessageList class="w-full"/>
      </div>
      <div v-else>
        <TheKey />
      </div>
    </div>
  </div>
</template>

<route lang="yaml">
meta:
  layout: home
</route>
