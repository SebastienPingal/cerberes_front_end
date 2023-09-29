<script setup lang="ts">
const { modelValue } = defineModels<{
  modelValue: string
}>()
const conversation_store = useConversationStore()

function send_message() {
  if (modelValue.value) {
    conversation_store.send_message(modelValue.value)
    modelValue.value = ''
  }
}
</script>

<template>
  <textarea
    v-model="modelValue"
    v-bind="$attrs"
    class="w-full resize-none overflow-hidden border-2 border-blue-400 border-dashed bg-white p-2 text-blue-400 focus:border-solid dark:bg-black focus:outline-none"
    placeholder="Type a message..."
    @keydown.enter="send_message"
  />
  <button
    v-if="modelValue"
    class="rounded-md bg-white text-white transition-all dark:bg-black  dark:text-white hover:text-white focus:outline-none dark:hover:text-white box-content border-2 border-blue-900 hover:border-blue-400 p-2"
    @click="send_message"
  >
    Send
  </button>
</template>
