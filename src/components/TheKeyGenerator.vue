<script setup lang="ts">
import { generate } from 'random-words'

const encryption_store = useEncryptionStore()
const indexedDb_store = useIndexedDBStore()
const user_store = useUserStore()
const prompt = ref('prompt')
const words: Ref<string[]> = ref([])

function generate12RandomWords() {
  words.value = generate(12)
}

async function generate_key() {
  await encryption_store.mnemonicToKeyPair(words.value.join(' '))
  await indexedDb_store.storeKeyPair()
  await user_store.update_public_keys()
}

onMounted(() => {
  generate12RandomWords()
})
</script>

<template>
  <div>
    <div v-if="prompt === 'init'" class="flex flex-col items-center gap-2">
      <p>
        Do you want to be able to retrieve your key from a set of words ?
      </p>
      <p class="text-xs">
        In both cases, you will be able to download your key as a file or to import it via a qr code.
      </p>
      <div class="flex gap-2">
        <o-button @click="prompt = 'words'">
          Yes
        </o-button>
        <o-button>
          No
        </o-button>
      </div>
    </div>
    <div v-if="prompt === 'words'" class="flex flex-col items-center gap-2">
      <p>
        Do you want to come up with your own words ?
      </p>
      <div class="flex gap-2">
        <o-button>
          Yes, I want to choose.
        </o-button>
        <o-button @click="prompt = 'random_words'">
          No, I want it random so it is more secure.
        </o-button>
      </div>
    </div>
    <div v-if="prompt === 'random_words'" class="flex flex-col items-center gap-2">
      <p>
        Here are your words. They represent your key.
      </p>
      <p class="text-xs">
        Carefully write them down on a piece of paper and keep it safe. <br> They will not be stored anywhere.
      </p>
      <p class="border rounded-lg p-1 text-blue">
        {{ words.join(' ') }}
      </p>
      <div class="flex gap-2">
        <o-button @click="generate12RandomWords">
          Change them
        </o-button>
        <o-button @click="generate_key(); prompt = 'show_pgp'">
          Accept them
        </o-button>
      </div>
    </div>
    <div v-if="prompt === 'show_pgp'" class="flex flex-col items-center gap-2">
      <p>
        Here is your PGP public key.
      </p>
      <p class="text-xs">
        {{ encryption_store.signing_keypair?.secretKey }}
      </p>
      <p>
        Here is your PGP private key.
      </p>
      <p class="text-xs">
        {{ encryption_store.signing_keypair?.publicKey }}
      </p>
    </div>
  </div>
</template>
