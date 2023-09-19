<script setup lang="ts">
import type { IContact } from '../types'

const display_store = useDisplayStore()
const user_store = useUserStore()
const error_message = ref('')

async function create_conversation_with(contact: IContact) {
  error_message.value = ''
  const members_id = [contact.Contact_User_id]
  try {
    await user_store.create_conversation(members_id)
  }
  catch (error) {
    const typed_error = error as string
    error_message.value = typed_error
    return
  }
  display_store.conversation_creator = false
}
</script>

<template>
  <div class="fixed left-0 top-0 z-10 h-full w-full bg-black bg-opacity-50 backdrop-blur" />
  <div class="fixed top-1/3 z-10 border border-1 rounded bg-white p-4 dark:bg-black">
    <o-button
      class="mb-3 w-fit flex place-self-end rounded-full px-2 py-1" type="info" light
      @click="display_store.conversation_creator = false"
    >
      <div i-carbon-close-large />
    </o-button>
    <div class="flex flex-col gap-5">
      <h4 class="text-xl">
        With who ?
      </h4>
      <TheContactList @selectcontact="create_conversation_with" />
      <div v-if="error_message" class="text-red">
        {{ error_message }}
      </div>
    </div>
  </div>
</template>
