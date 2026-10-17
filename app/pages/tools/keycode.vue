<script setup lang="ts">
definePageMeta({
  title: 'Keycode Info',
  description: 'Press any key to see its key, code, keyCode, location and modifiers.',
  icon: 'i-lucide-keyboard',
  tags: ['dev', 'web', 'keyboard']
})

interface KeyInfo {
  key: string
  code: string
  keyCode: number
  location: string
  modifiers: string[]
  repeat: boolean
}

const locations = ['Standard', 'Left', 'Right', 'Numpad']
const current = ref<KeyInfo | null>(null)
const history = ref<KeyInfo[]>([])

function onKey(e: KeyboardEvent) {
  const target = e.target as HTMLElement | null
  if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
  e.preventDefault()
  const info: KeyInfo = {
    key: e.key,
    code: e.code,
    keyCode: e.keyCode,
    location: locations[e.location] ?? 'Standard',
    modifiers: [e.ctrlKey && 'Ctrl', e.shiftKey && 'Shift', e.altKey && 'Alt', e.metaKey && 'Meta'].filter(Boolean) as string[],
    repeat: e.repeat
  }
  current.value = info
  if (!e.repeat) history.value = [info, ...history.value].slice(0, 8)
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

const rows = computed(() => {
  const c = current.value
  if (!c) return []
  return [
    ['event.key', JSON.stringify(c.key)], ['event.code', JSON.stringify(c.code)],
    ['event.keyCode (deprecated)', String(c.keyCode)], ['event.location', `${c.location}`],
    ['Modifiers', c.modifiers.join(' + ') || 'none'], ['event.repeat', String(c.repeat)]
  ] as [string, string][]
})
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <UCard>
      <div class="flex min-h-48 flex-col items-center justify-center gap-2 text-center">
        <template v-if="current">
          <p class="rounded-xl border border-default bg-elevated px-8 py-4 font-mono text-5xl font-semibold">
            {{ current.key === ' ' ? 'Space' : current.key }}
          </p>
          <p class="text-muted">keyCode <span class="font-mono text-default">{{ current.keyCode }}</span> · code <span class="font-mono text-default">{{ current.code }}</span></p>
        </template>
        <template v-else>
          <UIcon name="i-lucide-keyboard" class="size-10 text-muted" />
          <p class="text-muted">Press any key…</p>
        </template>
      </div>
    </UCard>

    <div v-if="rows.length" class="grid gap-3 sm:grid-cols-2">
      <CodeBox v-for="[label, value] in rows" :key="label" :title="label" :text="value" />
    </div>

    <div v-if="history.length > 1" class="space-y-2">
      <h2 class="text-sm font-medium text-muted">History</h2>
      <div class="flex flex-wrap gap-2">
        <UBadge v-for="(h, i) in history" :key="i" color="neutral" variant="subtle" size="lg" class="font-mono">
          {{ h.modifiers.length ? `${h.modifiers.join('+')}+` : '' }}{{ h.key === ' ' ? 'Space' : h.key }}
        </UBadge>
      </div>
    </div>
  </div>
</template>
