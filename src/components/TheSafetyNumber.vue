<script setup lang="ts">
import type { IPublicUser } from '../types'

const props = defineProps<{
  contact: IPublicUser
}>()
defineEmits(['close'])

const directory_store = useDirectoryStore()
const number = computed(() => directory_store.safety_number_with(props.contact.User_id))
const verified = computed(() => directory_store.is_verified(props.contact.User_id))
</script>

<template>
  <div class="fixed left-0 top-0 z-30 h-full w-full bg-black bg-opacity-50 backdrop-blur" @click="$emit('close')" />
  <div class="fixed left-1/2 top-1/2 z-30 w-100 flex flex-col transform gap-3 border rounded-md bg-white p-4 -translate-x-1/2 -translate-y-1/2 dark:bg-black">
    <h4 class="text-lg">
      Code de sécurité avec {{ props.contact.User_name }}
    </h4>
    <template v-if="number">
      <p class="text-sm">
        Comparez ce code avec celui affiché chez {{ props.contact.User_name }}, en personne ou lors d'un appel.
        S'il est identique, personne, pas même le serveur, ne peut lire vos messages à sa place.
      </p>
      <div class="border rounded-lg p-3 text-xl font-mono tracking-wider">
        {{ number }}
      </div>
      <div v-if="verified" class="text-green">
        Vérifié
      </div>
      <o-button v-else type="success" @click="directory_store.mark_verified(props.contact.User_id)">
        Les codes sont identiques
      </o-button>
    </template>
    <p v-else class="text-sm">
      {{ props.contact.User_name }} n'a pas encore configuré son identité.
    </p>
    <o-button light @click="$emit('close')">
      Fermer
    </o-button>
  </div>
</template>
