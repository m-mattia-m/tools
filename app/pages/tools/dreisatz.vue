<script setup lang="ts">
definePageMeta({
  title: '3-Satz-Rechner',
  description: 'Dreisatz: solve proportional and inversely proportional rule-of-three problems.',
  icon: 'i-lucide-divide',
  tags: ['math', 'calculator']
})

const mode = ref<'direct' | 'inverse'>('direct')
const modeItems = [
  { label: 'Proportional', value: 'direct' },
  { label: 'Antiproportional', value: 'inverse' }
]
const a = ref('5')
const b = ref('10')
const c = ref('8')
const labelA = ref('Äpfel')
const labelB = ref('€')

const num = (v: string) => (v.trim() === '' || Number.isNaN(Number(v.replace(',', '.'))) ? null : Number(v.replace(',', '.')))
const fmt = (n: number) => String(Number(n.toPrecision(12)))

const result = computed(() => {
  const A = num(a.value), B = num(b.value), C = num(c.value)
  if (A === null || B === null || C === null) return null
  if (mode.value === 'direct') {
    if (A === 0) return { error: 'A must not be 0 for a proportional calculation.' }
    return { A, B, C, x: (B * C) / A, tex: `x = \\frac{${fmt(B)} \\cdot ${fmt(C)}}{${fmt(A)}} = ${fmt((B * C) / A)}` }
  }
  if (C === 0) return { error: 'C must not be 0 for an antiproportional calculation.' }
  return { A, B, C, x: (A * B) / C, tex: `x = \\frac{${fmt(A)} \\cdot ${fmt(B)}}{${fmt(C)}} = ${fmt((A * B) / C)}` }
})
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <UCard>
      <div class="space-y-5">
        <UTabs v-model="mode" :items="modeItems" :content="false" class="w-72" />
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField label="Unit of A and C (optional)"><UInput v-model="labelA" class="w-full" /></UFormField>
          <UFormField label="Unit of B and x (optional)"><UInput v-model="labelB" class="w-full" /></UFormField>
        </div>

        <div class="space-y-3 font-mono">
          <div class="flex flex-wrap items-center gap-3">
            <UInput v-model="a" inputmode="decimal" class="w-28" /> <span>{{ labelA }}</span>
            <UIcon :name="mode === 'direct' ? 'i-lucide-arrow-right' : 'i-lucide-arrow-left-right'" class="text-muted" />
            <UInput v-model="b" inputmode="decimal" class="w-28" /> <span>{{ labelB }}</span>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <UInput v-model="c" inputmode="decimal" class="w-28" /> <span>{{ labelA }}</span>
            <UIcon :name="mode === 'direct' ? 'i-lucide-arrow-right' : 'i-lucide-arrow-left-right'" class="text-muted" />
            <span class="flex h-8 w-28 items-center justify-center rounded-md bg-elevated font-semibold">x</span> <span>{{ labelB }}</span>
          </div>
        </div>
        <p class="text-sm text-muted">
          {{ mode === 'direct' ? 'The more A, the more B (e.g. price per item).' : 'The more A, the less B (e.g. workers and time).' }}
        </p>
      </div>
    </UCard>

    <UAlert v-if="result && 'error' in result" color="warning" variant="subtle" icon="i-lucide-triangle-alert" :title="result.error" />
    <UCard v-else-if="result">
      <div class="flex flex-col items-center gap-3 py-2">
        <div class="text-2xl"><MathFormula :tex="result.tex" /></div>
        <p class="flex items-center gap-1 text-lg">
          {{ fmt(result.C) }} {{ labelA }} → <span class="font-mono text-2xl font-semibold">{{ fmt(result.x) }}</span> {{ labelB }}
          <CopyButton :text="fmt(result.x)" label="result" />
        </p>
      </div>
    </UCard>
  </div>
</template>
