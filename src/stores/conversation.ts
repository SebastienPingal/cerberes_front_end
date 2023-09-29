import { defineStore } from 'pinia'
import axios from 'axios'
import type { IConversation, IMessage } from '~/types'

export const useConversationStore = defineStore('conversation', () => {
  const conversations: Ref<IConversation[] | []> = ref([])
  const selected_conversation: Ref<IConversation | null> = ref(null)
  const api_url = import.meta.env.VITE_API_URL

  async function set_selected_conversation(Conversation_id: number) {
    const that_conversation = conversations.value?.find(
      conversation => conversation.Conversation_id === Conversation_id,
    )
    if (!that_conversation) {
      selected_conversation.value = null
      return
    }
    selected_conversation.value = that_conversation

    const messages: IMessage[] = await axios.get(`${api_url}/messages/${Conversation_id}`)
    if (!messages) {
      console.error('no messages')
      selected_conversation.value = null
      return
    }
    selected_conversation.value.Messages = messages
  }

  async function send_message(message: string) {
    if (!selected_conversation.value) {
      console.error('no selected conversation')
      return
    }
    try {
      const response = await axios.post(`${api_url}/messages`, {
        Conversation_id: selected_conversation.value.Conversation_id,
        message,
      })
      selected_conversation.value.Messages?.push(response.data)
    }
    catch (error) {
      if (axios.isAxiosError(error))
        throw new Error(error.response?.data)
      else
        console.error(error)
    }
  }

  return {
    set_selected_conversation,
    send_message,
    selected_conversation,
    conversations,
  }
})
