<script setup lang="ts">
import { zipSync } from 'fflate'

definePageMeta({
  title: 'Image Compressor',
  description: 'Compress and resize images locally: JPEG, WebP or PNG. Nothing is uploaded.',
  icon: 'i-lucide-image-down',
  tags: ['image', 'converter', 'files']
})

interface Item {
  id: number
  file: File
  originalUrl: string
  width: number
  height: number
  out?: { blob: Blob, url: string, width: number, height: number, name: string }
  error?: string
}

const format = ref<'image/jpeg' | 'image/webp' | 'image/png'>('image/webp')
const formatItems = [
  { label: 'WebP (smallest)', value: 'image/webp' },
  { label: 'JPEG', value: 'image/jpeg' },
  { label: 'PNG (lossless)', value: 'image/png' }
]
const quality = ref(80)
const maxSize = ref<number | undefined>(undefined)
const items = ref<Item[]>([])
const dragging = ref(false)
let nextId = 1

const ext: Record<string, string> = { 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/png': 'png' }

async function encode(item: Item) {
  try {
    const bitmap = await createImageBitmap(item.file)
    let w = bitmap.width
    let h = bitmap.height
    const limit = maxSize.value && maxSize.value > 0 ? maxSize.value : 0
    if (limit && Math.max(w, h) > limit) {
      const scale = limit / Math.max(w, h)
      w = Math.max(1, Math.round(w * scale))
      h = Math.max(1, Math.round(h * scale))
    }
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    if (format.value === 'image/jpeg') {
      ctx.fillStyle = '#fff' // JPEG has no transparency
      ctx.fillRect(0, 0, w, h)
    }
    ctx.drawImage(bitmap, 0, 0, w, h)
    item.width = bitmap.width
    item.height = bitmap.height
    bitmap.close()
    const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, format.value, quality.value / 100))
    if (!blob) throw new Error('This browser cannot encode that format.')
    if (item.out) URL.revokeObjectURL(item.out.url)
    const base = item.file.name.replace(/\.[^.]+$/, '')
    item.out = { blob, url: URL.createObjectURL(blob), width: w, height: h, name: `${base}.${ext[blob.type] ?? 'img'}` }
    item.error = undefined
  } catch (e) {
    item.error = e instanceof Error ? e.message : 'Could not process this image.'
  }
}

async function addFiles(files: FileList | File[]) {
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue
    const item = reactive<Item>({ id: nextId++, file, originalUrl: URL.createObjectURL(file), width: 0, height: 0 })
    items.value.push(item)
    await encode(item)
  }
}

function onPick(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files) addFiles(input.files)
  input.value = ''
}

function onDrop(e: DragEvent) {
  dragging.value = false
  if (e.dataTransfer?.files) addFiles(e.dataTransfer.files)
}

let timer: ReturnType<typeof setTimeout> | undefined
watch([format, quality, maxSize], () => {
  clearTimeout(timer)
  timer = setTimeout(() => items.value.forEach(encode), 250)
})

function remove(item: Item) {
  URL.revokeObjectURL(item.originalUrl)
  if (item.out) URL.revokeObjectURL(item.out.url)
  items.value = items.value.filter(i => i.id !== item.id)
}

function clear() {
  [...items.value].forEach(remove)
}
onBeforeUnmount(clear)

function download(name: string, url: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
}

async function downloadAll() {
  const files: Record<string, Uint8Array> = {}
  for (const i of items.value) {
    if (!i.out) continue
    let name = i.out.name
    for (let n = 1; name in files; n++) name = i.out.name.replace(/(\.[^.]+)$/, `-${n}$1`)
    files[name] = new Uint8Array(await i.out.blob.arrayBuffer())
  }
  const zip = zipSync(files, { level: 0 })
  const url = URL.createObjectURL(new Blob([zip as Uint8Array<ArrayBuffer>], { type: 'application/zip' }))
  download('compressed-images.zip', url)
  URL.revokeObjectURL(url)
}

const fmtSize = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(2)} MB` : n > 1024 ? `${(n / 1024).toFixed(1)} KB` : `${n} B`)
const saving = (i: Item) => (i.out ? Math.round((1 - i.out.blob.size / i.file.size) * 100) : 0)

const totals = computed(() => {
  const done = items.value.filter(i => i.out)
  const before = done.reduce((s, i) => s + i.file.size, 0)
  const after = done.reduce((s, i) => s + i.out!.blob.size, 0)
  return { before, after, pct: before ? Math.round((1 - after / before) * 100) : 0, count: done.length }
})
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-6">
    <UCard>
      <div class="space-y-5">
        <label
          class="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-accented px-6 py-10 text-center transition"
          :class="dragging ? 'bg-elevated' : 'hover:bg-elevated/50'"
          @dragover.prevent="dragging = true"
          @dragleave="dragging = false"
          @drop.prevent="onDrop"
        >
          <UIcon name="i-lucide-image-up" class="size-8 text-muted" />
          <span class="font-medium">Drop images here or click to choose</span>
          <span class="text-sm text-muted">PNG, JPEG, WebP, AVIF, BMP · processed locally in your browser</span>
          <input type="file" accept="image/*" multiple class="hidden" @change="onPick">
        </label>

        <div class="grid gap-4 sm:grid-cols-3">
          <UFormField label="Output format"><USelect v-model="format" :items="formatItems" class="w-full" /></UFormField>
          <UFormField :label="`Quality: ${quality}%`" :hint="format === 'image/png' ? 'ignored for PNG' : undefined">
            <USlider v-model="quality" :min="10" :max="100" :disabled="format === 'image/png'" class="pt-2" />
          </UFormField>
          <UFormField label="Max width / height (px)" hint="optional">
            <UInput v-model.number="maxSize" type="number" :min="16" placeholder="Keep original size" class="w-full" />
          </UFormField>
        </div>
      </div>
    </UCard>

    <div v-if="items.length" class="flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm text-muted">
        {{ totals.count }} image{{ totals.count === 1 ? '' : 's' }}: {{ fmtSize(totals.before) }} → {{ fmtSize(totals.after) }}
        <UBadge :color="totals.pct > 0 ? 'success' : 'warning'" variant="subtle" class="ml-1">{{ totals.pct > 0 ? `−${totals.pct}%` : `+${-totals.pct}%` }}</UBadge>
      </p>
      <div class="flex gap-2">
        <UButton v-if="items.length > 1" icon="i-lucide-archive" size="sm" @click="downloadAll">Download all (.zip)</UButton>
        <UButton icon="i-lucide-trash-2" size="sm" color="neutral" variant="outline" @click="clear">Clear</UButton>
      </div>
    </div>

    <div class="space-y-3">
      <UCard v-for="item in items" :key="item.id">
        <div class="flex flex-wrap items-center gap-4">
          <div class="grid grid-cols-2 gap-2">
            <div class="space-y-1 text-center">
              <img :src="item.originalUrl" alt="Original" class="size-24 rounded-md border border-default object-cover">
              <p class="text-xs text-muted">Original</p>
            </div>
            <div class="space-y-1 text-center">
              <img v-if="item.out" :src="item.out.url" alt="Compressed" class="size-24 rounded-md border border-default object-cover">
              <div v-else class="flex size-24 items-center justify-center rounded-md border border-dashed border-default text-xs text-muted">…</div>
              <p class="text-xs text-muted">Compressed</p>
            </div>
          </div>

          <div class="min-w-0 flex-1 space-y-1">
            <p class="truncate font-medium">{{ item.file.name }}</p>
            <p v-if="item.error" class="text-sm text-error">{{ item.error }}</p>
            <template v-else-if="item.out">
              <p class="text-sm text-muted">{{ item.width }}×{{ item.height }} → {{ item.out.width }}×{{ item.out.height }}</p>
              <p class="text-sm">
                {{ fmtSize(item.file.size) }} → <span class="font-semibold">{{ fmtSize(item.out.blob.size) }}</span>
                <UBadge :color="saving(item) > 0 ? 'success' : 'warning'" variant="subtle" class="ml-1">
                  {{ saving(item) > 0 ? `−${saving(item)}%` : `+${-saving(item)}%` }}
                </UBadge>
              </p>
            </template>
          </div>

          <div class="flex gap-1">
            <UButton v-if="item.out" icon="i-lucide-download" size="sm" @click="download(item.out.name, item.out.url)">Download</UButton>
            <UButton icon="i-lucide-x" size="sm" color="neutral" variant="ghost" aria-label="Remove" @click="remove(item)" />
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
