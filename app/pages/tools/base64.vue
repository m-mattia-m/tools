<script setup lang="ts">
definePageMeta({
  title: 'Base64 Encoder / Decoder',
  description: 'Encode text to Base64 or decode it back, with URL-safe support. UTF-8 aware.',
  icon: 'i-lucide-binary',
  tags: ['encoding', 'converter']
})

const mode = ref<'encode' | 'decode'>('encode')
const input = ref('')
const urlSafe = ref(false)
const padding = ref(true)

const modeItems = [
  { label: 'Encode', value: 'encode', icon: 'i-lucide-lock' },
  { label: 'Decode', value: 'decode', icon: 'i-lucide-lock-open' }
]

function encode(text: string) {
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  bytes.forEach(byte => (bin += String.fromCharCode(byte)))
  let out = btoa(bin)
  if (urlSafe.value) out = out.replace(/\+/g, '-').replace(/\//g, '_')
  if (!padding.value) out = out.replace(/=+$/, '')
  return out
}

function decode(text: string) {
  // Accept both the standard and the URL-safe alphabet, with or without padding.
  let s = text.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/')
  if (s.length % 4 === 1) throw new Error('Invalid Base64 length.')
  s = s.padEnd(Math.ceil(s.length / 4) * 4, '=')
  const bin = atob(s)
  const bytes = Uint8Array.from(bin, ch => ch.charCodeAt(0))
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
}

const result = computed(() => {
  if (!input.value) return { output: '', error: '' }
  try {
    return { output: mode.value === 'encode' ? encode(input.value) : decode(input.value), error: '' }
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    return {
      output: '',
      error: msg.includes('encoded')
        ? 'The decoded bytes are not valid UTF-8 text.'
        : 'This is not valid Base64.'
    }
  }
})

function swap() {
  if (result.value.output) input.value = result.value.output
  mode.value = mode.value === 'encode' ? 'decode' : 'encode'
}
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-6">
    <div class="flex flex-wrap items-center gap-4">
      <UTabs v-model="mode" :items="modeItems" :content="false" class="w-64" />
      <USwitch v-if="mode === 'encode'" v-model="urlSafe" label="URL-safe" />
      <USwitch v-if="mode === 'encode'" v-model="padding" label="Padding (=)" />
    </div>

    <div class="grid gap-4 lg:grid-cols-[1fr_auto_1fr]">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="font-semibold">{{ mode === 'encode' ? 'Text' : 'Base64' }}</h2>
            <UButton icon="i-lucide-eraser" color="neutral" variant="ghost" size="xs" :disabled="!input" @click="input = ''">Clear</UButton>
          </div>
        </template>
        <UTextarea
          v-model="input"
          :rows="10"
          autoresize
          :maxrows="20"
          class="w-full"
          :ui="{ base: 'font-mono' }"
          :placeholder="mode === 'encode' ? 'Type or paste text…' : 'Paste Base64…'"
        />
      </UCard>

      <div class="flex items-center justify-center">
        <UTooltip text="Use output as input and switch direction">
          <UButton icon="i-lucide-arrow-left-right" color="neutral" variant="outline" aria-label="Swap" @click="swap" />
        </UTooltip>
      </div>

      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="font-semibold">{{ mode === 'encode' ? 'Base64' : 'Text' }}</h2>
            <CopyButton :text="result.output" label="output" />
          </div>
        </template>
        <UAlert v-if="result.error" color="error" variant="subtle" icon="i-lucide-circle-alert" :title="result.error" />
        <UTextarea
          v-else
          :model-value="result.output"
          readonly
          :rows="10"
          autoresize
          :maxrows="20"
          class="w-full"
          :ui="{ base: 'font-mono' }"
          placeholder="Result appears here"
        />
      </UCard>
    </div>
  </div>
</template>
