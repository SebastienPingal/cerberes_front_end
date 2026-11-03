<script setup lang="ts">
import type { IContact } from '../types'

const display_store = useDisplayStore()
const conversation_store = useConversationStore()
const error_message = ref('')
const creating = ref(false)

async function create_conversation_with(contact: IContact) {
  // onu-ui buttons can fire their click handler twice: never create two groups
  if (creating.value)
    return
  error_message.value = ''
  creating.value = true
  try {
    await conversation_store.create_conversation([contact.User])
    display_store.conversation_creator = false
  }
  catch (error) {
    error_message.value = (error as Error).message
  }
  creating.value = false
}
</script>

<template>
  <div class="fixed left-0 top-0 z-20 h-full w-full bg-black bg-opacity-50 backdrop-blur" />
  <div
    class="fixed left-1/2 top-1/2 z-20 w-100 transform border border-1 rounded-md bg-white p-4 -translate-x-1/2 -translate-y-1/2 dark:bg-black"
  >
    <div class="flex place-content-end">
      <o-button
        class="mb-3 flex items-center rounded-full p-0" type="info" light
        @click="display_store.conversation_creator = false"
      >
        <o-icon i-carbon-close class="h-7 w-7" />
      </o-button>
    </div>
    <div class="flex flex-col gap-5">
      <h4 class="text-xl">
        Avec qui ?
      </h4>
      <div v-if="creating" class="opacity-50">
        Création du groupe chiffré…
      </div>
      <TheContactList v-else @selectcontact="create_conversation_with" />
      <div v-if="error_message" class="text-red">
        {{ error_message }}
      </div>
    </div>
  </div>
</template>
