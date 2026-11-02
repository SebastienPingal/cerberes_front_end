<script setup lang="ts">
const directory_store = useDirectoryStore()
const changes = computed(() => Object.values(directory_store.changes))
</script>

<template>
  <div v-if="changes.length" class="flex flex-col gap-2">
    <div
      v-for="change in changes"
      :key="change.User_id"
      class="flex flex-col items-center gap-2 border border-red rounded-md p-3 text-left text-sm sm:flex-row"
    >
      <o-icon i-carbon-warning-alt class="h-6 w-6 shrink-0 text-red" />
      <div class="flex-1">
        <b>L'identité de {{ change.User_name }} a changé.</b>
        Soit cette personne a recréé son identité, soit le serveur essaie de se faire passer pour elle.
        Ses nouveaux appareils sont refusés tant que vous n'acceptez pas ce changement :
        demandez-lui de vive voix, puis comparez votre nouveau code de sécurité.
      </div>
      <o-button type="warning" light @click="directory_store.accept_change(change.User_id)">
        Accepter la nouvelle identité
      </o-button>
    </div>
  </div>
</template>
