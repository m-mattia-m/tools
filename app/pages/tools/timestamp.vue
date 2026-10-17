<script setup lang="ts">
definePageMeta({
  title: 'Expiry / Timestamp Converter',
  description: 'Turn a huge Unix timestamp (e.g. a JWT exp claim) into a readable date and time.',
  icon: 'i-lucide-clock',
  tags: ['time', 'jwt', 'converter']
})

type Unit = 'auto' | 's' | 'ms' | 'us' | 'ns'

const route = useRoute()

const input = ref(typeof route.query.value === 'string' ? route.query.value : '')
const unit = ref<Unit>('auto')

const unitItems = [
  { label: 'Auto-detect', value: 'auto' },
  { label: 'Seconds', value: 's' },
  { label: 'Milliseconds', value: 'ms' },
  { label: 'Microseconds', value: 'us' },
  { label: 'Nanoseconds', value: 'ns' }
]

const unitLabel: Record<Exclude<Unit, 'auto'>, string> = {
  s: 'seconds',
  ms: 'milliseconds',
  us: 'microseconds',
  ns: 'nanoseconds'
}

// 1 unit expressed in nanoseconds
const nsPerUnit: Record<Exclude<Unit, 'auto'>, bigint> = {
  s: 1_000_000_000n,
  ms: 1_000_000n,
  us: 1_000n,
  ns: 1n
}

function detectUnit(value: bigint): Exclude<Unit, 'auto'> {
  const abs = value < 0n ? -value : value
  if (abs < 100_000_000_000n) return 's' // up to year ~5138
  if (abs < 100_000_000_000_000n) return 'ms'
  if (abs < 100_000_000_000_000_000n) return 'us'
  return 'ns'
}

const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  timer = setInterval(() => (now.value = Date.now()), 1000)
})
onBeforeUnmount(() => clearInterval(timer))

const result = computed(() => {
  const raw = input.value.trim().replace(/[\s_,']/g, '')
  if (!raw) return null
  if (!/^-?\d+$/.test(raw)) return { error: 'Please enter a whole number (digits only).' }

  const value = BigInt(raw)
  const detected = detectUnit(value)
  const used = unit.value === 'auto' ? detected : unit.value
  const ms = Number(value * nsPerUnit[used] / 1_000_000n)
  const date = new Date(ms)
  if (Number.isNaN(date.getTime())) {
    return { error: `This number is out of range for a date when read as ${unitLabel[used]}.` }
  }

  return { date, used, detected, ms }
})

const tz = Intl.DateTimeFormat().resolvedOptions().timeZone

const formatted = computed(() => {
  const r = result.value
  if (!r || 'error' in r) return null
  const { date } = r
  return {
    local: new Intl.DateTimeFormat(undefined, {
      dateStyle: 'full',
      timeStyle: 'long'
    }).format(date),
    localShort: new Intl.DateTimeFormat('sv-SE', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).format(date),
    iso: date.toISOString(),
    utc: date.toUTCString(),
    seconds: Math.floor(r.ms / 1000)
  }
})

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

const relative = computed(() => {
  const r = result.value
  if (!r || 'error' in r) return null
  const diff = r.ms - now.value
  const past = diff < 0
  let s = Math.floor(Math.abs(diff) / 1000)
  const units: [string, number][] = [['year', 31_536_000], ['day', 86_400], ['hour', 3_600], ['minute', 60], ['second', 1]]
  const parts: string[] = []
  for (const [name, size] of units) {
    const n = Math.floor(s / size)
    if (n > 0 && parts.length < 3) parts.push(plural(n, name))
    s -= n * size
  }
  const text = parts.join(', ') || '0 seconds'
  return { past, text: past ? `${text} ago` : `in ${text}` }
})

function setNow() {
  input.value = String(Math.floor(Date.now() / 1000))
  unit.value = 's'
}

async function paste() {
  try {
    input.value = (await navigator.clipboard.readText()).trim()
  } catch {
    // clipboard access denied: user can paste manually
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <UCard>
      <div class="space-y-4">
        <UFormField label="Timestamp" description="Seconds, milliseconds, microseconds or nanoseconds since 1970-01-01 UTC.">
          <UInput
            v-model="input"
            placeholder="e.g. 1893456000 or 1893456000000"
            size="xl"
            class="w-full"
            :ui="{ base: 'font-mono' }"
            autofocus
          >
            <template #trailing>
              <UButton icon="i-lucide-clipboard-paste" color="neutral" variant="ghost" size="sm" aria-label="Paste" @click="paste" />
            </template>
          </UInput>
        </UFormField>

        <div class="flex flex-wrap items-end gap-3">
          <UFormField label="Unit">
            <USelect v-model="unit" :items="unitItems" class="w-48" />
          </UFormField>
          <UButton icon="i-lucide-timer" color="neutral" variant="outline" @click="setNow">Use current time</UButton>
          <UButton icon="i-lucide-eraser" color="neutral" variant="ghost" :disabled="!input" @click="input = ''">Clear</UButton>
        </div>
      </div>
    </UCard>

    <UAlert
      v-if="result && 'error' in result"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :title="result.error"
    />

    <UCard v-else-if="result && formatted && relative">
      <div class="space-y-5">
        <div class="flex flex-wrap items-center gap-2">
          <UBadge :color="relative.past ? 'error' : 'success'" variant="subtle" size="lg">
            {{ relative.past ? 'Expired' : 'Still valid' }}
          </UBadge>
          <span class="text-muted">{{ relative.text }}</span>
        </div>

        <div>
          <p class="text-sm text-muted">Your time zone ({{ tz }})</p>
          <div class="flex items-center gap-1">
            <p class="text-2xl font-semibold">{{ formatted.local }}</p>
            <CopyButton :text="formatted.localShort" label="local time" />
          </div>
          <p class="font-mono text-sm text-muted">{{ formatted.localShort }}</p>
        </div>

        <dl class="grid gap-3 sm:grid-cols-2">
          <div>
            <dt class="text-sm text-muted">UTC</dt>
            <dd class="flex items-center gap-1 font-mono text-sm">{{ formatted.utc }} <CopyButton :text="formatted.utc" label="UTC" /></dd>
          </div>
          <div>
            <dt class="text-sm text-muted">ISO 8601</dt>
            <dd class="flex items-center gap-1 font-mono text-sm">{{ formatted.iso }} <CopyButton :text="formatted.iso" label="ISO date" /></dd>
          </div>
          <div>
            <dt class="text-sm text-muted">Unix seconds</dt>
            <dd class="flex items-center gap-1 font-mono text-sm">{{ formatted.seconds }} <CopyButton :text="String(formatted.seconds)" label="seconds" /></dd>
          </div>
          <div>
            <dt class="text-sm text-muted">Interpreted as</dt>
            <dd class="text-sm">
              {{ unitLabel[result.used] }}
              <span v-if="unit === 'auto'" class="text-muted">(auto-detected)</span>
            </dd>
          </div>
        </dl>
      </div>
    </UCard>
  </div>
</template>
