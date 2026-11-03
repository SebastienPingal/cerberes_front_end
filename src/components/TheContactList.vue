<script setup lang="ts">
import { OMessage } from 'onu-ui'
import type { IPublicUser } from '../types'

defineEmits(['selectcontact'])

const user_store = useUserStore()
const user = computed(() => user_store.user)

const input_contact = ref('')
const display_add_contact = ref(false)
const verifying: Ref<IPublicUser | null> = ref(null)
const adding = ref(false)

async function add_contact() {
  if (adding.value)
    return
  adding.value = true
  try {
    await user_store.add_contact(input_contact.value.trim())
    input_contact.value = ''
  }
  catch (error) {
    OMessage({ content: (error as Error).message, type: 'warning' })
  }
  adding.value = false
}
</script>

<template>
  <div class="min-w-15rem flex flex-col gap-5">
    <div v-if="user?.contact_list.length" class="flex flex-col gap-2">
      <div v-for="contact in user.contact_list" :key="contact.Contact_id" class="flex gap-1">
        <o-button class="flex-1" @click="$emit('selectcontact', contact)">
          <TheContact :contact="contact" />
        </o-button>
        <o-button light title="Vérifier le code de sécurité" @click="verifying = contact.User">
          <o-icon i-carbon-fingerprint-recognition class="h-4 w-4" />
        </o-button>
      </div>
    </div>
    <div v-else>
      Pas de contact
    </div>
    <div v-if="display_add_contact" class="flex flex-col gap-1 border border-green p-2">
      <input v-model="input_contact" placeholder="Code contact" class="pl-2" @keypress.enter="add_contact">
      <o-button type="success" light @click="add_contact">
        Ajouter un contact
      </o-button>
    </div>
    <div v-else>
      <o-button type="success" light class="text-xl" @click="display_add_contact = true">
        {{ user?.contact_list.length ? '+' : 'Ajoutez votre premier contact' }}
      </o-button>
    </div>
    <TheSafetyNumber v-if="verifying" :contact="verifying" @close="verifying = null" />
  </div>
</template>
