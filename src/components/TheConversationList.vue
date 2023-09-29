<script setup lang="ts">
const user_store = useUserStore()
const display_store = useDisplayStore()
const user = computed(() => user_store.user)
</script>

<template>
  <div>
    <div v-if="user.Conversations.length">
      <TheConversation v-for="conversation in user.Conversations" :key="conversation.Conversation_id" :conversation="conversation" />
    </div>
    <div
      v-else
      class="max-h-screen max-w-15rem flex flex-col cursor-pointer place-items-center border border-1 rounded rounded-lg bg-white p-4 transition-all ease-in hover:scale-104 dark:bg-black hover:text-blue"
      @click="display_store.conversation_creator = true"
    >
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
