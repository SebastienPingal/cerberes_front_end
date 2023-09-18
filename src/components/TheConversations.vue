<script setup lang="ts">
const user_store = useUserStore()
const display_store = useDisplayStore()
const user = computed(() => user_store.user)
</script>

<template>
  <div>
    <div>
      ICI LES CONVERSATIONS
      {{ user.conversations }}
    </div>
    <o-button @click="display_store.conversation_creator = true">
      Créer une conversation
    </o-button>
    <TheConversationCreator v-if="display_store.conversation_creator" />
  </div>
</template>
