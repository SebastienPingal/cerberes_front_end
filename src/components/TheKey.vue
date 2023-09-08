<script setup lang="ts">
const encryption_store = useEncryptionStore()
const utils_store = useUtilsStore()
const display_generator = ref(false)
const display_importator = ref(false)

const signing_keypair = computed(() => encryption_store.signing_keypair)
const encryption_keypair = computed(() => encryption_store.encryption_keypair)
</script>

<template>
  <div>
    <div v-if="signing_keypair?.secretKey && encryption_keypair?.secretKey" class="w-20rem">
      <p>You have a key</p>
      <div class="flex justify-around gap-3">
        <o-button @click="utils_store.download_keys">
          Export it
        </o-button>
      </div>
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
