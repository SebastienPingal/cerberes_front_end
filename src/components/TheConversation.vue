<script setup lang="ts">
import type { IConversation } from '../types'

const props = defineProps<{
  conversation: IConversation
}>()

const conversation_store = useConversationStore()
</script>

<template>
  <div class="btn-contact place-self-start flex flex-col gap-1"
    @click="conversation_store.selected_conversation_id = props.conversation.Conversation_id">
    <div v-for="member in props.conversation.Users" :key="member.User_id">
      {{ member.User_name }}
    </div>
  </div>
</template>

<style scoped>
.btn-contact {
  @apply w-xs flex place-content-center border rounded p-2 cursor-pointer
}

.btn-contact:hover {
  @apply bg-gray-800
}
</style>
