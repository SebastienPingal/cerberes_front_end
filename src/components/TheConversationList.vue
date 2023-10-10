<script setup lang="ts">
import { useQuasar } from "quasar";

const q = useQuasar();
const on_mobile = computed(() => q.screen.lt.sm);
const display_store = useDisplayStore();
const conversation_store = useConversationStore();
const contact_list_expended = ref(false);
</script>

<template>
  <div>
    <div v-if="conversation_store.conversations.length" class="flex flex-col gap-2">
      <div flex flex-col gap-2>
        <q-expansion-item v-if="on_mobile" v-model="contact_list_expended">
          <template v-slot:header>
            <TheConversation
              v-if="conversation_store.selected_conversation"
              :conversation="conversation_store.selected_conversation"
            />
            <div v-else>
              <div class="btn-contact">Select a conversation</div>
            </div>
          </template>
          <q-card>
            <q-card-section @click="contact_list_expended = false" class="flex flex-col gap-2">
              <TheConversation
                v-for="conversation in conversation_store.conversations"
                :key="conversation.Conversation_id"
                :conversation="conversation"
              />
            </q-card-section>
          </q-card>
        </q-expansion-item>
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
      class="max-h-screen max-w-15rem flex flex-col cursor-pointer place-items-center border border-1 rounded rounded-lg bg-white p-4 transition-all ease-in hover:scale-104 dark:bg-black hover:text-blue"
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
