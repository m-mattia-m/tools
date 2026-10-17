<script setup lang="ts">
definePageMeta({
  title: 'JSON Formatter & Validator',
  description: 'Pretty-print and validate JSON with precise error locations.',
  icon: 'i-lucide-braces',
  tags: ['json', 'formatter', 'validator']
})

const input = ref('{"name":"tools","tags":["json","format"],"nested":{"a":1,"b":[true,null]}}')
const indent = ref<'2' | '4' | 'tab'>('2')
const sortKeys = ref(false)

function sortDeep(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortDeep)
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, sortDeep(x)]))
  }
  return v
}

const result = computed(() => {
  if (!input.value.trim()) return null
  try {
    let value = JSON.parse(input.value)
    if (sortKeys.value) value = sortDeep(value)
    return { output: JSON.stringify(value, null, indent.value === 'tab' ? '\t' : Number(indent.value)) }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Invalid JSON'
    let location = ''
    const pos = message.match(/position (\d+)/)
    if (pos) {
      const before = input.value.slice(0, Number(pos[1]))
      const line = before.split('\n').length
      location = `line ${line}, column ${before.length - before.lastIndexOf('\n')}`
    } else {
      const lc = message.match(/line (\d+) column (\d+)/)
      if (lc) location = `line ${lc[1]}, column ${lc[2]}`
    }
    return { error: message, location }
  }
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center gap-4">
      <USelect v-model="indent" :items="[{ label: '2 spaces', value: '2' }, { label: '4 spaces', value: '4' }, { label: 'Tabs', value: 'tab' }]" class="w-32" />
      <USwitch v-model="sortKeys" label="Sort keys" />
      <UBadge v-if="result && 'output' in result" color="success" variant="subtle">Valid JSON</UBadge>
      <UBadge v-else-if="result" color="error" variant="subtle">Invalid JSON</UBadge>
    </div>
    <div class="grid items-start gap-4 lg:grid-cols-2">
      <UCard>
        <template #header><h2 class="font-semibold">Input</h2></template>
        <UTextarea v-model="input" :rows="18" class="w-full" :ui="{ base: 'font-mono text-sm' }" />
      </UCard>
      <div>
        <UAlert
          v-if="result && 'error' in result"
          color="error" variant="subtle" icon="i-lucide-circle-alert"
          :title="result.location ? `Error at ${result.location}` : 'Invalid JSON'"
          :description="result.error"
        />
        <CodeBox v-else-if="result" :text="result.output" title="Formatted" max-height="36rem" />
      </div>
    </div>
  </div>
</template>
