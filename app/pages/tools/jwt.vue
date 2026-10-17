<script setup lang="ts">
definePageMeta({
  title: 'JWT Parser',
  description: 'Decode a JSON Web Token: header, payload and signature, with readable time claims.',
  icon: 'i-lucide-key-round',
  tags: ['jwt', 'security', 'decoder']
})

const token = ref('')

const sample
  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMiwiZXhwIjo0MTAyNDQ0ODAwfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'

function b64urlToBytes(part: string) {
  let s = part.replace(/-/g, '+').replace(/_/g, '/')
  s = s.padEnd(Math.ceil(s.length / 4) * 4, '=')
  return Uint8Array.from(atob(s), ch => ch.charCodeAt(0))
}

function decodeJson(part: string) {
  const text = new TextDecoder('utf-8', { fatal: true }).decode(b64urlToBytes(part))
  return JSON.parse(text) as Record<string, unknown>
}

const parsed = computed(() => {
  const raw = token.value.trim().replace(/^bearer\s+/i, '').replace(/\s+/g, '')
  if (!raw) return null

  const parts = raw.split('.')
  if (parts.length !== 3) {
    return { error: `A JWT has 3 parts separated by dots, but this has ${parts.length}.` }
  }
  const [h, p, s] = parts as [string, string, string]
  try {
    const header = decodeJson(h)
    let payload: Record<string, unknown>
    try {
      payload = decodeJson(p)
    } catch {
      return { error: 'The payload is not valid Base64URL-encoded JSON.' }
    }
    const sigBytes = s ? b64urlToBytes(s) : new Uint8Array()
    const hex = [...sigBytes].map(b => b.toString(16).padStart(2, '0')).join('')
    return { raw: { h, p, s }, header, payload, signature: { b64: s, hex, bytes: sigBytes.length } }
  } catch {
    return { error: 'The header is not valid Base64URL-encoded JSON.' }
  }
})

const ok = computed(() => (parsed.value && !('error' in parsed.value) ? parsed.value : null))

const claimInfo: Record<string, string> = {
  iss: 'Issuer',
  sub: 'Subject',
  aud: 'Audience',
  exp: 'Expires at',
  nbf: 'Not valid before',
  iat: 'Issued at',
  jti: 'JWT ID'
}
const timeClaims = ['exp', 'nbf', 'iat']

const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  timer = setInterval(() => (now.value = Date.now()), 1000)
})
onBeforeUnmount(() => clearInterval(timer))

function isTime(key: string, value: unknown): value is number {
  return timeClaims.includes(key) && typeof value === 'number' && Number.isFinite(value)
}

function formatTime(seconds: number) {
  const d = new Date(seconds * 1000)
  if (Number.isNaN(d.getTime())) return 'Invalid date'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'medium' }).format(d)
}

const expStatus = computed(() => {
  const exp = ok.value?.payload.exp
  if (typeof exp !== 'number') return null
  return exp * 1000 < now.value
    ? { label: 'Expired', color: 'error' as const }
    : { label: 'Not expired', color: 'success' as const }
})

const claims = computed(() =>
  Object.entries(ok.value?.payload ?? {}).map(([key, value]) => ({
    key,
    value,
    label: claimInfo[key],
    time: isTime(key, value) ? formatTime(value) : null,
    display: typeof value === 'string' ? value : JSON.stringify(value)
  }))
)

const pretty = (o: unknown) => JSON.stringify(o, null, 2)
</script>

<template>
  <div class="grid items-start gap-6 lg:grid-cols-2">
    <!-- Left: encoded token, like jwt.io -->
    <div class="space-y-4 lg:sticky lg:top-20">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-medium uppercase tracking-wider text-muted">Encoded</h2>
        <div class="flex gap-1">
          <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-flask-conical" @click="token = sample">Sample</UButton>
          <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-eraser" :disabled="!token" @click="token = ''">Clear</UButton>
          <CopyButton :text="token" label="token" />
        </div>
      </div>

      <div class="relative rounded-xl bg-default ring ring-default focus-within:ring-2 focus-within:ring-inverted">
        <div
          aria-hidden="true"
          class="pointer-events-none min-h-64 whitespace-pre-wrap break-all p-4 font-mono text-sm leading-6"
        >
          <template v-if="ok">
            <span class="text-rose-500">{{ ok.raw.h }}</span><span class="text-muted">.</span><span class="text-violet-500">{{ ok.raw.p }}</span><span class="text-muted">.</span><span class="text-sky-500">{{ ok.raw.s }}</span>
          </template>
          <template v-else>{{ token }}&#8203;</template>
        </div>
        <textarea
          v-model="token"
          spellcheck="false"
          autofocus
          placeholder="Paste a JWT here (eyJ…)"
          class="absolute inset-0 size-full resize-none rounded-xl bg-transparent p-4 font-mono text-sm leading-6 text-transparent caret-[var(--ui-text-highlighted)] outline-none placeholder:text-dimmed"
        />
      </div>

      <UAlert
        v-if="parsed && 'error' in parsed"
        color="error"
        variant="subtle"
        icon="i-lucide-circle-alert"
        :title="parsed.error"
      />
      <UAlert
        v-else-if="ok && expStatus"
        :color="expStatus.color"
        variant="subtle"
        :icon="expStatus.color === 'error' ? 'i-lucide-circle-x' : 'i-lucide-circle-check'"
        :title="`Token ${expStatus.label.toLowerCase()}`"
        description="The signature is not verified here: the secret / public key is unknown."
      />
    </div>

    <!-- Right: decoded parts -->
    <div class="space-y-4">
      <h2 class="text-sm font-medium uppercase tracking-wider text-muted">Decoded</h2>

      <div v-if="!ok" class="flex flex-col items-center gap-3 rounded-xl border border-dashed border-default py-20 text-center text-muted">
        <UIcon name="i-lucide-key-round" class="size-8" />
        <p>Paste a token on the left to see its header, payload and signature.</p>
      </div>

      <template v-else>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="size-2.5 rounded-full bg-rose-500" />
                <h3 class="font-semibold">Header</h3>
                <span class="text-sm text-muted">Algorithm &amp; token type</span>
              </div>
              <CopyButton :text="pretty(ok.header)" label="header" />
            </div>
          </template>
          <pre class="overflow-x-auto font-mono text-sm leading-6">{{ pretty(ok.header) }}</pre>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="size-2.5 rounded-full bg-violet-500" />
                <h3 class="font-semibold">Payload</h3>
                <span class="text-sm text-muted">Data</span>
                <UBadge v-if="expStatus" :color="expStatus.color" variant="subtle">{{ expStatus.label }}</UBadge>
              </div>
              <CopyButton :text="pretty(ok.payload)" label="payload" />
            </div>
          </template>
          <pre class="overflow-x-auto font-mono text-sm leading-6">{{ pretty(ok.payload) }}</pre>

          <div v-if="claims.length" class="mt-4 divide-y divide-default rounded-lg border border-default">
            <div v-for="claim in claims" :key="claim.key" class="flex items-start justify-between gap-3 px-3 py-2.5">
              <div class="min-w-0">
                <p class="text-sm">
                  <span class="font-mono font-semibold">{{ claim.key }}</span>
                  <span v-if="claim.label" class="ml-2 text-muted">{{ claim.label }}</span>
                </p>
                <p class="break-all font-mono text-sm text-toned">{{ claim.display }}</p>
                <p v-if="claim.time" class="text-sm text-muted">{{ claim.time }}</p>
              </div>
              <UButton
                v-if="claim.key === 'exp'"
                :to="{ path: '/tools/timestamp', query: { value: String(claim.value) } }"
                icon="i-lucide-clock"
                size="xs"
                color="neutral"
                variant="outline"
                class="shrink-0"
              >
                Open in expiry checker
              </UButton>
            </div>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="size-2.5 rounded-full bg-sky-500" />
                <h3 class="font-semibold">Signature</h3>
                <span class="text-sm text-muted">{{ ok.signature.bytes }} bytes</span>
              </div>
              <CopyButton :text="ok.signature.b64" label="signature" />
            </div>
          </template>
          <div v-if="ok.signature.bytes" class="space-y-3 text-sm">
            <div>
              <p class="mb-1 text-muted">Base64URL</p>
              <pre class="whitespace-pre-wrap break-all rounded-md bg-elevated p-3 font-mono">{{ ok.signature.b64 }}</pre>
            </div>
            <div>
              <p class="mb-1 text-muted">Hex</p>
              <pre class="whitespace-pre-wrap break-all rounded-md bg-elevated p-3 font-mono">{{ ok.signature.hex }}</pre>
            </div>
          </div>
          <UAlert
            v-else
            color="warning"
            variant="subtle"
            icon="i-lucide-triangle-alert"
            title="Empty signature (unsecured token)"
          />
        </UCard>
      </template>
    </div>
  </div>
</template>
