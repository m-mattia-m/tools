<script setup lang="ts">
definePageMeta({
  title: 'Math Evaluator',
  description: 'Evaluate expressions with functions like sqrt, sin, cos, abs, units and variables.',
  icon: 'i-lucide-calculator',
  tags: ['math', 'calculator']
})

const input = ref('a = 3\nb = 4\nsqrt(a^2 + b^2)\nsin(45 deg)\n12.7 cm to inch\nround(pi * 100) / 100')

// mathjs is large, so load it only when this tool is opened.
const math = shallowRef<import('mathjs').MathJsInstance | null>(null)
onMounted(async () => {
  const m = await import('mathjs')
  math.value = m.create(m.all!)
})

const lines = computed(() => {
  const m = math.value
  const scope: Record<string, unknown> = {}
  return input.value.split('\n').map((line) => {
    if (!m || !line.trim() || line.trim().startsWith('#')) return { line, result: '' }
    try {
      const value = m.evaluate(line, scope)
      if (value === undefined || typeof value === 'function') return { line, result: '' }
      return { line, result: m.format(value, { precision: 14 }) }
    } catch (e) {
      return { line, result: '', error: e instanceof Error ? e.message : 'Error' }
    }
  })
})

const functions = ['sqrt()', 'abs()', 'sin()', 'cos()', 'tan()', 'log()', 'exp()', 'pow(,)', 'round()', 'floor()', 'ceil()', 'min(,)', 'max(,)', 'factorial()', 'pi', 'e']
function insert(fn: string) {
  input.value += (input.value && !input.value.endsWith('\n') ? ' ' : '') + fn
}
</script>

<template>
  <div class="grid items-start gap-6 lg:grid-cols-2">
    <UCard>
      <template #header><h2 class="font-semibold">Expressions <span class="font-normal text-muted">(one per line)</span></h2></template>
      <UTextarea v-model="input" :rows="12" class="w-full" :ui="{ base: 'font-mono' }" placeholder="2 * (3 + 4)" />
      <div class="mt-3 flex flex-wrap gap-1.5">
        <UButton v-for="f in functions" :key="f" size="xs" color="neutral" variant="outline" class="font-mono" @click="insert(f)">{{ f }}</UButton>
      </div>
    </UCard>
    <UCard>
      <template #header><h2 class="font-semibold">Results</h2></template>
      <p v-if="!math" class="text-muted">Loading math engine…</p>
      <div v-else class="space-y-1 font-mono text-sm">
        <div v-for="(l, i) in lines" :key="i" class="flex min-h-6 items-start justify-between gap-4 border-b border-default pb-1 last:border-0">
          <span class="break-all text-muted">{{ l.line }}</span>
          <span v-if="l.error" class="text-right text-error">{{ l.error }}</span>
          <span v-else-if="l.result" class="flex items-center gap-1 text-right font-semibold">{{ l.result }} <CopyButton :text="l.result" label="result" /></span>
        </div>
      </div>
    </UCard>
  </div>
</template>
