<script setup lang="ts">
import crypto from 'crypto-js'
import { generate } from 'random-words'

const prompt = ref('init')
const words: Ref<string[]> = ref([])

function generate12RandomWords() {
  words.value = generate(12)
}

const my_public_key = ref('')
const my_private_key = ref('')

function generateKeyPairFromMnemonic(mnemonic: string): crypto.KeyPairSyncResult<crypto.KeyObject> {
  const seed = crypto.createHash('sha256').update(mnemonic).digest()

  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 4096,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
      cipher: 'aes-256-cbc',
      passphrase: '', // Add your passphrase here if needed
    },
    passphrase: '', // Add your passphrase here if needed
    seed,
  })

  my_public_key.value = publicKey
  my_private_key.value = privateKey
  return { publicKey, privateKey }
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
        Here are your words.
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
        <o-button @click="generateKeyPairFromMnemonic(words.join(' ')); prompt = 'show_pgp'">
          Accept them
        </o-button>
      </div>
      <div v-if="prompt === 'show_pgp'" class="flex flex-col items-center gap-2">
        <p>
          Here is your PGP public key.
        </p>
        <p class="text-xs">
          {{ my_public_key }}
        </p>
        <p>
          Here is your PGP private key.
        </p>
        <p class="text-xs">
          {{ my_private_key }}
        </p>
      </div>
    </div>
  </div>
</template>
