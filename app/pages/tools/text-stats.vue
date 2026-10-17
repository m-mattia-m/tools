<script setup lang="ts">
definePageMeta({
  title: 'Text Statistics',
  description: 'Count characters, words, lines, sentences and paragraphs, with reading time and top words.',
  icon: 'i-lucide-bar-chart-3',
  tags: ['text', 'analysis']
})

const input = ref('')

const stats = computed(() => {
  const t = input.value
  const words = t.match(/[\p{L}\p{N}'’-]+/gu) ?? []
  const lines = t ? t.split('\n') : []
  const freq = new Map<string, number>()
  for (const w of words) {
    const k = w.toLowerCase()
    if (k.length > 2) freq.set(k, (freq.get(k) ?? 0) + 1)
  }
  const top = [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 10)
  return {
    cards: [
      ['Characters', [...t].length],
      ['Characters (no spaces)', [...t.replace(/\s/g, '')].length],
      ['Words', words.length],
      ['Lines', lines.length],
      ['Sentences', (t.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?\s][^.!?]*$/g) ?? []).filter(s => s.trim()).length],
      ['Paragraphs', t.split(/\n\s*\n/).filter(p => p.trim()).length],
      ['Bytes (UTF-8)', new TextEncoder().encode(t).length]
    ] as [string, string | number][],
    top
  }
})
</script>

<template>
  <div class="space-y-6">
    <UCard>
      <UTextarea v-model="input" :rows="10" class="w-full" placeholder="Paste or type your text…" autofocus />
    </UCard>
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <UCard v-for="[label, value] in stats.cards" :key="label">
        <p class="text-sm text-muted">{{ label }}</p>
        <p class="text-2xl font-semibold tabular-nums">{{ value }}</p>
      </UCard>
    </div>
    <UCard v-if="stats.top.length">
      <template #header><h2 class="font-semibold">Most frequent words</h2></template>
      <div class="flex flex-wrap gap-2">
        <UBadge v-for="[w, n] in stats.top" :key="w" color="neutral" variant="subtle" size="lg">{{ w }} <span class="ml-1 text-muted">{{ n }}</span></UBadge>
      </div>
    </UCard>
  </div>
</template>
