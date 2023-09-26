import { defineStore } from 'pinia'
import type { IConversation } from '~/types'

export const useConversationStore = defineStore('conversation', () => {
  const conversations: Ref<IConversation[] | null> = ref([])
  const selected_conversation: Ref<IConversation | null> = ref(null)

  return {
    selected_conversation,
    conversations,
  }
})
