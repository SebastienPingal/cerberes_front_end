<script setup lang="ts">
import { OMessage } from 'onu-ui'

defineOptions({
  name: 'IndexPage',
})
const user_store = useUserStore()
const user = computed(() => user_store.user)

function copy_uuid() {
  const uuid = user.value.User_contact_uuid
  navigator.clipboard.writeText(uuid)
  OMessage.success('Copied to clipboard')
}
</script>

<template>
  <div class="flex flex-col items-center gap-3">
    <h1 class="text-2xl">
      Profile
    </h1>
    <div v-if="user">
      <div>
        {{ user.User_name }}
      </div>
      <div>
        {{ user.User_email }}
      </div>
      <div>
        <div>Your contact code</div>

        <div class="flex cursor-pointer text-sm text-blue hover:underline" @click="copy_uuid">
          {{ user.User_contact_uuid }}
          <o-icon i-carbon-copy class="h-1rem w-1rem" />
        </div>
      </div>
      <TheKey />
    </div>
  </div>
</template>

<route lang="yaml">
meta:
  layout: home
</route>
