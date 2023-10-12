<script setup lang="ts">
import Accordion from "primevue/accordion";
import AccordionTab from "primevue/accordiontab";

const on_mobile = ref(window.innerWidth < 768);

const display_store = useDisplayStore();
const conversation_store = useConversationStore();
const accordion_index = ref(1);

onMounted(() => {
  const updateOnMobile = () => {
    on_mobile.value = window.innerWidth < 768;
  };

  window.addEventListener("resize", updateOnMobile);

  onBeforeUnmount(() => {
    window.removeEventListener("resize", updateOnMobile);
  });
});
</script>

<template>
  <div>
    <div v-if="conversation_store.conversations.length" class="flex flex-col gap-2">
      <div flex flex-col gap-2>
        <Accordion class="w-full" v-model:activeIndex="accordion_index" v-if="on_mobile">
          <AccordionTab>
            <template #header>
              <TheConversation
                class="my-2 w-full"
                v-if="conversation_store.selected_conversation"
                :conversation="conversation_store.selected_conversation"
              />
              <div v-else class="w-full">
                <div class="btn-contact my-2">Select a conversation</div>
              </div>
            </template>
            <div @click="accordion_index = -1" class="flex flex-col gap-2">
              <TheConversation
                v-for="conversation in conversation_store.conversations"
                :key="conversation.Conversation_id"
                :conversation="conversation"
              />
            </div>
          </AccordionTab>
        </Accordion>
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
<style scoped lang="css">
:deep .p-accordion-header .p-accordion-toggle-icon {
  display: none;
}
</style>
