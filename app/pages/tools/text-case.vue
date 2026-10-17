<script setup lang="ts">
definePageMeta({
  title: 'Text Case Converter',
  description: 'Convert text to lower, upper, camel, Pascal, Capital, snake, CONSTANT, kebab and more.',
  icon: 'i-lucide-case-sensitive',
  tags: ['text', 'converter', 'dev']
})

const input = ref('The quick brown fox jumps over the lazy dog')

function words(line: string) {
  return line.replace(/([a-z0-9])([A-Z])/g, '$1 $2').match(/[\p{L}\p{N}]+/gu) ?? []
}
const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()

const conversions: { label: string, fn: (line: string) => string }[] = [
  { label: 'lowercase', fn: l => l.toLowerCase() },
  { label: 'UPPERCASE', fn: l => l.toUpperCase() },
  { label: 'camelCase', fn: l => words(l).map((w, i) => (i ? cap(w) : w.toLowerCase())).join('') },
  { label: 'PascalCase', fn: l => words(l).map(cap).join('') },
  { label: 'Capital Case', fn: l => words(l).map(cap).join(' ') },
  { label: 'Sentence case', fn: l => { const s = words(l).join(' ').toLowerCase(); return s.charAt(0).toUpperCase() + s.slice(1) } },
  { label: 'snake_case', fn: l => words(l).map(w => w.toLowerCase()).join('_') },
  { label: 'CONSTANT_CASE', fn: l => words(l).map(w => w.toUpperCase()).join('_') },
  { label: 'kebab-case', fn: l => words(l).map(w => w.toLowerCase()).join('-') },
  { label: 'dot.case', fn: l => words(l).map(w => w.toLowerCase()).join('.') }
]

const results = computed(() =>
  conversions.map(c => ({ label: c.label, text: input.value.split('\n').map(c.fn).join('\n') }))
)
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-6">
    <UCard>
      <UTextarea v-model="input" :rows="4" class="w-full" placeholder="Type or paste text…" />
    </UCard>
    <div class="grid gap-4 sm:grid-cols-2">
      <CodeBox v-for="r in results" :key="r.label" :text="r.text" :title="r.label" />
    </div>
  </div>
</template>
