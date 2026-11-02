<script setup lang="ts">
defineOptions({
  name: 'IndexPage',
})

const display_store = useDisplayStore()
const device_store = useDeviceStore()
const user_store = useUserStore()
const user = computed(() => user_store.user)
</script>

<template>
  <div class="flex flex-col items-center gap-3">
    <div v-if="!user_store.is_initialized" class="opacity-50">
      Chargement…
    </div>
    <div v-else-if="!user">
      <TheLogin v-if="display_store.login" />
      <TheRegister v-if="display_store.register" />
    </div>
    <div v-else class="w-full">
      <div v-if="device_store.status === 'ready'" class="w-full flex flex-col gap-3">
        <TheIdentityAlerts />
        <div class="w-full flex flex-col gap-3 sm:flex-row" style="height: calc(100vh - 200px)">
          <TheConversationList class="w-full sm:w-fit" />
          <TheMessageList class="w-full" />
        </div>
      </div>
      <TheDeviceSetup v-else-if="device_store.status !== 'unknown'" />
      <div v-else class="opacity-50">
        Chargement…
      </div>
    </div>
  </div>
</template>

<route lang="yaml">
meta:
  layout: home
</route>
