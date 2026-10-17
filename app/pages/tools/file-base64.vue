<script setup lang="ts">
definePageMeta({
  title: 'File ⇄ Base64',
  description: 'Convert a file to Base64 / data URL, or turn Base64 back into a downloadable file.',
  icon: 'i-lucide-file-code',
  tags: ['encoding', 'converter', 'files']
})

// ---- file -> base64
const fileName = ref('')
const fileSize = ref(0)
const b64 = ref('')
const mime = ref('')
const asDataUrl = ref(false)
const reading = ref(false)

const fileOutput = computed(() => (asDataUrl.value && b64.value ? `data:${mime.value || 'application/octet-stream'};base64,${b64.value}` : b64.value))

async function onFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  reading.value = true
  fileName.value = file.name
  fileSize.value = file.size
  mime.value = file.type
  b64.value = bytesToBase64(new Uint8Array(await file.arrayBuffer()))
  reading.value = false
}

// ---- base64 -> file
const source = ref('')
const outName = ref('file')

const magic: [string, number[], string][] = [
  ['image/png', [0x89, 0x50, 0x4e, 0x47], 'png'], ['image/jpeg', [0xff, 0xd8, 0xff], 'jpg'],
  ['image/gif', [0x47, 0x49, 0x46, 0x38], 'gif'], ['application/pdf', [0x25, 0x50, 0x44, 0x46], 'pdf'],
  ['application/zip', [0x50, 0x4b, 0x03, 0x04], 'zip'], ['image/webp', [0x52, 0x49, 0x46, 0x46], 'webp']
]

const decoded = computed(() => {
  let raw = source.value.trim()
  if (!raw) return null
  let declared = ''
  const m = raw.match(/^data:([^;,]*)(?:;[^,]*)?,/i)
  if (m) {
    declared = m[1] ?? ''
    raw = raw.slice(m[0].length)
  }
  try {
    const bytes = base64ToBytes(raw)
    const sniff = magic.find(([, sig]) => sig.every((b, i) => bytes[i] === b))
    const type = declared || sniff?.[0] || 'application/octet-stream'
    const ext = sniff?.[2] ?? (type.split('/')[1] ?? 'bin').replace(/[^a-z0-9]/gi, '')
    const url = URL.createObjectURL(new Blob([bytes], { type }))
    return { bytes: bytes.length, type, ext, url }
  } catch {
    return { error: 'Not valid Base64.' }
  }
})

watch(decoded, (_, old) => {
  if (old && !('error' in old)) URL.revokeObjectURL(old.url)
})

function download() {
  const d = decoded.value
  if (!d || 'error' in d) return
  const a = document.createElement('a')
  a.href = d.url
  a.download = /\.[a-z0-9]+$/i.test(outName.value) ? outName.value : `${outName.value}.${d.ext}`
  a.click()
}

const fmtSize = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(2)} MB` : n > 1024 ? `${(n / 1024).toFixed(1)} KB` : `${n} B`)
</script>

<template>
  <div class="grid items-start gap-6 lg:grid-cols-2">
    <UCard>
      <template #header><h2 class="font-semibold">File → Base64</h2></template>
      <div class="space-y-4">
        <input type="file" class="block w-full cursor-pointer rounded-lg border border-default bg-default text-sm file:mr-3 file:cursor-pointer file:border-0 file:bg-elevated file:px-3 file:py-2 file:text-sm file:font-medium" @change="onFile">
        <p v-if="fileName" class="text-sm text-muted">{{ fileName }} · {{ fmtSize(fileSize) }} · {{ mime || 'unknown type' }}</p>
        <USwitch v-model="asDataUrl" label="Output as data URL" />
        <p v-if="reading" class="text-sm text-muted">Reading…</p>
        <CodeBox v-if="fileOutput" :text="fileOutput" title="Base64" label="Base64" />
      </div>
    </UCard>

    <UCard>
      <template #header><h2 class="font-semibold">Base64 → File</h2></template>
      <div class="space-y-4">
        <UFormField label="Base64 or data URL">
          <UTextarea v-model="source" :rows="6" class="w-full" :ui="{ base: 'font-mono' }" />
        </UFormField>
        <UAlert v-if="decoded && 'error' in decoded" color="error" variant="subtle" :title="decoded.error" />
        <template v-else-if="decoded">
          <p class="text-sm text-muted">{{ decoded.type }} · {{ fmtSize(decoded.bytes) }}</p>
          <img v-if="decoded.type.startsWith('image/')" :src="decoded.url" alt="Preview" class="max-h-64 rounded-lg border border-default">
          <div class="flex items-end gap-3">
            <UFormField label="File name" class="flex-1"><UInput v-model="outName" class="w-full" /></UFormField>
            <UButton icon="i-lucide-download" @click="download">Download</UButton>
          </div>
        </template>
      </div>
    </UCard>
  </div>
</template>
