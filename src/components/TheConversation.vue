<script setup lang="ts">
import type { IConversation } from '../types'

const props = defineProps<{
  conversation: IConversation
}>()
</script>

<template>
  <div>
    {{ props.conversation.Users }}
  </div>
</template>
