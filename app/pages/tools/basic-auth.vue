<script setup lang="ts">
definePageMeta({
  title: 'Basic Auth Generator',
  description: 'Build an HTTP Basic Authorization header from username and password, or decode one.',
  icon: 'i-lucide-lock-keyhole',
  tags: ['http', 'security', 'encoding']
})

const username = ref('')
const password = ref('')
const showPassword = ref(false)
const header = ref('')

const encoded = computed(() => (username.value || password.value ? utf8ToBase64(`${username.value}:${password.value}`) : ''))

const decoded = computed(() => {
  const raw = header.value.trim().replace(/^authorization:\s*/i, '').replace(/^basic\s+/i, '')
  if (!raw) return null
  try {
    const text = base64ToUtf8(raw)
    const i = text.indexOf(':')
    if (i < 0) return { error: 'Decoded value has no ":" separator.' }
    return { user: text.slice(0, i), pass: text.slice(i + 1) }
  } catch {
    return { error: 'Not a valid Base64 Basic credential.' }
  }
})
</script>

<template>
  <div class="mx-auto grid max-w-5xl gap-6 lg:grid-cols-2">
    <UCard>
      <template #header><h2 class="font-semibold">Generate</h2></template>
      <div class="space-y-4">
        <UFormField label="Username">
          <UInput v-model="username" autocomplete="off" class="w-full" />
        </UFormField>
        <UFormField label="Password">
          <UInput v-model="password" :type="showPassword ? 'text' : 'password'" autocomplete="off" class="w-full">
            <template #trailing>
              <UButton :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'" color="neutral" variant="link" size="sm" aria-label="Toggle visibility" @click="showPassword = !showPassword" />
            </template>
          </UInput>
        </UFormField>
        <template v-if="encoded">
          <CodeBox :text="`Authorization: Basic ${encoded}`" title="Header" />
          <CodeBox :text="`curl -u '${username}:${password}' https://example.com`" title="curl" />
        </template>
      </div>
    </UCard>

    <UCard>
      <template #header><h2 class="font-semibold">Decode</h2></template>
      <div class="space-y-4">
        <UFormField label="Header or Base64 value">
          <UTextarea v-model="header" :rows="3" placeholder="Authorization: Basic dXNlcjpwYXNz" class="w-full" :ui="{ base: 'font-mono' }" />
        </UFormField>
        <UAlert v-if="decoded && 'error' in decoded" color="error" variant="subtle" :title="decoded.error" />
        <div v-else-if="decoded" class="space-y-2">
          <CodeBox :text="decoded.user" title="Username" />
          <CodeBox :text="decoded.pass" title="Password" />
        </div>
      </div>
    </UCard>
  </div>
</template>
