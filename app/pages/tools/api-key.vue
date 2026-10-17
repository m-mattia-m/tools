<script setup lang="ts">
definePageMeta({
  title: 'API Key / Token Generator',
  description: 'Cryptographically secure API keys, secrets and tokens with a custom prefix.',
  icon: 'i-lucide-key-square',
  tags: ['generator', 'security', 'token']
})

const charsets = {
  base62: { label: 'Alphanumeric (base62)', chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789' },
  hex: { label: 'Hex', chars: '0123456789abcdef' },
  base64url: { label: 'Base64URL', chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_' },
  base58: { label: 'Base58', chars: '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz' },
  numeric: { label: 'Digits only', chars: '0123456789' }
} as const
type CharsetKey = keyof typeof charsets

const charsetItems = (Object.keys(charsets) as CharsetKey[]).map(k => ({ label: charsets[k].label, value: k }))

const prefix = ref('sk_live_')
const length = ref(40)
const charset = ref<CharsetKey>('base62')
const count = ref(3)
const nonce = ref(0)

const presets = [
  { label: 'Stripe-like', prefix: 'sk_live_', length: 32, charset: 'base62' as CharsetKey },
  { label: 'GitHub-like', prefix: 'ghp_', length: 36, charset: 'base62' as CharsetKey },
  { label: '256-bit hex secret', prefix: '', length: 64, charset: 'hex' as CharsetKey },
  { label: 'JWT secret', prefix: '', length: 86, charset: 'base64url' as CharsetKey }
]

function apply(p: (typeof presets)[number]) {
  prefix.value = p.prefix
  length.value = p.length
  charset.value = p.charset
}

const keys = computed(() => {
  void nonce.value
  const n = Math.min(Math.max(Math.floor(count.value) || 1, 1), 100)
  const len = Math.min(Math.max(Math.floor(length.value) || 1, 1), 512)
  return Array.from({ length: n }, () => prefix.value + randomString(charsets[charset.value].chars, len))
})

const bits = computed(() => Math.floor(length.value * Math.log2(charsets[charset.value].chars.length)))
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <UCard>
      <div class="space-y-4">
        <div class="flex flex-wrap gap-2">
          <UButton v-for="p in presets" :key="p.label" size="xs" color="neutral" variant="outline" @click="apply(p)">{{ p.label }}</UButton>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField label="Prefix">
            <UInput v-model="prefix" placeholder="e.g. sk_live_" class="w-full" :ui="{ base: 'font-mono' }" />
          </UFormField>
          <UFormField label="Character set">
            <USelect v-model="charset" :items="charsetItems" class="w-full" />
          </UFormField>
          <UFormField label="Random length">
            <UInput v-model.number="length" type="number" :min="1" :max="512" class="w-full" />
          </UFormField>
          <UFormField label="Amount">
            <UInput v-model.number="count" type="number" :min="1" :max="100" class="w-full" />
          </UFormField>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-sm text-muted">≈ {{ bits }} bits of entropy per key</span>
          <UButton icon="i-lucide-refresh-cw" @click="nonce++">Regenerate</UButton>
        </div>
      </div>
    </UCard>
    <CodeBox :text="keys.join('\n')" title="Keys" label="keys" />
  </div>
</template>
