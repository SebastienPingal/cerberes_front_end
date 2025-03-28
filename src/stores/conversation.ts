import { acceptHMRUpdate, defineStore } from 'pinia'
import axios from 'axios'
import type { IConversation, IMessage, IUser } from '~/types'

const api_url = import.meta.env.VITE_API_URL

// Create axios instance with default config
const api = axios.create({
  baseURL: api_url,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const useConversationStore = defineStore('conversation', () => {
  const user_store = useUserStore()
  const api_url = import.meta.env.VITE_API_URL
  const storage_key = computed(() => user_store.user?.User_id.toString() ?? 'default')
  const encryption_store = useEncryptionStore()
  const utils_store = useUtilsStore()

  const conversations = computed(() => {
    return useStorage(`conversations_${storage_key.value}`, <IConversation[] | []>[], undefined, {
      serializer: {
        read: (v: any) => v ? JSON.parse(v) : null,
        write: (v: any) => JSON.stringify(v),
      },
    }).value
  })

  const selected_conversation_id: Ref<number | null> = ref(null)
  const selected_conversation: Ref<IConversation | null> = computed(() => {
    if (selected_conversation_id.value === null)
      return null
    const selected_conv = conversations.value.find(
      (conversation: IConversation) => conversation.Conversation_id === selected_conversation_id.value,
    ) ?? null
    selected_conv?.Messages?.forEach((message: IMessage) => {
      message.new = false
    })
    selected_conv.Messages?.sort((a: IMessage, b: IMessage) => {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })
    return selected_conv
  })

  async function send_message(message: string) {
    if (!selected_conversation.value) {
      console.error('no selected conversation')
      return
    }
    try {
      if (!selected_conversation.value.Users || !selected_conversation.value.Users[0].encryption_public_key) {
        console.error('no encryption key for the User')
        return
      }
      const complete_message: IMessage = {
        Sender_id: user_store.user.User_id,
        Message_id: 0,
        Conversation_id: selected_conversation.value.Conversation_id,
        Message_content_decrypted: message,
        createdAt: new Date().toISOString(),
      }

      if (selected_conversation.value.Conversation_id !== 0) {
        conversations.value.find((conv: IConversation) => {
          return conv.Conversation_id === selected_conversation_id.value
        })?.Messages.push(complete_message)
      }
      else {
        if (!selected_conversation.value.Users)
          throw new Error('No users in conversation')
        const members_id: number[] = selected_conversation.value.Users.map((user: IUser) => user.User_id)
        const the_conversation = conversations.value.find((conv: IConversation) => {
          const users_id = conv.Users?.map((user: IUser) => user.User_id)
          return users_id?.every(id => members_id.includes(id))
        })
        if (!the_conversation)
          throw new Error('No conversation found')
        the_conversation.Messages.push(complete_message)
      }

      const conversation_without_messages = { ...selected_conversation.value }
      delete conversation_without_messages.Messages
      const uint8_recipient_public_encryption_key = utils_store.convert_object_to_uint8array(selected_conversation.value.Users[0].encryption_public_key)

      const encrypted_message = encryption_store.signAndEncryptMessage(
        message,
        uint8_recipient_public_encryption_key,
      )

      const response = await api.post('/messages', {
        Conversation: conversation_without_messages,
        Message_content: encrypted_message.encryptedMessage,
        Nonce: encrypted_message.nonce,
      })
      if (response.status !== 201)
        throw new Error('Message not sent')

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

  async function create_conversation(members: IUser[]) {
    try {
      if (!members.length)
        throw new Error('No members in conversation')
      if (!conversations.value)
        throw new Error('No conversations')
      // if already exist throw error
      const that_conversation = conversations.value.find((conversation: IConversation) => {
        return conversation.Users?.find((user: IUser) => {
          return members.find((member: IUser) => {
            return user.User_id === member.User_id
          })
        })
      })

      if (that_conversation)
        throw new Error('Conversation already exist')

      conversations.value.push({
        Conversation_id: 0,
        Users: members,
        Messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    }
    catch (error) {
      const typed_error = error as Error
      throw new Error(typed_error.message)
    }
  }

  async function get_all_new_messages() {
    try {
      const response_get_messages = await api.get('/conversations')
      const conversations_with_new_messages: IConversation[] = response_get_messages.data
      const decrypted_messages_id: number[] = []
      if (!conversations_with_new_messages.length)
        return

      conversations_with_new_messages.forEach((that_conversation: IConversation) => {
        if (!that_conversation.Users[0].encryption_public_key || !that_conversation.Users[0].signing_public_key) {
          console.error('no encryption key for the User')
          return
        }

        that_conversation.Messages?.forEach((that_message: IMessage) => {
          const uInt8Array_message = utils_store.convert_object_to_uint8array(that_message.Message_content)
          const uInt8Array_nonce = utils_store.convert_object_to_uint8array(that_message.Nonce)
          const uInt8Array_signing_public_key = utils_store.convert_object_to_uint8array(that_conversation.Users[0].signing_public_key)
          const uInt8Array_encryption_public_key = utils_store.convert_object_to_uint8array(that_conversation.Users[0].encryption_public_key)
          const enccrypted_data = {
            encryptedMessage: uInt8Array_message,
            nonce: uInt8Array_nonce,
          }
          try {
            const decrypted_message = encryption_store.decryptAndVerifyMessage(
              enccrypted_data,
              uInt8Array_signing_public_key,
              uInt8Array_encryption_public_key,
            )
            that_message.Message_content_decrypted = decrypted_message
            that_message.new = true
            decrypted_messages_id.push(that_message.Message_id)
          }
          catch (error) {
            console.error(`${error} for message ${that_message.Message_id}`)
          }
        })

        // find conversation with id
        const concerned_conversation = conversations.value?.find((conv: IConversation) => {
          return conv.Conversation_id === that_conversation.Conversation_id
        })

        if (!concerned_conversation) {
          const members_id = that_conversation.Users?.map((user: IUser) => user.User_id)

          // check if it is a conversation that as not been pushed yet
          const unidentified_conversation = conversations.value.find((conv: IConversation) => {
            const convUsersId = conv.Users?.map((user: IUser) => user.User_id)
            return JSON.stringify(convUsersId?.sort()) === JSON.stringify(members_id?.sort())
          })
          if (unidentified_conversation) {
            unidentified_conversation.Conversation_id = that_conversation.Conversation_id
            if (unidentified_conversation.Messages && that_conversation.Messages)
              unidentified_conversation.Messages.push(...that_conversation.Messages)
          }
          else {
            conversations.value?.push(that_conversation)
          }
        }
        else { concerned_conversation.Messages?.push(...that_conversation.Messages!) }
        conversations.value.forEach((conv: IConversation) => {
          conv.Messages?.sort((a: IMessage, b: IMessage) => {
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          })
        })
      })

      if (!decrypted_messages_id.length)
        return

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
      else { console.error(error) }
    }
  }

  return {
    send_message,
    get_all_new_messages,
    create_conversation,
    storage_key,
    selected_conversation,
    selected_conversation_id,
    conversations,
  }
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useConversationStore, import.meta.hot))
