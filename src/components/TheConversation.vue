<script setup lang="ts">
import type { IConversation } from '../types'

const props = defineProps<{
  conversation: IConversation
}>()

const new_messages = computed(() => props.conversation.Messages?.filter(message => message.new).length)
const conversation_store = useConversationStore()
</script>

<template>
  <div
    class="btn-contact flex flex-col place-self-start gap-1"
    :class="conversation_store.selected_conversation_id === props.conversation.Conversation_id ? 'bg-gray-800' : ''"
    @click="conversation_store.selected_conversation_id = props.conversation.Conversation_id"
  >
    <div>
      <div v-for="member in props.conversation.Users" :key="member.User_id">
        {{ member.User_name }}
      </div>
    </div>
    <div v-if="new_messages">
      {{ new_messages }} new messages
    </div>
  </div>
</template>

<style scoped>
.btn-contact:hover {
  @apply bg-gray-800
}
</style>
