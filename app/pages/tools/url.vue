<script setup lang="ts">
definePageMeta({
  title: 'URL Encoder / Decoder',
  description: 'Percent-encode and decode URLs or query values, and inspect the parts of a URL.',
  icon: 'i-lucide-link',
  tags: ['encoding', 'web', 'converter']
})

const mode = ref<'encode' | 'decode'>('encode')
const modeItems = [
  { label: 'Encode', value: 'encode', icon: 'i-lucide-lock' },
  { label: 'Decode', value: 'decode', icon: 'i-lucide-lock-open' }
]
const scope = ref<'component' | 'uri'>('component')
const scopeItems = [
  { label: 'Component (encodeURIComponent)', value: 'component' },
  { label: 'Full URL (encodeURI)', value: 'uri' }
]
const input = ref('')

const result = computed(() => {
  if (!input.value) return { output: '', error: '' }
  try {
    const fn = mode.value === 'encode'
      ? (scope.value === 'component' ? encodeURIComponent : encodeURI)
      : (scope.value === 'component' ? decodeURIComponent : decodeURI)
    return { output: fn(input.value), error: '' }
  } catch {
    return { output: '', error: 'Malformed input: it contains an invalid percent sequence.' }
  }
})

const parts = computed(() => {
  const raw = (mode.value === 'decode' ? result.value.output : input.value).trim()
  if (!raw) return null
  try {
    const u = new URL(raw)
    return {
      rows: [
        ['Protocol', u.protocol], ['Username', u.username], ['Password', u.password],
        ['Host', u.hostname], ['Port', u.port], ['Path', u.pathname], ['Hash', u.hash]
      ].filter(([, v]) => v) as [string, string][],
      params: [...u.searchParams.entries()]
    }
  } catch {
    return null
  }
})

function swap() {
  if (result.value.output) input.value = result.value.output
  mode.value = mode.value === 'encode' ? 'decode' : 'encode'
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <UCard>
      <div class="space-y-4">
        <div class="flex flex-wrap items-center gap-3">
          <UTabs v-model="mode" :items="modeItems" :content="false" class="w-64" />
          <USelect v-model="scope" :items="scopeItems" class="w-64" />
        </div>
        <UTextarea v-model="input" :rows="5" class="w-full" :ui="{ base: 'font-mono' }" :placeholder="mode === 'encode' ? 'Text or URL to encode…' : 'Percent-encoded text…'" />
      </div>
    </UCard>

    <UAlert v-if="result.error" color="error" variant="subtle" icon="i-lucide-circle-alert" :title="result.error" />
    <div v-else-if="result.output" class="space-y-2">
      <CodeBox :text="result.output" title="Result" />
      <div class="flex justify-end">
        <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-arrow-left-right" @click="swap">Use as input &amp; switch</UButton>
      </div>
    </div>

    <UCard v-if="parts">
      <template #header><h2 class="font-semibold">URL parts</h2></template>
      <dl class="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-1.5 text-sm">
        <template v-for="[k, v] in parts.rows" :key="k">
          <dt class="text-muted">{{ k }}</dt>
          <dd class="break-all font-mono">{{ v }}</dd>
        </template>
      </dl>
      <div v-if="parts.params.length" class="mt-4 overflow-hidden rounded-lg border border-default">
        <table class="w-full text-sm">
          <thead class="bg-elevated text-left text-muted">
            <tr><th class="px-3 py-1.5 font-medium">Query key</th><th class="px-3 py-1.5 font-medium">Value</th></tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr v-for="([k, v], i) in parts.params" :key="i">
              <td class="px-3 py-1.5 font-mono">{{ k }}</td>
              <td class="break-all px-3 py-1.5 font-mono">{{ v }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>
  </div>
</template>
