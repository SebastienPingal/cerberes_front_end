<script setup lang="ts">
import { OMessage } from 'onu-ui'

const { textarea, input } = useTextareaAutosize()
const conversation_store = useConversationStore()
const sending = ref(false)

async function send_message() {
  const text = input.value?.trim()
  if (!text || sending.value)
    return
  sending.value = true
  try {
    await conversation_store.send_message(text)
    input.value = ''
  }
  catch (error) {
    OMessage({ content: (error as Error).message, type: 'warning' })
  }
  sending.value = false
}
</script>

<template>
  <div class="w-full flex gap-4">
    <textarea
      ref="textarea" v-model="input" v-bind="$attrs"
      class="resize-none overflow-hidden border-2 border-blue-400 rounded-md border-dashed bg-white p-2 text-blue-400 transition-all focus:border-solid dark:bg-dark-9 focus:outline-none placeholder-blue-900"
      placeholder="Type a message..." @keydown.enter.exact.prevent="send_message"
    />
    <button
      v-if="input"
      :disabled="sending"
      class="box-content border-2 border-blue-900 rounded-md bg-white p-2 text-white transition-all transition-all hover:border-blue-400 dark:bg-black dark:text-white hover:text-white focus:outline-none dark:hover:text-white"
      @click="send_message"
    >
      Send
    </button>
  </div>
</template>
