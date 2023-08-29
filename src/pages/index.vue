<script setup lang="ts">
defineOptions({
  name: 'IndexPage',
})
const user = useUserStore()
const name = ref(user.savedName)

const router = useRouter()
function go() {
  if (name.value)
    router.push(`/hi/${encodeURIComponent(name.value)}`)
}

const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col items-center gap-3">
    <div text-4xl>
      <div i-carbon-campsite inline-block />
    </div>
    <p>
      <a rel="noreferrer" href="https://github.com/sebastienpingal/cerberes_front_end" target="_blank">
        Cerberes
      </a>
    </p>
    <TheLogin />
    <TheRegister />
    <TheInput v-model="name" :placeholder="t('intro.whats-your-name')" autocomplete="false" @keydown.enter="go" />
    <label class="hidden" for="input">{{ t('intro.whats-your-name') }}</label>

    <div>
      <button m-3 text-sm btn :disabled="!name" @click="go">
        {{ t('button.go') }}
      </button>
    </div>
  </div>
</template>

<route lang="yaml">
meta:
  layout: home
</route>
