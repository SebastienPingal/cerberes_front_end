<script setup lang="ts">
const user_store = useUserStore()
const user = computed(() => user_store.user)
const display_conversation_creator = ref(false)
</script>

<template>
  <div class="text-blue">
    <div>
      ICI LES CONVERSATIONS
      {{ user.conversations }}
    </div>
    <o-button @click="display_conversation_creator">
      Créer une conversation
    </o-button>
    <div v-if="display_conversation_creator">
      <TheConversationCreator />
    </div>
  </div>
</template>
