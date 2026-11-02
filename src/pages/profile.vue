<script setup lang="ts">
import { OMessage } from 'onu-ui'
import type { IDevice } from '../types'
import { api, error_message } from '../api'
import { identity_fingerprint } from '../crypto/identity'

defineOptions({
  name: 'ProfilePage',
})
const user_store = useUserStore()
const device_store = useDeviceStore()
const user = computed(() => user_store.user)
const devices: Ref<IDevice[]> = ref([])

const fingerprint = computed(() => device_store.device ? identity_fingerprint(device_store.device.identity_public_key) : null)

function copy_uuid() {
  if (!user.value)
    return
  navigator.clipboard.writeText(user.value.User_contact_uuid)
  OMessage.success('Copied to clipboard')
}

async function load_devices() {
  try {
    const { data } = await api.get('/devices')
    devices.value = data as IDevice[]
  }
  catch (error) {
    console.error('Unable to load devices:', error_message(error))
  }
}

async function forget_device() {
  // eslint-disable-next-line no-alert
  if (!window.confirm('Effacer de ce navigateur vos clés, vos conversations et leur historique ? Il faudra votre phrase de récupération pour y utiliser à nouveau votre compte.'))
    return
  await device_store.forget_device()
  OMessage.success('Cet appareil a été effacé')
}

watch(() => device_store.status, (status) => {
  if (status === 'ready')
    load_devices()
}, { immediate: true })
</script>

<template>
  <div class="flex flex-col items-center gap-3">
    <h1 class="text-2xl">
      Profile
    </h1>
    <div v-if="user" class="flex flex-col items-center gap-4">
      <div>
        <div>{{ user.User_name }}</div>
        <div>{{ user.User_email }}</div>
      </div>

      <div>
        <div>Votre code contact</div>
        <div class="flex cursor-pointer text-sm text-blue hover:underline" @click="copy_uuid">
          {{ user.User_contact_uuid }}
          <o-icon i-carbon-copy class="h-1rem w-1rem" />
        </div>
      </div>

      <template v-if="device_store.status === 'ready'">
        <div>
          <div>Empreinte de votre identité</div>
          <div class="text-sm font-mono">
            {{ fingerprint }}
          </div>
        </div>

        <div class="w-full flex flex-col gap-1">
          <div>Vos appareils</div>
          <div v-for="registered in devices" :key="registered.Device_id" class="text-sm">
            {{ registered.Device_name }}
            <span class="opacity-50">— ajouté le {{ new Date(registered.createdAt).toLocaleDateString() }}</span>
            <span v-if="registered.Device_id === device_store.device?.Device_id" class="text-green"> (cet appareil)</span>
          </div>
        </div>

        <o-button type="error" light @click="forget_device">
          Effacer cet appareil de ce navigateur
        </o-button>
      </template>
      <TheDeviceSetup v-else-if="device_store.status !== 'unknown'" />
    </div>
  </div>
</template>

<route lang="yaml">
meta:
  layout: home
</route>
