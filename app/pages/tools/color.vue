<script setup lang="ts">
definePageMeta({
  title: 'Color Picker & Converter',
  description: 'Pick a color and get it as HEX, RGB and HSL.',
  icon: 'i-lucide-palette',
  tags: ['color', 'design', 'converter']
})

const hex = ref('#3b82f6')

function parseHex(v: string) {
  let s = v.trim().replace(/^#/, '')
  if (/^[0-9a-f]{3}$/i.test(s)) s = [...s].map(c => c + c).join('')
  return /^[0-9a-f]{6}$/i.test(s) ? s.toLowerCase() : null
}

const valid = computed(() => parseHex(hex.value))

const colors = computed(() => {
  const h = valid.value
  if (!h) return null
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  const d = max - min
  let hue = 0
  if (d) {
    if (max === rn) hue = ((gn - bn) / d) % 6
    else if (max === gn) hue = (bn - rn) / d + 2
    else hue = (rn - gn) / d + 4
  }
  hue = Math.round((hue * 60 + 360) % 360)
  const sat = d ? d / (1 - Math.abs(2 * l - 1)) : 0
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  return {
    hex: `#${h}`,
    hexUpper: `#${h.toUpperCase()}`,
    rgb: `rgb(${r}, ${g}, ${b})`,
    rgbValues: `${r}, ${g}, ${b}`,
    hsl: `hsl(${hue}, ${Math.round(sat * 100)}%, ${Math.round(l * 100)}%)`,
    textColor: luminance > 0.6 ? '#000' : '#fff'
  }
})

const picker = computed({
  get: () => (valid.value ? `#${valid.value}` : '#000000'),
  set: (v: string) => (hex.value = v)
})

const hasEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window
async function eyedrop() {
  try {
    // EyeDropper is not in the TS DOM lib yet
    const result = await new (window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper().open()
    hex.value = result.sRGBHex
  } catch {
    // cancelled
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <UCard>
      <div class="space-y-4">
        <div
          class="flex h-40 items-center justify-center rounded-lg border border-default text-2xl font-semibold"
          :style="{ backgroundColor: colors?.hex ?? 'transparent', color: colors?.textColor }"
        >
          {{ colors?.hexUpper ?? 'Invalid color' }}
        </div>
        <div class="flex flex-wrap items-end gap-3">
          <input v-model="picker" type="color" class="h-10 w-16 cursor-pointer rounded-md border border-default bg-transparent">
          <UFormField label="HEX" class="flex-1">
            <UInput v-model="hex" class="w-full" :ui="{ base: 'font-mono' }" :color="valid ? undefined : 'error'" />
          </UFormField>
          <UButton v-if="hasEyeDropper" icon="i-lucide-pipette" color="neutral" variant="outline" @click="eyedrop">Pick from screen</UButton>
        </div>
      </div>
    </UCard>

    <div v-if="colors" class="grid gap-4 sm:grid-cols-2">
      <CodeBox :text="colors.hex" title="HEX" />
      <CodeBox :text="colors.rgb" title="RGB" />
      <CodeBox :text="colors.rgbValues" title="RGB values" />
      <CodeBox :text="colors.hsl" title="HSL" />
    </div>
  </div>
</template>
