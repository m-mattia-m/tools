<script setup lang="ts">
definePageMeta({
  title: 'Password Generator',
  description: 'Random or memorable passwords with a strength indicator. Generated locally.',
  icon: 'i-lucide-shield-check',
  tags: ['generator', 'security', 'password']
})

const mode = ref<'random' | 'memorable'>('random')
const modeItems = [
  { label: 'Random', value: 'random', icon: 'i-lucide-dices' },
  { label: 'Memorable', value: 'memorable', icon: 'i-lucide-brain' }
]
const nonce = ref(0)

// random
const length = ref(20)
const lower = ref(true)
const upper = ref(true)
const numbers = ref(true)
const symbols = ref(true)
const noAmbiguous = ref(false)

// memorable
const wordCount = ref(4)
const separator = ref('-')
const capitalize = ref<'none' | 'all' | 'random'>('random')
const capItems = [
  { label: 'No capitals', value: 'none' },
  { label: 'Every word', value: 'all' },
  { label: 'Some words (random)', value: 'random' }
]
const addNumber = ref(true)

const classes = computed(() => {
  const amb = noAmbiguous.value ? /[0O1lI|`'"]/g : null
  const strip = (s: string) => (amb ? s.replace(amb, '') : s)
  return [
    lower.value && strip('abcdefghijklmnopqrstuvwxyz'),
    upper.value && strip('ABCDEFGHIJKLMNOPQRSTUVWXYZ'),
    numbers.value && strip('0123456789'),
    symbols.value && strip('!@#$%^&*()-_=+[]{};:,.<>?/~')
  ].filter((c): c is string => !!c)
})

const result = computed(() => {
  void nonce.value
  if (mode.value === 'random') {
    const sets = classes.value
    if (!sets.length) return { password: '', bits: 0 }
    const pool = sets.join('')
    const len = Math.min(Math.max(length.value, sets.length), 256)
    const chars = sets.map(s => pick([...s]))
    while (chars.length < len) chars.push(pick([...pool]))
    for (let i = chars.length - 1; i > 0; i--) {
      const j = randomInt(i + 1)
      ;[chars[i], chars[j]] = [chars[j]!, chars[i]!]
    }
    return { password: chars.join(''), bits: len * Math.log2(pool.length) }
  }

  const words = Array.from({ length: wordCount.value }, () => {
    const w = pick(WORDS)
    const cap = capitalize.value === 'all' || (capitalize.value === 'random' && randomInt(2) === 1)
    return cap ? w.charAt(0).toUpperCase() + w.slice(1) : w
  })
  let bits = wordCount.value * Math.log2(WORDS.length)
  if (capitalize.value === 'random') bits += wordCount.value
  let password = words.join(separator.value)
  if (addNumber.value) {
    password += separator.value + randomInt(100)
    bits += Math.log2(100)
  }
  return { password, bits }
})

const strength = computed(() => {
  const b = result.value.bits
  if (b < 40) return { label: 'Weak', color: 'error' as const }
  if (b < 60) return { label: 'Fair', color: 'warning' as const }
  if (b < 80) return { label: 'Good', color: 'info' as const }
  return { label: 'Strong', color: 'success' as const }
})
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <UCard>
      <div class="space-y-3">
        <div class="flex items-center gap-2 rounded-lg bg-elevated p-4">
          <p class="flex-1 break-all font-mono text-xl">{{ result.password || '—' }}</p>
          <UButton icon="i-lucide-refresh-cw" color="neutral" variant="ghost" aria-label="Regenerate" @click="nonce++" />
          <CopyButton :text="result.password" label="password" />
        </div>
        <div class="space-y-1">
          <div class="flex items-center justify-between text-sm">
            <UBadge :color="strength.color" variant="subtle">{{ strength.label }}</UBadge>
            <span class="text-muted">≈ {{ Math.round(result.bits) }} bits of entropy</span>
          </div>
          <UProgress :model-value="Math.min(result.bits, 128)" :max="128" :color="strength.color" size="sm" />
        </div>
      </div>
    </UCard>

    <UCard>
      <div class="space-y-5">
        <UTabs v-model="mode" :items="modeItems" :content="false" class="w-72" />

        <template v-if="mode === 'random'">
          <UFormField :label="`Length: ${length}`">
            <div class="flex items-center gap-4">
              <USlider v-model="length" :min="4" :max="128" class="flex-1" />
              <UInput v-model.number="length" type="number" :min="4" :max="256" class="w-24" />
            </div>
          </UFormField>
          <div class="grid gap-3 sm:grid-cols-2">
            <USwitch v-model="lower" label="Lowercase (a–z)" />
            <USwitch v-model="upper" label="Uppercase (A–Z)" />
            <USwitch v-model="numbers" label="Numbers (0–9)" />
            <USwitch v-model="symbols" label="Symbols (!@#…)" />
            <USwitch v-model="noAmbiguous" label="Avoid ambiguous (0 O 1 l I)" />
          </div>
          <UAlert v-if="!classes.length" color="warning" variant="subtle" title="Enable at least one character type." />
        </template>

        <template v-else>
          <UFormField :label="`Words: ${wordCount}`">
            <USlider v-model="wordCount" :min="2" :max="10" />
          </UFormField>
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField label="Separator">
              <UInput v-model="separator" maxlength="3" class="w-full" />
            </UFormField>
            <UFormField label="Capital letters">
              <USelect v-model="capitalize" :items="capItems" class="w-full" />
            </UFormField>
          </div>
          <USwitch v-model="addNumber" label="Append a number" />
        </template>
      </div>
    </UCard>
  </div>
</template>
