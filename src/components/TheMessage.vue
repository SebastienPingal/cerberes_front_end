<script setup lang="ts">
import type { IMessage } from '../types'

const props = defineProps<{
  message: IMessage
}>()

const user_store = useUserStore()
const is_user_sender = computed(() => props.message.Sender_id === user_store.user.User_id)

const translate_to_relative_date = (date: string) => {
  const now = new Date()
  const inputDate = new Date(date)

  if (now.toDateString() === inputDate.toDateString()) {
    return inputDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } else if (now.getFullYear() === inputDate.getFullYear() && now.getMonth() === inputDate.getMonth()) {
    return inputDate.toLocaleDateString([], { day: '2-digit', hour: '2-digit', minute: '2-digit' })
  } else {
    const diffDays = Math.ceil(Math.abs((now.getTime() - inputDate.getTime()) / (1000 * 60 * 60 * 24)))
    return diffDays + ' days ago at ' + inputDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
}
</script>

<template>
  <div v-if="message.Message_content_decrypted" class="flex flex-col gap-1">
    <div
      class="border-dashed border-blue-300 border rounded-tl-xl rounded-tr-xl rounded-bl-xl text-blue-300 w-fit py-1 px-4"
      :class="is_user_sender ? 'place-self-end' : 'place-self-start'">
      {{ message.Message_content_decrypted }}
    </div>
    <div class="text-xs flex place-self-end pr-5">
      {{ translate_to_relative_date(message.createdAt) }}
    </div>
  </div>
</template>
