<script setup lang="ts">
defineEmits(['selectcontact'])

const user_store = useUserStore()
const user = computed(() => user_store.user)
const input_contact = ref('')

function add_contact() {
  user_store.add_contact(input_contact.value)
  input_contact.value = ''
}
</script>

<template>
  <div> my uuid: {{ user.User_contact_uuid }} </div>
  <input v-model="input_contact" @keypress.enter="add_contact">
  <div v-if="user.contact_list">
    <TheContact
      v-for="contact in user.contact_list" :key="contact.User_id" :contact="contact"
      @click="$emit('selectcontact', contact)"
    />
  </div>
  <div v-else>
    Pas de contact
  </div>
</template>
