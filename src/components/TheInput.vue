<script setup lang="ts">
const { textarea, input } = useTextareaAutosize()
const conversation_store = useConversationStore()

function send_message() {
  if (input.value) {
    conversation_store.send_message(input.value)
    input.value = ''
  }
}
</script>

<template>
  <div class="w-full flex gap-4">
    <textarea ref="textarea" v-model="input" v-bind="$attrs"
      class="placeholder-blue-900 resize-none overflow-hidden border-2 border-blue-400 border-dashed bg-white p-2 text-blue-400 focus:border-solid dark:bg-dark-9 focus:outline-none transition-all rounded-md"
      placeholder="Type a message..." @keydown.enter="send_message" />
    <button v-if="input"
      class="rounded-md bg-white text-white transition-all dark:bg-black  dark:text-white hover:text-white focus:outline-none dark:hover:text-white box-content border-2 border-blue-900 hover:border-blue-400 transition-all p-2"
      @click="send_message">
      Send
    </button>
  </div>
</template>
