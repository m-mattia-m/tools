<script setup lang="ts">
definePageMeta({
  title: 'DNS Checker',
  description: 'Query DNS records through Cloudflare and Google resolvers and compare the answers.',
  icon: 'i-lucide-network',
  tags: ['network', 'dns', 'lookup']
})

const ALL = ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT', 'SOA', 'CAA']
const domain = ref('')
const type = ref('A')
const typeItems = [{ label: 'All common types', value: 'ALL' }, ...ALL.map(t => ({ label: t, value: t }))]
const loading = ref(false)
const error = ref('')

interface Row { type: string, status: string, answers: DohAnswer[], error?: string }
const results = ref<Record<DohProvider, Row[]> | null>(null)

const providers: { id: DohProvider, label: string }[] = [
  { id: 'cloudflare', label: 'Cloudflare (1.1.1.1)' },
  { id: 'google', label: 'Google (8.8.8.8)' }
]

async function check() {
  const name = domain.value.trim().replace(/^https?:\/\//, '').replace(/[/?#].*$/, '')
  if (!name) return
  loading.value = true
  error.value = ''
  results.value = null
  const types = type.value === 'ALL' ? ALL : [type.value]
  try {
    const entries = await Promise.all(providers.map(async (p) => {
      const rows = await Promise.all(types.map(async (t): Promise<Row> => {
        try {
          const r = await resolveDns(name, t, p.id)
          return { type: t, status: DNS_STATUS[r.Status] ?? String(r.Status), answers: r.Answer ?? [] }
        } catch (e) {
          return { type: t, status: 'ERROR', answers: [], error: e instanceof Error ? e.message : 'Failed' }
        }
      }))
      return [p.id, rows] as const
    }))
    results.value = Object.fromEntries(entries) as Record<DohProvider, Row[]>
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Lookup failed.'
  } finally {
    loading.value = false
  }
}

const sig = (r: Row) => r.answers.map(a => `${a.type}:${a.data}`).sort().join('|')
const agree = (i: number) => {
  const c = results.value?.cloudflare[i], g = results.value?.google[i]
  return !!c && !!g && sig(c) === sig(g)
}
</script>

<template>
  <div class="space-y-6">
    <UCard>
      <form class="flex flex-wrap gap-2" @submit.prevent="check">
        <UInput v-model="domain" placeholder="example.com" class="min-w-64 flex-1" :ui="{ base: 'font-mono' }" autofocus />
        <USelect v-model="type" :items="typeItems" class="w-48" />
        <UButton type="submit" icon="i-lucide-search" :loading="loading" :disabled="!domain.trim()">Check</UButton>
      </form>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" :title="error" />

    <div v-if="results" class="space-y-4">
      <div class="flex flex-wrap gap-2">
        <UBadge
          v-for="(r, i) in results.cloudflare" :key="r.type"
          :color="agree(i) ? 'success' : 'warning'" variant="subtle"
        >
          {{ r.type }}: {{ agree(i) ? 'resolvers agree' : 'resolvers differ' }}
        </UBadge>
      </div>
      <div class="grid items-start gap-4 lg:grid-cols-2">
        <UCard v-for="p in providers" :key="p.id">
          <template #header><h2 class="font-semibold">{{ p.label }}</h2></template>
          <div class="space-y-4">
            <div v-for="row in results[p.id]" :key="row.type">
              <div class="mb-1 flex items-center gap-2">
                <UBadge color="neutral" variant="subtle">{{ row.type }}</UBadge>
                <span class="text-xs" :class="row.status === 'NOERROR' ? 'text-muted' : 'text-error'">{{ row.error ?? row.status }}</span>
              </div>
              <div v-if="row.answers.length" class="divide-y divide-default rounded-lg border border-default text-sm">
                <div v-for="(a, i) in row.answers" :key="i" class="flex items-start justify-between gap-3 px-3 py-1.5">
                  <span class="break-all font-mono">{{ a.data }}</span>
                  <span class="shrink-0 text-xs text-muted">{{ DNS_TYPES[a.type] ?? a.type }} · TTL {{ a.TTL }}</span>
                </div>
              </div>
              <p v-else-if="row.status === 'NOERROR'" class="text-sm text-muted">No records.</p>
            </div>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>
