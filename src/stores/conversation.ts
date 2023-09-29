import { defineStore } from 'pinia'
import axios from 'axios'
import type { IConversation } from '~/types'

export const useConversationStore = defineStore('conversation', () => {
  const conversations: Ref<IConversation[] | []> = ref([])
  const selected_conversation: Ref<IConversation | null> = ref(null)
  const api_url = import.meta.env.VITE_API_URL
  const user_store = useUserStore()

  async function set_selected_conversation(Conversation_id: number) {
    try {
      const that_conversation = conversations.value?.find(
        conversation => conversation.Conversation_id === Conversation_id,
      )
      if (!that_conversation) {
        selected_conversation.value = null
        return
      }
      selected_conversation.value = that_conversation
      get_messages()
    }
    catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401)
          user_store.logout()

        throw new Error(error.response?.data)
      }
      else {
        console.error(error)
      }
    }
  }

  async function send_message(message: string) {
    if (!selected_conversation.value) {
      console.error('no selected conversation')
      return
    }
    try {
      const response = await axios.post(`${api_url}/messages`, {
        Conversation_id: selected_conversation.value.Conversation_id,
        Message_content: message,
      }, {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true,
      })
      selected_conversation.value.Messages?.push(response.data)
      get_messages()
    }
    catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401)
          user_store.logout()
        throw new Error(error.response?.data)
      }
      else { console.error(error) }
    }
  }

  async function get_messages() {
    if (!selected_conversation.value) {
      console.error('no selected conversation')
      return
    }
    try {
      const response = await axios.get(`${api_url}/messages?Conversation_id=${selected_conversation.value.Conversation_id}`, {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true,
      })
      selected_conversation.value.Messages = response.data
    }
    catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401)
          user_store.logout()
        throw new Error(error.response?.data)
      }
      else {
        console.error(error)
      }
    }
  }

  return {
    set_selected_conversation,
    send_message,
    get_messages,
    selected_conversation,
    conversations,
  }
})
