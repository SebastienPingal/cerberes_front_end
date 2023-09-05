<script setup lang="ts">
const encryption_store = useEncryptionStore()
const display_generator = ref(false)
const display_importator = ref(false)
const keypair = computed(() => encryption_store.keypair)
</script>

<template>
  <div>
    <div v-if="keypair?.secretKey">
      <h1>PGP Secret</h1>
      <p>You have a key</p>
      <p>{{ keypair.secretKey }}</p>
    </div>
    <div v-else class="flex flex-col gap-2">
      <div v-if="!display_generator && !display_importator">
        <p>You don't have any key yet.</p>
        <div class="flex justify-around gap-3">
          <o-button @click="display_generator = true">
            Generate it
          </o-button>
          <o-button @click="display_importator = false">
            Import it
          </o-button>
        </div>
      </div>
      <div v-else class="flex justify-center">
        <o-button @click="display_generator = false; display_importator = false">
          Change your mind
        </o-button>
      </div>
      <TheKeyGenerator v-if="display_generator" />
      <TheKeyImportator v-if="display_importator" />
    </div>
  </div>
</template>
