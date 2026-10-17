<script setup lang="ts">
definePageMeta({
  title: 'JWT Builder & Verifier',
  description: 'Sign JSON Web Tokens (HS, RS, ES algorithms) and verify their signatures. Everything stays in your browser.',
  icon: 'i-lucide-file-key',
  tags: ['jwt', 'security', 'crypto', 'generator']
})

type Alg = 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512' | 'ES256' | 'ES384' | 'ES512'
const algs: Alg[] = ['HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'ES512']

const hashOf = (alg: Alg) => `SHA-${alg.slice(2)}`
const curveOf: Record<string, string> = { ES256: 'P-256', ES384: 'P-384', ES512: 'P-521' }

const tab = ref<'build' | 'verify'>('build')
const tabItems = [
  { label: 'Build & sign', value: 'build', icon: 'i-lucide-hammer' },
  { label: 'Verify', value: 'verify', icon: 'i-lucide-badge-check' }
]

const alg = ref<Alg>('HS256')
const secret = ref('your-256-bit-secret')
const secretIsBase64 = ref(false)
const privatePem = ref('')
const publicPem = ref('')

const family = computed(() => alg.value.slice(0, 2) as 'HS' | 'RS' | 'ES')

// ---------- key helpers
function pemToBytes(pem: string) {
  return base64ToBytes(pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, ''))
}

function toPem(buf: ArrayBuffer, label: string) {
  const b64 = bytesToBase64(new Uint8Array(buf))
  return `-----BEGIN ${label}-----\n${b64.match(/.{1,64}/g)!.join('\n')}\n-----END ${label}-----`
}

function hmacKey(a: Alg, usage: 'sign' | 'verify') {
  const raw = secretIsBase64.value ? base64ToBytes(secret.value) : new TextEncoder().encode(secret.value)
  return crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: hashOf(a) }, false, [usage])
}

function asymKey(a: Alg, usage: 'sign' | 'verify') {
  const isRsa = a.startsWith('RS')
  const params = isRsa
    ? { name: 'RSASSA-PKCS1-v1_5', hash: hashOf(a) }
    : { name: 'ECDSA', namedCurve: curveOf[a]! }
  const pem = usage === 'sign' ? privatePem.value : publicPem.value
  if (!pem.trim()) throw new Error(`Provide a ${usage === 'sign' ? 'private' : 'public'} key.`)
  if (/BEGIN (RSA|EC) PRIVATE KEY/.test(pem)) {
    throw new Error('Unsupported key format. Convert to PKCS#8 ("BEGIN PRIVATE KEY"), e.g. with openssl pkcs8 -topk8 -nocrypt.')
  }
  return crypto.subtle.importKey(usage === 'sign' ? 'pkcs8' : 'spki', pemToBytes(pem), params, false, [usage])
}

function signAlgo(a: Alg) {
  if (a.startsWith('HS')) return { name: 'HMAC' }
  if (a.startsWith('RS')) return { name: 'RSASSA-PKCS1-v1_5' }
  return { name: 'ECDSA', hash: hashOf(a) }
}

const b64url = (bytes: Uint8Array) => bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const encodePart = (obj: unknown) => b64url(new TextEncoder().encode(JSON.stringify(obj)))

async function generatePair() {
  error.value = ''
  try {
    const keys = alg.value.startsWith('RS')
      ? await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: hashOf(alg.value) }, true, ['sign', 'verify'])
      : await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: curveOf[alg.value]! }, true, ['sign', 'verify'])
    privatePem.value = toPem(await crypto.subtle.exportKey('pkcs8', keys.privateKey), 'PRIVATE KEY')
    publicPem.value = toPem(await crypto.subtle.exportKey('spki', keys.publicKey), 'PUBLIC KEY')
  } catch {
    error.value = 'Could not generate a key pair.'
  }
}

// ---------- build
const header = ref('')
const payload = ref(JSON.stringify({ sub: '1234567890', name: 'John Doe', iat: Math.floor(Date.now() / 1000) }, null, 2))
const token = ref('')
const error = ref('')

// keep "alg" in the header in sync with the selector
watch(alg, (a) => {
  try {
    header.value = JSON.stringify({ alg: a, typ: 'JWT' }, null, 2)
  } catch { /* ignore */ }
}, { immediate: true })

function addClaim(key: 'iat' | 'exp' | 'nbf', offset = 0) {
  try {
    const obj = JSON.parse(payload.value)
    obj[key] = Math.floor(Date.now() / 1000) + offset
    payload.value = JSON.stringify(obj, null, 2)
  } catch {
    error.value = 'The payload is not valid JSON.'
  }
}

let run = 0
async function build() {
  const id = ++run
  let result = ''
  let err = ''
  try {
    const h = JSON.parse(header.value)
    const p = JSON.parse(payload.value)
    if (h.alg !== alg.value) h.alg = alg.value
    const signingInput = `${encodePart(h)}.${encodePart(p)}`
    const key = family.value === 'HS' ? await hmacKey(alg.value, 'sign') : await asymKey(alg.value, 'sign')
    const sig = new Uint8Array(await crypto.subtle.sign(signAlgo(alg.value), key, new TextEncoder().encode(signingInput)))
    result = `${signingInput}.${b64url(sig)}`
  } catch (e) {
    err = e instanceof SyntaxError ? 'Header or payload is not valid JSON.' : e instanceof Error ? e.message : 'Signing failed.'
  }
  if (id !== run) return
  token.value = result
  error.value = err
}

watch([alg, header, payload, secret, secretIsBase64, privatePem], build, { immediate: true })

const parts = computed(() => (token.value ? token.value.split('.') as [string, string, string] : null))

// ---------- verify
const input = ref('')
const verify = ref<{ ok: boolean, message: string, headerAlg?: string, notes: { text: string, color: 'success' | 'error' | 'warning' }[] } | null>(null)
let vrun = 0

async function runVerify() {
  const id = ++vrun
  const raw = input.value.trim().replace(/^bearer\s+/i, '').replace(/\s+/g, '')
  if (!raw) {
    verify.value = null
    return
  }
  let out: NonNullable<typeof verify.value>
  try {
    const segs = raw.split('.')
    if (segs.length !== 3) throw new Error('A JWT needs exactly 3 parts separated by dots.')
    const [h, p, s] = segs as [string, string, string]
    const hdr = JSON.parse(new TextDecoder().decode(base64ToBytes(h)))
    const claims = JSON.parse(new TextDecoder().decode(base64ToBytes(p)))
    const notes: { text: string, color: 'success' | 'error' | 'warning' }[] = []

    if (hdr.alg === 'none') throw new Error('Tokens with alg "none" are unsigned and are never accepted.')
    if (hdr.alg !== alg.value) {
      notes.push({ text: `Header says ${hdr.alg}, but you selected ${alg.value}. The selected algorithm is used for verification.`, color: 'warning' })
    }

    const key = family.value === 'HS' ? await hmacKey(alg.value, 'verify') : await asymKey(alg.value, 'verify')
    const valid = await crypto.subtle.verify(signAlgo(alg.value), key, base64ToBytes(s), new TextEncoder().encode(`${h}.${p}`))

    const now = Date.now() / 1000
    if (typeof claims.exp === 'number') notes.push(claims.exp < now ? { text: 'Token has expired (exp).', color: 'error' } : { text: 'Token is not expired (exp).', color: 'success' })
    if (typeof claims.nbf === 'number' && claims.nbf > now) notes.push({ text: 'Token is not valid yet (nbf).', color: 'error' })

    out = valid
      ? { ok: true, message: 'Signature verified', headerAlg: hdr.alg, notes }
      : { ok: false, message: 'Invalid signature', headerAlg: hdr.alg, notes }
  } catch (e) {
    out = { ok: false, message: e instanceof Error ? e.message : 'Verification failed.', notes: [] }
  }
  if (id === vrun) verify.value = out
}

watch([input, alg, secret, secretIsBase64, publicPem], runVerify, { immediate: true })

const useBuilt = () => {
  input.value = token.value
  tab.value = 'verify'
}
</script>

<template>
  <div class="space-y-6">
    <UTabs v-model="tab" :items="tabItems" :content="false" class="w-72" />

    <div class="grid items-start gap-6 lg:grid-cols-2">
      <!-- shared: algorithm and keys -->
      <UCard>
        <template #header><h2 class="font-semibold">Algorithm &amp; key</h2></template>
        <div class="space-y-4">
          <UFormField label="Algorithm">
            <USelect v-model="alg" :items="algs" class="w-full" />
          </UFormField>

          <template v-if="family === 'HS'">
            <UFormField label="Secret">
              <UInput v-model="secret" class="w-full" :ui="{ base: 'font-mono' }" />
            </UFormField>
            <USwitch v-model="secretIsBase64" label="Secret is Base64 encoded" />
          </template>

          <template v-else>
            <UButton size="sm" color="neutral" variant="outline" icon="i-lucide-sparkles" @click="generatePair">Generate test key pair</UButton>
            <UFormField v-if="tab === 'build'" label="Private key (PKCS#8 PEM)">
              <UTextarea v-model="privatePem" :rows="7" class="w-full" :ui="{ base: 'font-mono text-xs' }" placeholder="-----BEGIN PRIVATE KEY-----" />
            </UFormField>
            <UFormField label="Public key (SPKI PEM)">
              <UTextarea v-model="publicPem" :rows="7" class="w-full" :ui="{ base: 'font-mono text-xs' }" placeholder="-----BEGIN PUBLIC KEY-----" />
            </UFormField>
          </template>
        </div>
      </UCard>

      <!-- build -->
      <div v-if="tab === 'build'" class="space-y-4">
        <UCard>
          <template #header><h2 class="font-semibold">Header</h2></template>
          <UTextarea v-model="header" :rows="4" class="w-full" :ui="{ base: 'font-mono text-sm' }" />
        </UCard>
        <UCard>
          <template #header>
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h2 class="font-semibold">Payload</h2>
              <div class="flex flex-wrap gap-1">
                <UButton size="xs" color="neutral" variant="outline" @click="addClaim('iat')">iat: now</UButton>
                <UButton size="xs" color="neutral" variant="outline" @click="addClaim('nbf')">nbf: now</UButton>
                <UButton size="xs" color="neutral" variant="outline" @click="addClaim('exp', 3600)">exp: +1h</UButton>
                <UButton size="xs" color="neutral" variant="outline" @click="addClaim('exp', 86400)">exp: +1d</UButton>
              </div>
            </div>
          </template>
          <UTextarea v-model="payload" :rows="9" class="w-full" :ui="{ base: 'font-mono text-sm' }" />
        </UCard>
      </div>

      <!-- verify input -->
      <UCard v-else>
        <template #header><h2 class="font-semibold">Token</h2></template>
        <UTextarea v-model="input" :rows="9" class="w-full" :ui="{ base: 'font-mono text-sm break-all' }" placeholder="Paste a JWT to verify (eyJ…)" />
      </UCard>
    </div>

    <!-- build output -->
    <template v-if="tab === 'build'">
      <UAlert v-if="error" color="error" variant="subtle" icon="i-lucide-circle-alert" :title="error" />
      <UCard v-else-if="parts">
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="font-semibold">Signed token</h2>
            <div class="flex items-center gap-1">
              <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-badge-check" @click="useBuilt">Verify it</UButton>
              <CopyButton :text="token" label="token" />
            </div>
          </div>
        </template>
        <p class="break-all font-mono text-sm">
          <span class="text-rose-500">{{ parts[0] }}</span><span class="text-muted">.</span><span class="text-violet-500">{{ parts[1] }}</span><span class="text-muted">.</span><span class="text-sky-500">{{ parts[2] }}</span>
        </p>
      </UCard>
    </template>

    <!-- verify output -->
    <template v-else-if="verify">
      <UAlert
        :color="verify.ok ? 'success' : 'error'"
        variant="subtle"
        :icon="verify.ok ? 'i-lucide-circle-check' : 'i-lucide-circle-x'"
        :title="verify.message"
        :description="verify.ok ? `Verified with ${alg} and the provided key.` : undefined"
      />
      <div v-if="verify.notes.length" class="space-y-2">
        <UAlert v-for="n in verify.notes" :key="n.text" :color="n.color" variant="subtle" :title="n.text" />
      </div>
    </template>
  </div>
</template>
