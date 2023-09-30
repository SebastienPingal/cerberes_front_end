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
  <div class="border p-4 overflow-hidden rounded-md flex flex-col" style="height: calc(100vh - 200px)">
    <div v-if="conversation_store.selected_conversation" class="flex flex-col h-full">
      <div v-if="conversation_store.selected_conversation?.Messages" class="flex flex-col gap-4 overflow-auto mb-4"
        ref="message_container" style="flex: 1">
        <div class="px-10 flex flex-col gap-4">
          <TheMessage v-for="message in conversation_store.selected_conversation.Messages" :key="message.Message_id"
            :message="message" />
        </div>
      </div>
      <div v-else class="flex flex-col gap-2">
        <div class="">
          No messages yet, start a conversation!
        </div>
      </div>
      <TheInput class="w-full flex" />
    </div>
    <div v-else class="flex flex-col gap-2 striped-background h-full w-full items-center place-content-center">
      <div class="dark:bg-dark-9 w-fit p-8 bg-white rounded-xl text-xl">
        No conversation selected, select a conversation!
      </div>
    </div>
  </div>
</template>

<style scoped>
.striped-background {
  background: repeating-linear-gradient(45deg,
      transparent,
      transparent 10px,
      white 11px,
      white 1px);
  background-color: rgba(0, 0, 0, 0.1);
}
</style>
