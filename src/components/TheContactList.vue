<script setup lang="ts">
defineEmits(['selectcontact'])

const user_store = useUserStore()
const user = computed(() => user_store.user)

const input_contact = ref('')
const display_add_contact = ref(false)

function add_contact() {
  user_store.add_contact(input_contact.value)
  input_contact.value = ''
}
</script>

<template>
  <div class="min-w-15rem flex flex-col gap-5">
    <div v-if="user.contact_list" class="flex flex-col gap-2">
      <o-button v-for="contact in user.contact_list" :key="contact.User_id" @click="$emit('selectcontact', contact)">
        <TheContact :contact="contact" />
      </o-button>
    </div>
    <div v-else>
      Pas de contact
    </div>
    <div v-if="display_add_contact" class="flex flex-col gap-1 border border-green p-2">
      <input v-model="input_contact" placeholder="Enter uuid here" class="pl-2" @keypress.enter="add_contact">
      <o-button @click="add_contact" type="success" light>
        Ajouter un contact
      </o-button>
    </div>
    <div v-else-if="user.contact_list.length">
      <o-button type="success" light class="text-xl" @click="display_add_contact = true">
        +
      </o-button>
    </div>
    <div v-else>
      <o-button type="success" light class="text-xl" @click="display_add_contact = true">
        Ajoutez votre premier contact
      </o-button>
    </div>
  </div>
</template>
