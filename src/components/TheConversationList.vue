<script setup lang="ts">
const display_store = useDisplayStore()
const conversation_store = useConversationStore()
</script>

<template>
  <div>
    <div v-if="conversation_store.conversations.length" class="flex flex-col gap-2 w-80">
      <TheConversation v-for="conversation in conversation_store.conversations" :key="conversation.Conversation_id"
        :conversation="conversation" />
      <div class="flex flex-col gap-2">
        <o-button @click="display_store.conversation_creator = true">
          Créer une conversation
        </o-button>
        <o-button @click="conversation_store.get_all_new_messages">
          Rafraichir
        </o-button>
      </div>
    </div>
    <div v-else
      class="max-h-screen max-w-15rem flex flex-col cursor-pointer place-items-center border border-1 rounded rounded-lg bg-white p-4 transition-all ease-in hover:scale-104 dark:bg-black hover:text-blue"
      @click="display_store.conversation_creator = true">
      <div class="text-lg">
        Créez votre première conversation
      </div>
      <div>
        <o-icon i-carbon-add class="h-4rem w-4rem" />
      </div>
    </div>
    <TheConversationCreator v-if="display_store.conversation_creator" />
  </div>
</template>
