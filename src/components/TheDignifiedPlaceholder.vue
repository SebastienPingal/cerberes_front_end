<template>
  <div ref="placeholder" class="placeholder">
    <div class="text">{{ content }}</div>
    <div class="mask" :style="{ left: `${adjusted_x}px`, top: `${adjusted_y}px` }"></div>
  </div>
</template>

<script setup lang="ts">
const placeholder = ref<HTMLElement | null>(null)
const content = ref('')

const { x, y } = useMouse()

const adjusted_x = computed(() => {
  if (placeholder.value)
    return x.value - placeholder.value.getBoundingClientRect().left
})
const adjusted_y = computed(() => {
  if (placeholder.value)
    return y.value - placeholder.value.getBoundingClientRect().top
});

//watch x or y
watchDebounced([x, y], () => {
  generate_random_string()
}, { debounce: 10 })

function generate_random_string() {
  if (!placeholder.value) return
  const width = placeholder.value.offsetWidth
  const height = placeholder.value.offsetHeight

  const size = Math.floor(width * height / 20)

  content.value = Array(size).fill(0).map(() => {
    let charCode = Math.floor(Math.random() * 93 + 33)
    // Exclude <, >, &, form feed character, ., ?, -, [, ], {, }, (, ), /, \, *, +, =, ^, $, @, #, %, !, `, ~, |, :, ;, _, ", and ,
    while ([60, 62, 38, 12, 46, 63, 45, 91, 93, 123, 125, 40, 41, 47, 92, 42, 43, 61, 94, 36, 64, 35, 37, 33, 96, 126, 124, 58, 59, 95, 34, 44].includes(charCode)) {
      charCode = Math.floor(Math.random() * 93 + 33)
    }
    return String.fromCharCode(charCode)
  }).join('')
}
onMounted(() => {
  generate_random_string()
})
</script>

<style scoped>
.placeholder {
  font-family: monospace;
  word-wrap: break-word;
  overflow: hidden;
  line-height: 1em;
  font-size: 20px;
  -webkit-mask-image: radial-gradient(black, transparent);
  mask-image: radial-gradient(black, transparent);
}

</style>
