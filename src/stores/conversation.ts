import { defineStore } from 'pinia'
import axios from 'axios'
import type { IConversation, IMessage } from '~/types'

export const useConversationStore = defineStore('conversation', () => {
  const conversations = ref(useStorage('curent_user', <IConversation[] | null>null, undefined, {
    serializer: {
      read: (v: any) => v ? JSON.parse(v) : null,
      write: (v: any) => JSON.stringify(v),
    },
  }))

  const selected_conversation_id = ref(0)
  const selected_conversation: Ref<IConversation | null> = computed(() => {
    return conversations.value?.find(
      (conversation: IConversation) => conversation.Conversation_id === selected_conversation_id.value,
    ) ?? null
  })

  const api_url = import.meta.env.VITE_API_URL
  const user_store = useUserStore()

  async function send_message(message: string) {
    if (!selected_conversation.value) {
      console.error('no selected conversation')
      return
    }
    try {
      conversations.value.find((conversation: IConversation) => {
        return conversation.Conversation_id === selected_conversation_id.value
      })?.Messages?.push({
        Message_id: 0,
        Conversation_id: selected_conversation.value.Conversation_id,
        Message_content: message,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      // ! encrypt message here

      const response = await axios.post(`${api_url}/messages`, {
        Conversation_id: selected_conversation.value.Conversation_id,
        Message_content: message,
      }, {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true,
      })
      selected_conversation.value.Messages?.push(response.data)
      get_all_new_messages()
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

  async function get_all_new_messages() {
    try {
      const response_get_messages = await axios.get(`${api_url}/messages`, {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true,
      })
      const new_messages = response_get_messages.data
      const decrypted_messages_id: number[] = []

      new_messages.forEach((new_message: IMessage) => {
        // ! decrypt message here and check if it's valid

        decrypted_messages_id.push(new_message.Message_id)
        new_message.new = true // TODO: handle new messages
        const conversation: IConversation = conversations.value?.find(
          (conversation: IConversation) => conversation.Conversation_id === new_message.Conversation_id,
        )
        if (conversation) {
          conversation.Messages?.push(new_message)
          conversation.Messages?.sort((a: IMessage, b: IMessage) => {
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          })
        }
        else {
          conversations.value?.push({
            Conversation_id: new_message.Conversation_id,
            Messages: [new_message],
            Demands: true, // TODO: handle demands
          })
        }
      })

      // delete messages from server
      await axios.delete(`${api_url}/messages?ids=${decrypted_messages_id.join(',')}`, {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true,
      })
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
    send_message,
    get_all_new_messages,
    selected_conversation,
    selected_conversation_id,
    conversations,
  }
})
