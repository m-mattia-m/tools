<script setup lang="ts">
import { parse, stringify } from 'yaml'

definePageMeta({
  title: 'YAML ⇄ JSON Converter',
  description: 'Convert YAML to JSON and JSON back to YAML.',
  icon: 'i-lucide-arrow-left-right',
  tags: ['yaml', 'json', 'converter']
})

const mode = ref<'yaml2json' | 'json2yaml'>('yaml2json')
const modeItems = [
  { label: 'YAML → JSON', value: 'yaml2json' },
  { label: 'JSON → YAML', value: 'json2yaml' }
]
const input = ref('name: tools\nversion: 1\ntags:\n  - yaml\n  - json\n')
const indent = ref(2)

const result = computed(() => {
  if (!input.value.trim()) return { output: '', error: '' }
  try {
    if (mode.value === 'yaml2json') {
      return { output: JSON.stringify(parse(input.value), null, indent.value), error: '' }
    }
    return { output: stringify(JSON.parse(input.value), { indent: indent.value }), error: '' }
  } catch (e) {
    return { output: '', error: e instanceof Error ? e.message : 'Invalid input' }
  }
})

function swap() {
  if (result.value.output) input.value = result.value.output
  mode.value = mode.value === 'yaml2json' ? 'json2yaml' : 'yaml2json'
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center gap-3">
      <UTabs v-model="mode" :items="modeItems" :content="false" class="w-72" />
      <USelect v-model="indent" :items="[{ label: '2 spaces', value: 2 }, { label: '4 spaces', value: 4 }]" class="w-32" />
      <UButton icon="i-lucide-arrow-left-right" color="neutral" variant="outline" :disabled="!result.output" @click="swap">Swap</UButton>
    </div>
    <div class="grid items-start gap-4 lg:grid-cols-2">
      <UCard>
        <template #header><h2 class="font-semibold">{{ mode === 'yaml2json' ? 'YAML' : 'JSON' }}</h2></template>
        <UTextarea v-model="input" :rows="16" class="w-full" :ui="{ base: 'font-mono text-sm' }" />
      </UCard>
      <div>
        <UAlert v-if="result.error" color="error" variant="subtle" icon="i-lucide-circle-alert" title="Invalid input" :description="result.error" />
        <CodeBox v-else :text="result.output" :title="mode === 'yaml2json' ? 'JSON' : 'YAML'" max-height="32rem" />
      </div>
    </div>
  </div>
</template>
