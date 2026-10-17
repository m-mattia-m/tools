<script setup lang="ts">
definePageMeta({
  title: 'Ping Test',
  description: 'Measure HTTP round-trip latency to a host from your browser (not ICMP).',
  icon: 'i-lucide-activity',
  tags: ['network', 'latency']
})

const target = ref('')
const count = ref(5)
const running = ref(false)
const samples = ref<(number | null)[]>([])
const resolved = ref('')
let stop = false

function normalize(v: string) {
  const t = v.trim()
  if (!t) return ''
  return /^https?:\/\//i.test(t) ? t : `https://${t}`
}

async function ping(url: string) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 5000)
  const sep = url.includes('?') ? '&' : '?'
  const t0 = performance.now()
  try {
    // no-cors: we can't read the response, but resolving means the server answered
    await fetch(`${url}${sep}_ping=${Date.now()}`, { mode: 'no-cors', cache: 'no-store', signal: ctrl.signal })
    return Math.round((performance.now() - t0) * 10) / 10
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function start() {
  const url = normalize(target.value)
  if (!url) return
  resolved.value = url
  samples.value = []
  running.value = true
  stop = false
  const n = Math.min(Math.max(Math.floor(count.value) || 1, 1), 50)
  for (let i = 0; i < n && !stop; i++) {
    samples.value = [...samples.value, await ping(url)]
    if (i < n - 1) await new Promise(r => setTimeout(r, 400))
  }
  running.value = false
}

const ok = computed(() => samples.value.filter((s): s is number => s !== null))
const stats = computed(() => {
  const v = ok.value
  if (!v.length) return null
  const avg = v.reduce((a, b) => a + b, 0) / v.length
  const jitter = v.length > 1 ? v.slice(1).reduce((s, x, i) => s + Math.abs(x - v[i]!), 0) / (v.length - 1) : 0
  return {
    min: Math.min(...v), max: Math.max(...v), avg, jitter,
    loss: Math.round(((samples.value.length - v.length) / samples.value.length) * 100)
  }
})
const maxBar = computed(() => Math.max(...ok.value, 1))
const f = (n: number) => `${n.toFixed(1)} ms`
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <UCard>
      <form class="flex flex-wrap items-end gap-3" @submit.prevent="start">
        <UFormField label="Host or URL" class="min-w-56 flex-1">
          <UInput v-model="target" placeholder="example.com" class="w-full" :ui="{ base: 'font-mono' }" autofocus />
        </UFormField>
        <UFormField label="Pings"><UInput v-model.number="count" type="number" :min="1" :max="50" class="w-24" /></UFormField>
        <UButton v-if="!running" type="submit" icon="i-lucide-play" :disabled="!target.trim()">Start</UButton>
        <UButton v-else color="neutral" variant="outline" icon="i-lucide-square" @click="stop = true">Stop</UButton>
      </form>
      <p class="mt-3 text-xs text-muted">
        Browsers cannot send ICMP pings, so this times a full HTTP(S) request from your device. The first sample usually includes DNS and TLS setup and is slower.
      </p>
    </UCard>

    <template v-if="samples.length">
      <div v-if="stats" class="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <UCard v-for="[label, value] in [['Min', f(stats.min)], ['Avg', f(stats.avg)], ['Max', f(stats.max)], ['Jitter', f(stats.jitter)], ['Loss', `${stats.loss}%`]]" :key="label">
          <p class="text-sm text-muted">{{ label }}</p>
          <p class="text-lg font-semibold tabular-nums">{{ value }}</p>
        </UCard>
      </div>
      <UCard>
        <div class="space-y-1.5 font-mono text-sm">
          <div v-for="(s, i) in samples" :key="i" class="flex items-center gap-3">
            <span class="w-6 text-right text-muted">{{ i + 1 }}</span>
            <div class="h-2 flex-1 overflow-hidden rounded-full bg-elevated">
              <div v-if="s !== null" class="h-full rounded-full bg-inverted" :style="{ width: `${(s / maxBar) * 100}%` }" />
            </div>
            <span class="w-24 text-right" :class="s === null ? 'text-error' : ''">{{ s === null ? 'timeout' : f(s) }}</span>
          </div>
        </div>
      </UCard>
    </template>
  </div>
</template>
