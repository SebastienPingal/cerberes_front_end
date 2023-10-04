<script setup lang="ts">
import type { IContact } from '../types'

const user_store = useUserStore()
const user = computed(() => user_store.user)
const display_store = useDisplayStore()
const conversation_store = useConversationStore()
const error_message = ref('')

async function create_conversation_with(contact: IContact) {
  error_message.value = ''
  const foundContact = user.value.contact_list.find((c: IContact) => c.Contact_User_id === contact.Contact_User_id);
  const member = [foundContact.User];
  conversation_store.create_conversation(member);

  display_store.conversation_creator = false
}
</script>

<template>
  <div class="fixed left-0 top-0 z-20 h-full w-full bg-black bg-opacity-50 backdrop-blur" />
  <div
    class="fixed top-1/2 left-1/2 w-100 transform -translate-x-1/2 -translate-y-1/2 z-20 border border-1 rounded-md bg-white p-4 dark:bg-black">
    <div class="flex place-content-end">
      <o-button class="mb-3 items-center flex rounded-full p-0" type="info" light
        @click="display_store.conversation_creator = false">
        <o-icon i-carbon-close class="h-7 w-7" />
      </o-button>
    </div>
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
