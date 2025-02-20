<script setup lang="ts">
// import { availableLocales, loadLanguageAsync } from '~/modules/i18n'

// async function toggleLocales() {
//   // change to some real logic
//   const locales = availableLocales
//   const newLocale = locales[(locales.indexOf(locale.value) + 1) % locales.length]
//   await loadLanguageAsync(newLocale)
//   locale.value = newLocale
// }
</script>

<template>
  <nav flex="~ gap-4" mt-6 justify-center text-xl>
    <RouterLink icon-btn to="/" title="home">
      <div i-carbon-campsite />
    </RouterLink>

    <button icon-btn @click="toggleDark()">
      <div i="carbon-sun dark:carbon-moon" />
    </button>

    <!-- <a icon-btn :title="t('button.toggle_langs')" @click="toggleLocales()">
      <div i-carbon-language />
    </a> -->

    <a icon-btn rel="noreferrer" href="https://github.com/SebastienPingal/cerberes_front_end" target="_blank" title="GitHub">
      <div i-carbon-logo-github />
    </a>
  </nav>
</template>
