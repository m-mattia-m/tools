<script setup lang="ts">
import { parseDocument } from 'yaml'

definePageMeta({
  title: 'YAML Formatter & Validator',
  description: 'Validate and re-format YAML, keeping comments, with line/column errors.',
  icon: 'i-lucide-file-text',
  tags: ['yaml', 'formatter', 'validator']
})

const input = ref('name:   tools\nlist:\n    - a\n    -   b\n# comment\nnested: {a: 1,   b: [1,2]}\n')
const indent = ref(2)

const result = computed(() => {
  if (!input.value.trim()) return null
  const doc = parseDocument(input.value)
  if (doc.errors.length) {
    const e = doc.errors[0]!
    return { error: e.message, location: e.linePos ? `line ${e.linePos[0].line}, column ${e.linePos[0].col}` : '' }
  }
  return { output: doc.toString({ indent: indent.value }) }
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center gap-4">
      <USelect v-model="indent" :items="[{ label: '2 spaces', value: 2 }, { label: '4 spaces', value: 4 }]" class="w-32" />
      <UBadge v-if="result && 'output' in result" color="success" variant="subtle">Valid YAML</UBadge>
      <UBadge v-else-if="result" color="error" variant="subtle">Invalid YAML</UBadge>
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
          :title="result.location ? `Error at ${result.location}` : 'Invalid YAML'"
          :description="result.error"
        />
        <CodeBox v-else-if="result" :text="result.output" title="Formatted" max-height="36rem" />
      </div>
    </div>
  </div>
</template>
