<script setup lang="ts">
const on_mobile = ref(window.innerWidth < 768)

const display_store = useDisplayStore()
const display_drawer = ref(false)
const conversation_store = useConversationStore()

onMounted(() => {
  const updateOnMobile = () => {
    on_mobile.value = window.innerWidth < 768
  }

  window.addEventListener('resize', updateOnMobile)

  onBeforeUnmount(() => {
    window.removeEventListener('resize', updateOnMobile)
  })
})
</script>

<template>
  <div>
    <div v-if="conversation_store.conversations.length" class="flex flex-col gap-2">
      <div flex flex-col gap-2>
        <div v-if="on_mobile" class="w-full transition-all">
          <div @click="display_drawer = !display_drawer">
            <TheConversation
              v-if="conversation_store.selected_conversation"
              class="my-2 w-full"
              :conversation="conversation_store.selected_conversation"
            />
            <div v-else class="w-full">
              <div class="my-2 btn-contact">Select a conversation</div>
            </div>
          </div>
          <div v-if="display_drawer" class="transition-all">
            <div class="flex flex-col gap-2" @click="display_drawer = false">
              <TheConversation
                v-for="conversation in conversation_store.conversations"
                :key="conversation.Conversation_id"
                :conversation="conversation"
              />
            </div>
          </div>
        </div>
        <div v-else class="flex flex-col gap-2">
          <TheConversation
            v-for="conversation in conversation_store.conversations"
            :key="conversation.Conversation_id"
            :conversation="conversation"
          />
        </div>
        <o-button @click="display_store.conversation_creator = true">
          Créer une conversation
        </o-button>
      </div>
      <div class="flex flex-col gap-2">
        <o-button @click="conversation_store.get_all_new_messages"> Rafraichir </o-button>
      </div>
    </div>
    <div
      v-else
      class="max-h-screen max-w-15rem flex flex-col cursor-pointer place-items-center border border-1 rounded rounded-lg bg-white p-4 transition-all ease-in hover:scale-104 dark:bg-black"
      @click="display_store.conversation_creator = true"
    >
      <div class="text-lg">Créez votre première conversation</div>
      <div>
        <o-icon i-carbon-add class="h-4rem w-4rem" />
      </div>
    </div>
    <TheConversationCreator v-if="display_store.conversation_creator" />
  </div>
</template>

<style scoped lang="css">
:deep .p-accordion-header .p-accordion-toggle-icon {
  display: none;
}
</style>
