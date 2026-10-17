<script setup lang="ts">
definePageMeta({
  title: 'JSON Minifier',
  description: 'Strip all whitespace from JSON and see how many bytes you save.',
  icon: 'i-lucide-minimize-2',
  tags: ['json', 'formatter']
})

const input = ref('{\n  "name": "tools",\n  "tags": [\n    "json",\n    "minify"\n  ]\n}')

const result = computed(() => {
  if (!input.value.trim()) return null
  try {
    const output = JSON.stringify(JSON.parse(input.value))
    const before = new TextEncoder().encode(input.value).length
    const after = new TextEncoder().encode(output).length
    return { output, before, after, saved: before ? Math.round((1 - after / before) * 100) : 0 }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Invalid JSON' }
  }
})
</script>

<template>
  <div class="grid items-start gap-4 lg:grid-cols-2">
    <UCard>
      <template #header><h2 class="font-semibold">Input</h2></template>
      <UTextarea v-model="input" :rows="14" class="w-full" :ui="{ base: 'font-mono text-sm' }" />
    </UCard>
    <div class="space-y-3">
      <UAlert v-if="result && 'error' in result" color="error" variant="subtle" icon="i-lucide-circle-alert" title="Invalid JSON" :description="result.error" />
      <template v-else-if="result">
        <p class="text-sm text-muted">{{ result.before }} B → {{ result.after }} B ({{ result.saved }}% smaller)</p>
        <CodeBox :text="result.output" title="Minified" max-height="30rem" />
      </template>
    </div>
  </div>
</template>
