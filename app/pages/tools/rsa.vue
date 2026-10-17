<script setup lang="ts">
definePageMeta({
  title: 'RSA Key Pair Generator',
  description: 'Generate RSA public/private key pairs in PEM format using the Web Crypto API.',
  icon: 'i-lucide-key-round',
  tags: ['crypto', 'security', 'generator']
})

const sizes = [
  { label: '2048 bit', value: 2048 },
  { label: '3072 bit', value: 3072 },
  { label: '4096 bit (slow)', value: 4096 }
]
const bits = ref(2048)
const busy = ref(false)
const error = ref('')
const pair = ref<{ publicKey: string, privateKey: string } | null>(null)

function toPem(buf: ArrayBuffer, label: string) {
  const b64 = bytesToBase64(new Uint8Array(buf))
  return `-----BEGIN ${label}-----\n${b64.match(/.{1,64}/g)!.join('\n')}\n-----END ${label}-----`
}

async function generate() {
  busy.value = true
  error.value = ''
  try {
    const keys = await crypto.subtle.generateKey(
      { name: 'RSA-OAEP', modulusLength: bits.value, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
      true,
      ['encrypt', 'decrypt']
    )
    pair.value = {
      publicKey: toPem(await crypto.subtle.exportKey('spki', keys.publicKey), 'PUBLIC KEY'),
      privateKey: toPem(await crypto.subtle.exportKey('pkcs8', keys.privateKey), 'PRIVATE KEY')
    }
  } catch {
    error.value = 'Key generation failed in this browser.'
  } finally {
    busy.value = false
  }
}

function download(name: string, text: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/x-pem-file' }))
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <UCard>
      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Key size">
          <USelect v-model="bits" :items="sizes" class="w-48" />
        </UFormField>
        <UButton icon="i-lucide-sparkles" :loading="busy" @click="generate">Generate key pair</UButton>
      </div>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" :title="error" />

    <template v-if="pair">
      <div class="space-y-2">
        <CodeBox :text="pair.publicKey" title="Public key (SPKI)" label="public key" />
        <UButton size="xs" color="neutral" variant="outline" icon="i-lucide-download" @click="download('public.pem', pair.publicKey)">Download public.pem</UButton>
      </div>
      <div class="space-y-2">
        <CodeBox :text="pair.privateKey" title="Private key (PKCS#8)" label="private key" />
        <UButton size="xs" color="neutral" variant="outline" icon="i-lucide-download" @click="download('private.pem', pair.privateKey)">Download private.pem</UButton>
      </div>
      <UAlert color="warning" variant="subtle" icon="i-lucide-triangle-alert" title="Keep the private key secret" description="Keys are generated locally and never leave this page, but treat browser-generated keys as test keys unless you trust this device." />
    </template>
  </div>
</template>
