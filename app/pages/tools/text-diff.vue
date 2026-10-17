<script setup lang="ts">
import { diffChars, diffLines, diffWords } from 'diff'

definePageMeta({
  title: 'Text Diff',
  description: 'Compare two texts line by line, word by word or character by character.',
  icon: 'i-lucide-diff',
  tags: ['text', 'diff']
})

const left = ref('The quick brown fox\njumps over\nthe lazy dog')
const right = ref('The quick red fox\njumps over\nthe very lazy dog\nand runs away')
const mode = ref<'lines' | 'words' | 'chars'>('lines')
const ignoreCase = ref(false)
const ignoreWhitespace = ref(false)

const modeItems = [
  { label: 'Lines', value: 'lines' },
  { label: 'Words', value: 'words' },
  { label: 'Characters', value: 'chars' }
]

const parts = computed(() => {
  const opts = { ignoreCase: ignoreCase.value, ignoreWhitespace: ignoreWhitespace.value }
  if (mode.value === 'lines') return diffLines(left.value, right.value, opts)
  if (mode.value === 'words') return diffWords(left.value, right.value, { ignoreCase: ignoreCase.value })
  return diffChars(left.value, right.value, { ignoreCase: ignoreCase.value })
})

const stats = computed(() => {
  let added = 0, removed = 0
  for (const p of parts.value) {
    const n = mode.value === 'lines' ? (p.count ?? 0) : p.value.length
    if (p.added) added += n
    else if (p.removed) removed += n
  }
  return { added, removed, unit: mode.value === 'lines' ? 'lines' : mode.value === 'words' ? 'chars' : 'chars' }
})
</script>

<template>
  <div class="space-y-6">
    <div class="grid gap-4 lg:grid-cols-2">
      <UCard>
        <template #header><h2 class="font-semibold">Original</h2></template>
        <UTextarea v-model="left" :rows="10" class="w-full" :ui="{ base: 'font-mono text-sm' }" />
      </UCard>
      <UCard>
        <template #header><h2 class="font-semibold">Modified</h2></template>
        <UTextarea v-model="right" :rows="10" class="w-full" :ui="{ base: 'font-mono text-sm' }" />
      </UCard>
    </div>

    <div class="flex flex-wrap items-center gap-4">
      <UTabs v-model="mode" :items="modeItems" :content="false" class="w-72" />
      <USwitch v-model="ignoreCase" label="Ignore case" />
      <USwitch v-if="mode !== 'chars'" v-model="ignoreWhitespace" label="Ignore whitespace" :disabled="mode === 'words'" />
      <span class="ml-auto text-sm">
        <span class="text-success">+{{ stats.added }}</span>
        <span class="mx-1 text-muted">/</span>
        <span class="text-error">−{{ stats.removed }}</span>
        <span class="ml-1 text-muted">{{ stats.unit }}</span>
      </span>
    </div>

    <UCard>
      <pre class="overflow-x-auto whitespace-pre-wrap break-words font-mono text-sm leading-6"><template v-for="(p, i) in parts" :key="i"><span
        :class="[
          p.added ? 'bg-success/15 text-success' : p.removed ? 'bg-error/15 text-error line-through decoration-error/40' : '',
          mode === 'lines' ? 'block' : ''
        ]"
      >{{ mode === 'lines' ? p.value.replace(/\n$/, '') : p.value }}</span></template></pre>
    </UCard>
  </div>
</template>
