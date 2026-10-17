<script setup lang="ts">
import QRCode from 'qrcode'

definePageMeta({
  title: 'OTP Code Generator',
  description: 'Generate time-based one-time passwords (TOTP) from a secret, with otpauth URI and QR code.',
  icon: 'i-lucide-smartphone',
  tags: ['security', 'generator', 'otp']
})

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const secret = ref('JBSWY3DPEHPK3PXP')
const digits = ref(6)
const period = ref(30)
const algorithm = ref<'SHA-1' | 'SHA-256' | 'SHA-512'>('SHA-1')
const issuer = ref('Tools')
const account = ref('user@example.com')

const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => (timer = setInterval(() => (now.value = Date.now()), 250)))
onBeforeUnmount(() => clearInterval(timer))

function base32Decode(input: string) {
  const clean = input.toUpperCase().replace(/[\s=-]/g, '')
  if (!clean || [...clean].some(c => !ALPHABET.includes(c))) return null
  let bits = ''
  for (const c of clean) bits += ALPHABET.indexOf(c).toString(2).padStart(5, '0')
  const bytes = new Uint8Array(Math.floor(bits.length / 8))
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2)
  return bytes
}

async function totp(key: Uint8Array<ArrayBuffer>, counter: number) {
  const msg = new ArrayBuffer(8)
  const view = new DataView(msg)
  view.setUint32(0, Math.floor(counter / 2 ** 32))
  view.setUint32(4, counter >>> 0)
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: algorithm.value }, false, ['sign'])
  const h = new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, msg))
  const offset = h[h.length - 1]! & 0xf
  const bin = ((h[offset]! & 0x7f) << 24) | (h[offset + 1]! << 16) | (h[offset + 2]! << 8) | h[offset + 3]!
  return String(bin % 10 ** digits.value).padStart(digits.value, '0')
}

const counter = computed(() => Math.floor(now.value / 1000 / period.value))
const remaining = computed(() => period.value - ((now.value / 1000) % period.value))
const keyBytes = computed(() => base32Decode(secret.value) as Uint8Array<ArrayBuffer> | null)

const code = ref('')
const nextCode = ref('')

watchEffect(async () => {
  const key = keyBytes.value
  const c = counter.value
  void [digits.value, algorithm.value]
  if (!key) {
    code.value = nextCode.value = ''
    return
  }
  const [a, b] = await Promise.all([totp(key, c), totp(key, c + 1)])
  code.value = a
  nextCode.value = b
})

const uri = computed(() =>
  `otpauth://totp/${encodeURIComponent(issuer.value)}:${encodeURIComponent(account.value)}?secret=${secret.value.replace(/\s/g, '')}&issuer=${encodeURIComponent(issuer.value)}&algorithm=${algorithm.value.replace('-', '')}&digits=${digits.value}&period=${period.value}`
)
const qr = ref('')
watchEffect(async () => {
  qr.value = keyBytes.value ? await QRCode.toDataURL(uri.value, { margin: 2, width: 240 }) : ''
})

function randomSecret() {
  secret.value = randomString(ALPHABET, 32)
}

const spaced = (c: string) => c.replace(/(.{3})(?=.)/g, '$1 ')
</script>

<template>
  <div class="mx-auto grid max-w-5xl items-start gap-6 lg:grid-cols-2">
    <UCard>
      <div class="space-y-4">
        <UFormField label="Secret (Base32)" :error="secret && !keyBytes ? 'Invalid Base32 secret' : undefined">
          <div class="flex gap-2">
            <UInput v-model="secret" class="flex-1" :ui="{ base: 'font-mono' }" />
            <UButton color="neutral" variant="outline" icon="i-lucide-dices" @click="randomSecret">Random</UButton>
          </div>
        </UFormField>
        <div class="grid gap-4 sm:grid-cols-3">
          <UFormField label="Digits"><USelect v-model="digits" :items="[6, 7, 8]" class="w-full" /></UFormField>
          <UFormField label="Period (s)"><UInput v-model.number="period" type="number" :min="5" :max="300" class="w-full" /></UFormField>
          <UFormField label="Algorithm"><USelect v-model="algorithm" :items="['SHA-1', 'SHA-256', 'SHA-512']" class="w-full" /></UFormField>
          <UFormField label="Issuer" class="sm:col-span-1"><UInput v-model="issuer" class="w-full" /></UFormField>
          <UFormField label="Account" class="sm:col-span-2"><UInput v-model="account" class="w-full" /></UFormField>
        </div>
      </div>
    </UCard>

    <div class="space-y-4">
      <UCard>
        <div class="flex flex-col items-center gap-3 py-2">
          <div class="flex items-center gap-2">
            <p class="font-mono text-5xl font-semibold tracking-wider">{{ code ? spaced(code) : '——' }}</p>
            <CopyButton :text="code" label="code" />
          </div>
          <UProgress :model-value="remaining" :max="period" size="sm" class="w-full max-w-xs" :color="remaining < 5 ? 'error' : 'neutral'" />
          <p class="text-sm text-muted">Expires in {{ Math.ceil(remaining) }}s · next: <span class="font-mono">{{ nextCode ? spaced(nextCode) : '—' }}</span></p>
        </div>
      </UCard>
      <UCard v-if="qr">
        <div class="flex flex-col items-center gap-3">
          <img :src="qr" alt="otpauth QR code" class="size-48 rounded-lg border border-default">
          <CodeBox :text="uri" title="otpauth URI" class="w-full" />
        </div>
      </UCard>
    </div>
  </div>
</template>
