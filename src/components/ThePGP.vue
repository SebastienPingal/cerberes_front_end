<script setup lang="ts">
const user_store = useUserStore()
const pgp_secret: string[] = user_store.user.PGP_SecretKeys
const display_generator = ref(false)
const display_importator = ref(false)
</script>

<template>
  <div>
    <div v-if="pgp_secret">
      <h1>PGP Secret</h1>
      <p>{{ pgp_secret }}</p>
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
      <ThePGPGenerator v-if="display_generator" />
      <ThePGPImportator v-if="display_importator" />
    </div>
  </div>
</template>
