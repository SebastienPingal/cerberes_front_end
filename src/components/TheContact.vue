<script setup lang="ts">
import type { IContact } from '../types'

const props = defineProps<{
  contact: IContact
}>()

const directory_store = useDirectoryStore()
const verified = computed(() => directory_store.is_verified(props.contact.Contact_User_id))
</script>

<template>
  <div class="flex items-center gap-1">
    {{ props.contact.User.User_name }}
    <o-icon v-if="verified" i-carbon-security class="h-4 w-4 text-green" title="Code de sécurité vérifié" />
  </div>
</template>
