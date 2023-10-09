<script setup lang="ts">
import type { IMessage } from '../types'

const props = defineProps<{
  message: IMessage
}>()

const user_store = useUserStore()
const is_user_sender = computed(() => props.message.Sender_id === user_store.user.User_id)

function translate_to_relative_date(date: string) {
  const now = new Date()
  const inputDate = new Date(date)

  if (now.toDateString() === inputDate.toDateString()) {
    return inputDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  else if (now.getFullYear() === inputDate.getFullYear() && now.getMonth() === inputDate.getMonth()) {
    return inputDate.toLocaleDateString([], { day: '2-digit', hour: '2-digit', minute: '2-digit' })
  }
  else {
    const diffDays = Math.ceil(Math.abs((now.getTime() - inputDate.getTime()) / (1000 * 60 * 60 * 24)))
    return `${diffDays} days ago at ${inputDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }
}
</script>

<template>
  <div v-if="message.Message_content_decrypted" class="flex flex-col gap-1">
    <div
      class="w-fit border border-blue-300 rounded-bl-xl rounded-tl-xl rounded-tr-xl border-dashed px-4 py-1 text-blue-300"
      :class="is_user_sender ? 'place-self-end' : 'place-self-start'"
    >
      {{ message.Message_content_decrypted }}
    </div>
    <div class="flex place-self-end pr-5 text-xs">
      {{ translate_to_relative_date(message.createdAt) }}
    </div>
  </div>
</template>
