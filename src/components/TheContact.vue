<script setup lang="ts">
import type { IContact } from '../types'

const props = defineProps<{
  contact: IContact
}>()
</script>

<template>
  <div>
    {{ props.contact.User.User_name }}
  </div>
</template>
