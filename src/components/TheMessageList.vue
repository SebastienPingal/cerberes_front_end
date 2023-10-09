<script setup lang="ts">
const conversation_store = useConversationStore()
const message_container = ref<HTMLDivElement | null>(null)

watch(() => conversation_store.selected_conversation?.Messages, async () => {
  await nextTick()
  // Add a small delay before scrolling
  setTimeout(() => {
    if (message_container.value)
      message_container.value.scrollTop = message_container.value.scrollHeight
  }, 100)
}, { immediate: true })

onMounted(async () => {
  await nextTick()
  // Add a small delay before scrolling
  setTimeout(() => {
    if (message_container.value)
      message_container.value.scrollTop = message_container.value.scrollHeight
  }, 100)
})
</script>

<template>
  <div class="flex flex-col overflow-hidden border rounded-md p-4" style="height: calc(100vh - 200px)">
    <div v-if="conversation_store.selected_conversation" class="h-full flex flex-col">
      <div
        v-if="conversation_store.selected_conversation?.Messages" ref="message_container"
        class="mb-4 flex flex-col gap-4 overflow-auto" style="flex: 1"
      >
        <div class="flex flex-col gap-4 px-10">
          <TheMessage
            v-for="message in conversation_store.selected_conversation.Messages" :key="message.Message_id"
            :message="message"
          />
        </div>
      </div>
      <div v-else class="flex flex-col gap-2">
        <div class="">
          No messages yet, start a conversation!
        </div>
      </div>
      <TheInput class="w-full flex" />
    </div>
    <div v-else class="relative h-full w-full flex flex-col place-content-center items-center gap-2">
      <div class="z-10 w-fit rounded-xl bg-white p-8 text-xl dark:bg-dark-9">
        No conversation selected, select a conversation!
      </div>
      <TheDignifiedPlaceholder class="absolute bottom-0 left-0 right-0 top-0 text-white" />
    </div>
  </div>
</template>
