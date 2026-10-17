<script setup lang="ts">
import katex from 'katex'
import 'katex/dist/katex.min.css'

const props = withDefaults(defineProps<{ tex: string, display?: boolean }>(), { display: true })

const html = computed(() =>
  katex.renderToString(props.tex, {
    displayMode: props.display,
    throwOnError: false
  })
)
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <span v-html="html" />
</template>
