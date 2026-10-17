<script setup lang="ts">
import QRCode from 'qrcode'

definePageMeta({
  title: 'QR Code Generator',
  description: 'QR codes for text, URLs, Wi-Fi, contacts, email, SMS and phone numbers. Download as PNG or SVG.',
  icon: 'i-lucide-qr-code',
  tags: ['generator', 'qr', 'web']
})

type Kind = 'text' | 'wifi' | 'contact' | 'email' | 'sms' | 'phone'
const kind = ref<Kind>('text')
const kinds = [
  { label: 'Text / URL', value: 'text', icon: 'i-lucide-link' },
  { label: 'Wi-Fi', value: 'wifi', icon: 'i-lucide-wifi' },
  { label: 'Contact', value: 'contact', icon: 'i-lucide-contact' },
  { label: 'Email', value: 'email', icon: 'i-lucide-mail' },
  { label: 'SMS', value: 'sms', icon: 'i-lucide-message-square' },
  { label: 'Phone', value: 'phone', icon: 'i-lucide-phone' }
]

const text = ref('https://example.com')
const wifi = reactive({ ssid: '', password: '', security: 'WPA', hidden: false })
const contact = reactive({ first: '', last: '', org: '', title: '', phone: '', email: '', url: '' })
const email = reactive({ to: '', subject: '', body: '' })
const sms = reactive({ number: '', message: '' })
const phone = ref('')

const ecc = ref<'L' | 'M' | 'Q' | 'H'>('M')
const size = ref(320)
const fg = ref('#000000')
const bg = ref('#ffffff')

const esc = (s: string) => s.replace(/([\;,:"])/g, '\\$1')
const vesc = (s: string) => s.replace(/([\;,])/g, '\\$1').replace(/\n/g, '\\n')

const payload = computed(() => {
  switch (kind.value) {
    case 'wifi':
      return wifi.ssid
        ? `WIFI:T:${wifi.security === 'nopass' ? 'nopass' : wifi.security};S:${esc(wifi.ssid)};${wifi.security === 'nopass' ? '' : `P:${esc(wifi.password)};`}${wifi.hidden ? 'H:true;' : ''};`
        : ''
    case 'contact': {
      const c = contact
      if (!c.first && !c.last && !c.org) return ''
      return [
        'BEGIN:VCARD', 'VERSION:3.0',
        `N:${vesc(c.last)};${vesc(c.first)};;;`,
        `FN:${vesc(`${c.first} ${c.last}`.trim())}`,
        c.org && `ORG:${vesc(c.org)}`,
        c.title && `TITLE:${vesc(c.title)}`,
        c.phone && `TEL:${vesc(c.phone)}`,
        c.email && `EMAIL:${vesc(c.email)}`,
        c.url && `URL:${c.url}`,
        'END:VCARD'
      ].filter(Boolean).join('\n')
    }
    case 'email': {
      if (!email.to) return ''
      const q = [email.subject && `subject=${encodeURIComponent(email.subject)}`, email.body && `body=${encodeURIComponent(email.body)}`].filter(Boolean).join('&')
      return `mailto:${email.to}${q ? `?${q}` : ''}`
    }
    case 'sms':
      return sms.number ? `SMSTO:${sms.number}:${sms.message}` : ''
    case 'phone':
      return phone.value ? `tel:${phone.value}` : ''
    default:
      return text.value
  }
})

const png = ref('')
const svg = ref('')
const error = ref('')

watchEffect(async () => {
  const data = payload.value
  const opts = { errorCorrectionLevel: ecc.value, margin: 2, color: { dark: fg.value, light: bg.value } }
  if (!data) {
    png.value = svg.value = error.value = ''
    return
  }
  try {
    const [p, s] = await Promise.all([
      QRCode.toDataURL(data, { ...opts, width: size.value }),
      QRCode.toString(data, { ...opts, type: 'svg' })
    ])
    png.value = p
    svg.value = s
    error.value = ''
  } catch {
    png.value = svg.value = ''
    error.value = 'The content is too long for a QR code at this error-correction level.'
  }
})

function download(name: string, href: string) {
  const a = document.createElement('a')
  a.href = href
  a.download = name
  a.click()
}
function downloadSvg() {
  const url = URL.createObjectURL(new Blob([svg.value], { type: 'image/svg+xml' }))
  download('qrcode.svg', url)
  URL.revokeObjectURL(url)
}

const eccItems = [
  { label: 'L (7%)', value: 'L' }, { label: 'M (15%)', value: 'M' },
  { label: 'Q (25%)', value: 'Q' }, { label: 'H (30%)', value: 'H' }
]
const securityItems = [
  { label: 'WPA / WPA2 / WPA3', value: 'WPA' }, { label: 'WEP', value: 'WEP' }, { label: 'None', value: 'nopass' }
]
</script>

<template>
  <div class="grid items-start gap-6 lg:grid-cols-[1fr_22rem]">
    <UCard>
      <div class="space-y-5">
        <UTabs v-model="kind" :items="kinds" :content="false" size="sm" />

        <UFormField v-if="kind === 'text'" label="Text or URL">
          <UTextarea v-model="text" :rows="4" class="w-full" />
        </UFormField>

        <div v-else-if="kind === 'wifi'" class="grid gap-4 sm:grid-cols-2">
          <UFormField label="Network name (SSID)"><UInput v-model="wifi.ssid" class="w-full" /></UFormField>
          <UFormField label="Security"><USelect v-model="wifi.security" :items="securityItems" class="w-full" /></UFormField>
          <UFormField v-if="wifi.security !== 'nopass'" label="Password"><UInput v-model="wifi.password" class="w-full" /></UFormField>
          <USwitch v-model="wifi.hidden" label="Hidden network" class="self-end pb-2" />
        </div>

        <div v-else-if="kind === 'contact'" class="grid gap-4 sm:grid-cols-2">
          <UFormField label="First name"><UInput v-model="contact.first" class="w-full" /></UFormField>
          <UFormField label="Last name"><UInput v-model="contact.last" class="w-full" /></UFormField>
          <UFormField label="Organisation"><UInput v-model="contact.org" class="w-full" /></UFormField>
          <UFormField label="Job title"><UInput v-model="contact.title" class="w-full" /></UFormField>
          <UFormField label="Phone"><UInput v-model="contact.phone" type="tel" class="w-full" /></UFormField>
          <UFormField label="Email"><UInput v-model="contact.email" type="email" class="w-full" /></UFormField>
          <UFormField label="Website" class="sm:col-span-2"><UInput v-model="contact.url" class="w-full" /></UFormField>
        </div>

        <div v-else-if="kind === 'email'" class="space-y-4">
          <UFormField label="To"><UInput v-model="email.to" type="email" class="w-full" /></UFormField>
          <UFormField label="Subject"><UInput v-model="email.subject" class="w-full" /></UFormField>
          <UFormField label="Message"><UTextarea v-model="email.body" :rows="4" class="w-full" /></UFormField>
        </div>

        <div v-else-if="kind === 'sms'" class="space-y-4">
          <UFormField label="Phone number"><UInput v-model="sms.number" type="tel" class="w-full" /></UFormField>
          <UFormField label="Message"><UTextarea v-model="sms.message" :rows="3" class="w-full" /></UFormField>
        </div>

        <UFormField v-else label="Phone number"><UInput v-model="phone" type="tel" class="w-full" /></UFormField>

        <div class="grid gap-4 border-t border-default pt-4 sm:grid-cols-4">
          <UFormField label="Error correction"><USelect v-model="ecc" :items="eccItems" class="w-full" /></UFormField>
          <UFormField label="Size (px)"><UInput v-model.number="size" type="number" :min="128" :max="2048" class="w-full" /></UFormField>
          <UFormField label="Foreground">
            <input v-model="fg" type="color" class="h-8 w-full cursor-pointer rounded-md border border-default bg-transparent">
          </UFormField>
          <UFormField label="Background">
            <input v-model="bg" type="color" class="h-8 w-full cursor-pointer rounded-md border border-default bg-transparent">
          </UFormField>
        </div>
      </div>
    </UCard>

    <UCard class="lg:sticky lg:top-20">
      <div class="flex flex-col items-center gap-4">
        <img v-if="png" :src="png" alt="QR code" class="w-full max-w-72 rounded-lg border border-default">
        <div v-else class="flex aspect-square w-full max-w-72 items-center justify-center rounded-lg border border-dashed border-default p-6 text-center text-sm text-muted">
          {{ error || 'Fill in the form to generate a QR code.' }}
        </div>
        <div v-if="png" class="flex gap-2">
          <UButton icon="i-lucide-download" size="sm" @click="download('qrcode.png', png)">PNG</UButton>
          <UButton icon="i-lucide-download" size="sm" color="neutral" variant="outline" @click="downloadSvg">SVG</UButton>
        </div>
      </div>
    </UCard>
  </div>
</template>
