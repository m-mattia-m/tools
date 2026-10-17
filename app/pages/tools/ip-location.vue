<script setup lang="ts">
definePageMeta({
  title: 'IP Location Finder',
  description: 'Look up the location, ISP and time zone of an IP address or domain (leave empty for your own IP).',
  icon: 'i-lucide-map-pin',
  tags: ['network', 'ip', 'lookup']
})

interface IpInfo {
  success: boolean
  message?: string
  ip: string
  type: string
  continent: string
  country: string
  country_code: string
  region: string
  city: string
  postal: string
  latitude: number
  longitude: number
  flag?: { emoji: string }
  connection?: { asn: number, org: string, isp: string, domain: string }
  timezone?: { id: string, utc: string, current_time: string }
}

const query = ref('')
const loading = ref(false)
const error = ref('')
const info = ref<IpInfo | null>(null)
const resolvedFrom = ref('')

const isIp = (v: string) => /^[\d.]+$/.test(v) || v.includes(':')

async function lookup() {
  loading.value = true
  error.value = ''
  info.value = null
  resolvedFrom.value = ''
  try {
    let target = query.value.trim().replace(/^https?:\/\//, '').replace(/[/?#].*$/, '')
    if (target && !isIp(target)) {
      const dns = await resolveDns(target, 'A')
      const a = dns.Answer?.find(r => r.type === 1)
      if (!a) throw new Error(`Could not resolve "${target}" to an IPv4 address.`)
      resolvedFrom.value = target
      target = a.data
    }
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(target)}`)
    const data: IpInfo = await res.json()
    if (!data.success) throw new Error(data.message || 'Lookup failed.')
    info.value = data
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Lookup failed.'
  } finally {
    loading.value = false
  }
}

onMounted(lookup)

const rows = computed(() => {
  const i = info.value
  if (!i) return []
  return ([
    ['IP address', i.ip], ['Type', i.type], ['Country', `${i.flag?.emoji ?? ''} ${i.country} (${i.country_code})`],
    ['Region', i.region], ['City', i.city], ['Postal code', i.postal], ['Continent', i.continent],
    ['Coordinates', `${i.latitude}, ${i.longitude}`], ['Time zone', i.timezone ? `${i.timezone.id} (UTC${i.timezone.utc})` : ''],
    ['ISP', i.connection?.isp ?? ''], ['Organisation', i.connection?.org ?? ''],
    ['ASN', i.connection?.asn ? `AS${i.connection.asn}` : ''], ['Domain', i.connection?.domain ?? '']
  ] as [string, string][]).filter(([, v]) => v && v.trim())
})

const mapUrl = computed(() => {
  const i = info.value
  if (!i) return ''
  const d = 0.08
  return `https://www.openstreetmap.org/export/embed.html?bbox=${i.longitude - d},${i.latitude - d},${i.longitude + d},${i.latitude + d}&layer=mapnik&marker=${i.latitude},${i.longitude}`
})
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-6">
    <UCard>
      <form class="flex gap-2" @submit.prevent="lookup">
        <UInput v-model="query" placeholder="IP address or domain — empty for your own IP" class="flex-1" :ui="{ base: 'font-mono' }" />
        <UButton type="submit" icon="i-lucide-search" :loading="loading">Look up</UButton>
      </form>
      <p class="mt-2 text-xs text-muted">The lookup is made from your browser via ipwho.is (domains are resolved with Cloudflare DNS-over-HTTPS).</p>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" icon="i-lucide-circle-alert" :title="error" />

    <div v-if="info" class="grid items-start gap-6 lg:grid-cols-2">
      <UCard>
        <template v-if="resolvedFrom" #header><p class="text-sm text-muted">{{ resolvedFrom }} resolves to {{ info.ip }}</p></template>
        <dl class="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-2 text-sm">
          <template v-for="[k, v] in rows" :key="k">
            <dt class="text-muted">{{ k }}</dt>
            <dd class="break-all font-mono">{{ v }}</dd>
          </template>
        </dl>
      </UCard>
      <UCard :ui="{ body: 'p-0 sm:p-0' }">
        <iframe :src="mapUrl" title="Map" class="h-96 w-full rounded-xl" loading="lazy" />
      </UCard>
    </div>
  </div>
</template>
