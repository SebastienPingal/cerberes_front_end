<script setup lang="ts">
import { OMessage } from 'onu-ui'
import { generate_phrase, is_valid_phrase } from '../crypto/identity'

const device_store = useDeviceStore()

// First device: show a new phrase, then make the user prove they wrote it down
const phrase = ref('')
const step: Ref<'show' | 'confirm'> = ref('show')
const challenge: Ref<number[]> = ref([])
const answers: Ref<string[]> = ref([])

// New device: the user types the phrase of their account
const entered_phrase = ref('')

const loading = ref(false)
const words = computed(() => phrase.value.split(' '))

function new_phrase() {
  phrase.value = generate_phrase()
  step.value = 'show'
}

function ask_confirmation() {
  const positions = new Set<number>()
  const random = new Uint32Array(1)
  while (positions.size < 3) {
    crypto.getRandomValues(random)
    positions.add(random[0] % words.value.length)
  }
  challenge.value = [...positions].sort((a, b) => a - b)
  answers.value = challenge.value.map(() => '')
  step.value = 'confirm'
}

async function run(action: () => Promise<void>) {
  loading.value = true
  try {
    await action()
  }
  catch (error) {
    OMessage({ content: (error as Error).message, type: 'warning' })
  }
  loading.value = false
}

function confirm_and_create() {
  const valid = challenge.value.every((position, index) => answers.value[index].trim().toLowerCase() === words.value[position])
  if (!valid) {
    OMessage({ content: 'Les mots ne correspondent pas, vérifiez votre phrase', type: 'warning' })
    return
  }
  run(async () => {
    await device_store.setup_identity(phrase.value)
    phrase.value = ''
  })
}

function link_device() {
  if (!is_valid_phrase(entered_phrase.value)) {
    OMessage({ content: 'Cette phrase n\'est pas valide', type: 'warning' })
    return
  }
  run(async () => {
    await device_store.link_device(entered_phrase.value)
    entered_phrase.value = ''
  })
}

onMounted(() => {
  if (device_store.status === 'needs_identity')
    new_phrase()
})
</script>

<template>
  <div class="mx-auto max-w-xl flex flex-col items-center gap-4">
    <template v-if="device_store.status === 'needs_identity'">
      <h2 class="text-xl">
        Votre phrase de récupération
      </h2>
      <template v-if="step === 'show'">
        <p class="text-sm">
          Ces 12 mots sont votre identité : ils servent à ajouter un nouvel appareil à votre compte.
          Écrivez-les sur papier et gardez-les en lieu sûr. Ils ne sont enregistrés nulle part,
          ni sur le serveur ni dans ce navigateur : sans eux, personne ne peut les retrouver.
        </p>
        <ol class="grid grid-cols-3 gap-2 border rounded-lg p-3 text-blue">
          <li v-for="(word, index) in words" :key="index" class="text-left">
            <span class="text-xs opacity-50">{{ index + 1 }}.</span> {{ word }}
          </li>
        </ol>
        <div class="flex gap-2">
          <o-button @click="new_phrase">
            Autres mots
          </o-button>
          <o-button type="success" @click="ask_confirmation">
            Je les ai notés
          </o-button>
        </div>
      </template>
      <div v-else class="flex flex-col items-center gap-2" @keydown.enter="confirm_and_create">
        <p class="text-sm">
          Pour vérifier, entrez les mots demandés.
        </p>
        <label v-for="(position, index) in challenge" :key="position" class="flex items-center gap-2">
          Mot n°{{ position + 1 }}
          <input v-model="answers[index]" class="rounded p-1" autocomplete="off" autocapitalize="none">
        </label>
        <div class="flex gap-2">
          <o-button @click="step = 'show'">
            Revoir les mots
          </o-button>
          <o-button type="success" :loading="loading" @click="confirm_and_create">
            Créer mon identité
          </o-button>
        </div>
      </div>
    </template>

    <div v-else-if="device_store.status === 'needs_device'" class="flex flex-col items-center gap-3">
      <h2 class="text-xl">
        Nouvel appareil
      </h2>
      <p class="text-sm">
        Ce navigateur n'a pas encore de clés pour votre compte.
        Entrez votre phrase de récupération de 12 mots pour l'ajouter à vos appareils.
        Vos conversations l'accueilleront dès qu'un de leurs membres sera en ligne ;
        les messages plus anciens restent sur vos autres appareils.
      </p>
      <textarea
        v-model="entered_phrase"
        class="w-full rounded p-2"
        rows="3"
        autocomplete="off"
        autocapitalize="none"
        spellcheck="false"
        placeholder="mot1 mot2 mot3 …"
      />
      <o-button type="success" :loading="loading" @click="link_device">
        Ajouter cet appareil
      </o-button>
    </div>
  </div>
</template>
