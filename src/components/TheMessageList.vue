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
  <div class="border p-2">
    <div v-if="conversation_store.selected_conversation?.Messages" class="p-2 flex flex-col gap-4">
      <TheMessage
        v-for="message in conversation_store.selected_conversation.Messages" :key="message.Message_id"
        :message="message"
        class="px-10"
      />
      <TheInput />
    </div>
    <div v-else class="flex flex-col gap-2">
      <div class="">
        No messages yet, start a conversation!
      </div>
      <label class="flex flex-col gap-1" />
      <TheInput />
      <textarea
        ref="textarea" v-model="input"
        class="w-full resize-none overflow-hidden border-2 border-blue-400 border-dashed bg-white p-2 text-blue-400 focus:border-solid dark:bg-black focus:outline-none"
        placeholder="Type a message..."
        @keydown.enter="send_message"
      />
      <button
        v-if="input"
        class="rounded-md bg-white text-white transition-all dark:bg-black  dark:text-white hover:text-white focus:outline-none dark:hover:text-white box-content border-2 border-blue-900 hover:border-blue-400 p-2"
        @click="send_message"
      >
        Send
      </button>
    </div>
  </div>
</template>
