<script setup lang="ts">
import type { IConversation } from '../types'

const props = defineProps<{
  conversation: IConversation
}>()

const conversation_store = useConversationStore()
const new_messages = computed(() =>
  (conversation_store.messages[props.conversation.Conversation_id] ?? []).filter(message => message.new).length,
)
</script>

<template>
  <div
    class="btn-contact flex flex-col place-self-start gap-1"
    :class="conversation_store.selected_conversation_id === props.conversation.Conversation_id ? 'bg-gray-800' : ''"
    @click="conversation_store.select(props.conversation.Conversation_id)"
  >
    <div>
      <div v-for="member in props.conversation.members" :key="member.User_id">
        {{ member.User_name }}
      </div>
      <div v-if="!props.conversation.members.length" class="opacity-50">
        En attente des membres…
      </div>
    </div>
    <div v-if="!props.conversation.active" class="text-xs opacity-50">
      Vous ne faites plus partie de ce groupe
    </div>
    <div v-if="new_messages">
      {{ new_messages }} nouveau{{ new_messages > 1 ? 'x' : '' }} message{{ new_messages > 1 ? 's' : '' }}
    </div>
  </div>
</template>

<style scoped>
.btn-contact:hover {
  @apply bg-gray-800
}
</style>
