<script setup lang="ts">
const encryption_store = useEncryptionStore()
const display_generator = ref(false)
const display_importator = ref(false)
const signing_keypair = computed(() => encryption_store.signing_keypair)
const encryption_keypair = computed(() => encryption_store.encryption_keypair)
const lorem_ipsum = ref('Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec euismod, nisl eget ultricies ultricies, nisl nisl ultricies nisl, nec ult')
const encrypted_lorem_ipsum = ref(null) as Ref<{ nonce: Uint8Array; encryptedMessage: Uint8Array } | null>
const decrypted_lorem_ipsum = ref(null) as Ref<string | null>

function encrypt_lorem_ipsum() {
  if (encryption_keypair?.value?.publicKey) {
    const bob_encryption_keypair = encryption_store.generateEncryptionKeyPair()

    encrypted_lorem_ipsum.value = encryption_store.encryptMessage(
      lorem_ipsum.value,
      bob_encryption_keypair.publicKey,
      encryption_keypair.value.secretKey,
    )

    decrypted_lorem_ipsum.value = encryption_store.decryptMessage(
      encrypted_lorem_ipsum.value,
      encryption_keypair.value.publicKey,
      bob_encryption_keypair.secretKey,
    )
  }
}
</script>

<template>
  <div>
    <div v-if="signing_keypair?.secretKey">
      <h1>PGP Secret</h1>
      <p>You have a key</p>
      <p>{{ signing_keypair.secretKey }}</p>
      <p>{{ lorem_ipsum }}</p>
      <o-button @click="encrypt_lorem_ipsum">
        Encrypt
      </o-button>
      <p v-if="encrypted_lorem_ipsum" class="text-red">
        {{ encrypted_lorem_ipsum }}
      </p>
      <p v-if="decrypted_lorem_ipsum" class="text-blue">
        {{ decrypted_lorem_ipsum }}
      </p>
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
