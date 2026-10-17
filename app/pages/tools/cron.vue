<script setup lang="ts">
import cronstrue from 'cronstrue'

definePageMeta({
  title: 'Crontab Generator',
  description: 'Build a cron expression, read it in plain English and preview the next runs.',
  icon: 'i-lucide-calendar-clock',
  tags: ['cron', 'time', 'generator', 'dev']
})

const fields = reactive({ minute: '*/15', hour: '*', dom: '*', month: '*', dow: '1-5' })

const defs = [
  { key: 'minute', label: 'Minute', hint: '0–59', min: 0, max: 59 },
  { key: 'hour', label: 'Hour', hint: '0–23', min: 0, max: 23 },
  { key: 'dom', label: 'Day of month', hint: '1–31', min: 1, max: 31 },
  { key: 'month', label: 'Month', hint: '1–12 or JAN–DEC', min: 1, max: 12, names: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'], offset: 1 },
  { key: 'dow', label: 'Day of week', hint: '0–6 (Sun=0) or SUN–SAT', min: 0, max: 7, names: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'], offset: 0 }
] as const

const presets = [
  { label: 'Every minute', v: ['*', '*', '*', '*', '*'] },
  { label: 'Every 5 minutes', v: ['*/5', '*', '*', '*', '*'] },
  { label: 'Hourly', v: ['0', '*', '*', '*', '*'] },
  { label: 'Daily at midnight', v: ['0', '0', '*', '*', '*'] },
  { label: 'Weekdays at 09:00', v: ['0', '9', '*', '*', '1-5'] },
  { label: 'Weekly (Sunday 00:00)', v: ['0', '0', '*', '*', '0'] },
  { label: 'Monthly (1st, 00:00)', v: ['0', '0', '1', '*', '*'] },
  { label: 'Yearly (Jan 1st)', v: ['0', '0', '1', '1', '*'] }
]

function applyPreset(v: string[]) {
  ;[fields.minute, fields.hour, fields.dom, fields.month, fields.dow] = v as [string, string, string, string, string]
}

const expression = computed(() => `${fields.minute} ${fields.hour} ${fields.dom} ${fields.month} ${fields.dow}`.replace(/\s+/g, ' ').trim())

function parseField(raw: string, def: (typeof defs)[number]): Set<number> {
  const out = new Set<number>()
  const names: readonly string[] | undefined = 'names' in def ? def.names : undefined
  const offset = 'offset' in def ? def.offset : 0
  const num = (s: string) => {
    const idx = names?.indexOf(s.toUpperCase()) ?? -1
    if (idx >= 0) return idx + offset
    if (!/^\d+$/.test(s)) throw new Error(`"${s}" is not a number`)
    return Number(s)
  }
  for (const part of raw.split(',')) {
    const [range = '', stepStr] = part.split('/')
    const step = stepStr === undefined ? 1 : Number(stepStr)
    if (!Number.isInteger(step) || step < 1) throw new Error(`Invalid step in "${part}"`)
    let lo: number, hi: number
    if (range === '*') [lo, hi] = [def.min, def.key === 'dow' ? 6 : def.max]
    else if (range.includes('-')) {
      const [a = '', b = ''] = range.split('-')
      ;[lo, hi] = [num(a), num(b)]
    } else {
      lo = num(range)
      hi = stepStr === undefined ? lo : def.max
    }
    if (lo < def.min || hi > def.max || lo > hi) throw new Error(`Value out of range (${def.hint}) in "${part}"`)
    for (let i = lo; i <= hi; i += step) out.add(def.key === 'dow' && i === 7 ? 0 : i)
  }
  return out
}

const parsed = computed(() => {
  try {
    const sets = defs.map(d => parseField(fields[d.key].trim(), d))
    return { sets }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Invalid expression' }
  }
})

const description = computed(() => {
  if ('error' in parsed.value) return ''
  try { return cronstrue.toString(expression.value, { use24HourTimeFormat: true }) } catch { return '' }
})

const nextRuns = computed(() => {
  if ('error' in parsed.value) return []
  const [mins, hours, doms, months, dows] = parsed.value.sets as [Set<number>, Set<number>, Set<number>, Set<number>, Set<number>]
  const domStar = fields.dom.trim().startsWith('*')
  const dowStar = fields.dow.trim().startsWith('*')
  const runs: Date[] = []
  const day = new Date()
  day.setHours(0, 0, 0, 0)
  const now = Date.now()
  for (let i = 0; i < 366 * 5 && runs.length < 8; i++, day.setDate(day.getDate() + 1)) {
    if (!months.has(day.getMonth() + 1)) continue
    const domOk = doms.has(day.getDate())
    const dowOk = dows.has(day.getDay())
    const dayOk = !domStar && !dowStar ? domOk || dowOk : domOk && dowOk
    if (!dayOk) continue
    for (const h of [...hours].sort((a, b) => a - b)) {
      for (const m of [...mins].sort((a, b) => a - b)) {
        const d = new Date(day)
        d.setHours(h, m, 0, 0)
        if (d.getTime() > now && runs.length < 8) runs.push(d)
      }
    }
  }
  return runs
})

const fmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeStyle: 'short' })
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <UCard>
      <div class="space-y-5">
        <div class="flex flex-wrap gap-2">
          <UButton v-for="p in presets" :key="p.label" size="xs" color="neutral" variant="outline" @click="applyPreset(p.v)">{{ p.label }}</UButton>
        </div>
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <UFormField v-for="d in defs" :key="d.key" :label="d.label" :hint="d.hint" :ui="{ hint: 'text-[10px]' }">
            <UInput v-model="fields[d.key]" class="w-full" :ui="{ base: 'font-mono text-center' }" />
          </UFormField>
        </div>
      </div>
    </UCard>

    <UAlert v-if="'error' in parsed" color="error" variant="subtle" icon="i-lucide-circle-alert" title="Invalid cron expression" :description="parsed.error" />
    <template v-else>
      <UCard>
        <div class="flex flex-col items-center gap-2 py-2 text-center">
          <div class="flex items-center gap-1">
            <p class="font-mono text-3xl font-semibold tracking-wide">{{ expression }}</p>
            <CopyButton :text="expression" label="cron expression" />
          </div>
          <p class="text-lg text-muted">{{ description }}</p>
        </div>
      </UCard>
      <UCard>
        <template #header><h2 class="font-semibold">Next runs <span class="font-normal text-muted">(your time zone)</span></h2></template>
        <ol class="space-y-1 text-sm">
          <li v-for="(d, i) in nextRuns" :key="i" class="flex gap-3">
            <span class="w-5 text-muted">{{ i + 1 }}.</span>{{ fmt.format(d) }}
          </li>
          <li v-if="!nextRuns.length" class="text-muted">No run within the next 5 years.</li>
        </ol>
      </UCard>
    </template>
  </div>
</template>
