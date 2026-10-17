<script setup lang="ts">
definePageMeta({
  title: 'Time Zone Calculator',
  description: 'Convert a date and time from one time zone to one or more others.',
  icon: 'i-lucide-globe',
  tags: ['time', 'converter']
})

const zones = Intl.supportedValuesOf('timeZone')
const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone

function toLocalInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

const when = ref(toLocalInput(new Date()))
const from = ref(localZone)
const targets = ref(['UTC', 'America/New_York', 'Asia/Tokyo'])
const addZone = ref<string | undefined>()

watch(addZone, (z) => {
  if (z && !targets.value.includes(z)) targets.value.push(z)
  addZone.value = undefined
})

function wallClock(utcMs: number, tz: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric'
  }).formatToParts(new Date(utcMs))
  const g = (t: string) => Number(parts.find(p => p.type === t)?.value)
  return Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second'))
}
const offsetMs = (utcMs: number, tz: string) => wallClock(utcMs, tz) - Math.floor(utcMs / 1000) * 1000

/** Interprets a wall-clock time in `tz` and returns the UTC instant. */
function zonedToUtc(local: string, tz: string) {
  const m = local.match(/^(\d+)-(\d+)-(\d+)T(\d+):(\d+)/)
  if (!m) return null
  const [y, mo, d, h, mi] = m.slice(1).map(Number) as [number, number, number, number, number]
  const guess = Date.UTC(y, mo - 1, d, h, mi)
  const o1 = offsetMs(guess, tz)
  const utc = guess - o1
  const o2 = offsetMs(utc, tz)
  return o1 === o2 ? utc : guess - o2
}

function offsetLabel(ms: number) {
  const mins = Math.round(ms / 60000)
  const sign = mins < 0 ? '−' : '+'
  const a = Math.abs(mins)
  return `UTC${sign}${Math.floor(a / 60)}${a % 60 ? `:${String(a % 60).padStart(2, '0')}` : ''}`
}

const rows = computed(() => {
  const utc = zonedToUtc(when.value, from.value)
  if (utc === null) return []
  const fromWall = wallClock(utc, from.value)
  return targets.value.map((tz) => {
    const off = offsetMs(utc, tz)
    const wall = wallClock(utc, tz)
    const dayDiff = Math.round((Math.floor(wall / 86400000) * 86400000 - Math.floor(fromWall / 86400000) * 86400000) / 86400000)
    const d = new Date(wall)
    return {
      tz,
      offset: offsetLabel(off),
      date: new Intl.DateTimeFormat(undefined, { timeZone: 'UTC', dateStyle: 'full' }).format(d),
      time: new Intl.DateTimeFormat('sv-SE', { timeZone: 'UTC', timeStyle: 'short' }).format(d),
      dayDiff
    }
  })
})

const fromOffset = computed(() => {
  const utc = zonedToUtc(when.value, from.value)
  return utc === null ? '' : offsetLabel(offsetMs(utc, from.value))
})
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <UCard>
      <div class="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <UFormField label="Date & time">
          <UInput v-model="when" type="datetime-local" class="w-full" />
        </UFormField>
        <UFormField :label="`From time zone ${fromOffset ? `(${fromOffset})` : ''}`">
          <USelectMenu v-model="from" :items="zones" class="w-full" />
        </UFormField>
        <UButton color="neutral" variant="outline" icon="i-lucide-timer" @click="when = toLocalInput(new Date()); from = localZone">Now</UButton>
      </div>
    </UCard>

    <div class="space-y-3">
      <UCard v-for="r in rows" :key="r.tz">
        <div class="flex items-center justify-between gap-4">
          <div>
            <p class="font-semibold">{{ r.tz }} <span class="ml-1 text-sm font-normal text-muted">{{ r.offset }}</span></p>
            <p class="text-sm text-muted">
              {{ r.date }}
              <UBadge v-if="r.dayDiff" color="neutral" variant="subtle" size="sm" class="ml-1">{{ r.dayDiff > 0 ? `+${r.dayDiff}` : r.dayDiff }} day</UBadge>
            </p>
          </div>
          <div class="flex items-center gap-1">
            <p class="font-mono text-3xl font-semibold">{{ r.time }}</p>
            <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="xs" aria-label="Remove" @click="targets = targets.filter(t => t !== r.tz)" />
          </div>
        </div>
      </UCard>
      <USelectMenu v-model="addZone" :items="zones" placeholder="Add time zone…" icon="i-lucide-plus" class="w-full sm:w-72" />
    </div>
  </div>
</template>
