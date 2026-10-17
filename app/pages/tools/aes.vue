<script setup lang="ts">
definePageMeta({
  title: 'AES Encrypt / Decrypt',
  description: 'Encrypt and decrypt text with AES-256-GCM and a passphrase, entirely in your browser.',
  icon: 'i-lucide-lock',
  tags: ['crypto', 'security', 'encryption']
})

const ITERATIONS = 100_000
const mode = ref<'encrypt' | 'decrypt'>('encrypt')
const modeItems = [
  { label: 'Encrypt', value: 'encrypt', icon: 'i-lucide-lock' },
  { label: 'Decrypt', value: 'decrypt', icon: 'i-lucide-lock-open' }
]
const input = ref('')
const key = ref('')
const showKey = ref(false)
const output = ref('')
const error = ref('')
const busy = ref(false)
let run = 0

async function deriveKey(passphrase: string, salt: Uint8Array<ArrayBuffer>) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

async function process() {
  const id = ++run
  error.value = ''
  if (!input.value || !key.value) {
    output.value = ''
    return
  }
  busy.value = true
  try {
    let result: string
    if (mode.value === 'encrypt') {
      const salt = crypto.getRandomValues(new Uint8Array(16))
      const iv = crypto.getRandomValues(new Uint8Array(12))
      const aes = await deriveKey(key.value, salt)
      const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aes, new TextEncoder().encode(input.value)))
      const packed = new Uint8Array(salt.length + iv.length + ct.length)
      packed.set(salt, 0)
      packed.set(iv, salt.length)
      packed.set(ct, salt.length + iv.length)
      result = bytesToBase64(packed)
    } else {
      const packed = base64ToBytes(input.value.trim())
      if (packed.length < 29) throw new Error('short')
      const aes = await deriveKey(key.value, packed.slice(0, 16))
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: packed.slice(16, 28) }, aes, packed.slice(28))
      result = new TextDecoder().decode(plain)
    }
    if (id === run) output.value = result
  } catch {
    if (id === run) {
      output.value = ''
      error.value = mode.value === 'decrypt' ? 'Decryption failed: wrong key or corrupted/invalid input.' : 'Encryption failed.'
    }
  } finally {
    if (id === run) busy.value = false
  }
}

watch([mode, input, key], process, { immediate: true })

function swap() {
  if (output.value) input.value = output.value
  mode.value = mode.value === 'encrypt' ? 'decrypt' : 'encrypt'
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <UCard>
      <div class="space-y-4">
        <UTabs v-model="mode" :items="modeItems" :content="false" class="w-64" />
        <UFormField label="Key / passphrase">
          <UInput v-model="key" :type="showKey ? 'text' : 'password'" autocomplete="off" class="w-full">
            <template #trailing>
              <UButton :icon="showKey ? 'i-lucide-eye-off' : 'i-lucide-eye'" color="neutral" variant="link" size="sm" aria-label="Toggle visibility" @click="showKey = !showKey" />
            </template>
          </UInput>
        </UFormField>
        <UFormField :label="mode === 'encrypt' ? 'Plain text' : 'Encrypted text (Base64)'">
          <UTextarea v-model="input" :rows="6" class="w-full" :ui="{ base: 'font-mono' }" />
        </UFormField>
      </div>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" icon="i-lucide-circle-alert" :title="error" />
    <div v-else-if="output" class="space-y-2">
      <CodeBox :text="output" :title="mode === 'encrypt' ? 'Encrypted (Base64)' : 'Decrypted'" label="result" />
      <div class="flex justify-end">
        <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-arrow-left-right" @click="swap">Use as input &amp; switch</UButton>
      </div>
    </div>

    <p class="text-sm text-muted">
      AES-256-GCM. The key is derived from the passphrase with PBKDF2-SHA-256 ({{ ITERATIONS.toLocaleString() }} iterations).
      Output is Base64 of <code>salt(16) | iv(12) | ciphertext+tag</code>, so it is only compatible with this tool.
    </p>
  </div>
</template>
