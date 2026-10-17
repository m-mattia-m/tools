<script setup lang="ts">
import { v1, v3, v4, v5, v6, v7, NIL, MAX } from 'uuid'

definePageMeta({
  title: 'UUID Generator',
  description: 'Generate UUIDs in versions 1, 3, 4, 5, 6 and 7, in any amount.',
  icon: 'i-lucide-fingerprint',
  tags: ['generator', 'uuid', 'dev']
})

const versions = [
  { label: 'v4 · random', value: 'v4' },
  { label: 'v7 · time-ordered random', value: 'v7' },
  { label: 'v1 · timestamp + node', value: 'v1' },
  { label: 'v6 · reordered v1', value: 'v6' },
  { label: 'v3 · MD5 namespace', value: 'v3' },
  { label: 'v5 · SHA-1 namespace', value: 'v5' },
  { label: 'Nil (all zeros)', value: 'nil' },
  { label: 'Max (all ones)', value: 'max' }
]
const namespaces = [
  { label: 'DNS', value: v5.DNS },
  { label: 'URL', value: v5.URL }
]

const version = ref('v4')
const amount = ref(5)
const uppercase = ref(false)
const hyphens = ref(true)
const name = ref('example.com')
const namespace = ref(v5.DNS)
const nonce = ref(0)

const deterministic = computed(() => ['v3', 'v5', 'nil', 'max'].includes(version.value))

const uuids = computed(() => {
  void nonce.value
  const count = deterministic.value ? 1 : Math.min(Math.max(Math.floor(amount.value) || 1, 1), 1000)
  const out: string[] = []
  for (let i = 0; i < count; i++) {
    let id = ''
    switch (version.value) {
      case 'v1': id = v1(); break
      case 'v3': id = v3(name.value, namespace.value); break
      case 'v5': id = v5(name.value, namespace.value); break
      case 'v6': id = v6(); break
      case 'v7': id = v7(); break
      case 'nil': id = NIL; break
      case 'max': id = MAX; break
      default: id = v4()
    }
    if (!hyphens.value) id = id.replace(/-/g, '')
    out.push(uppercase.value ? id.toUpperCase() : id)
  }
  return out
})
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <UCard>
      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField label="Version">
          <USelect v-model="version" :items="versions" class="w-full" />
        </UFormField>
        <UFormField v-if="!deterministic" label="Amount (1–1000)">
          <UInput v-model.number="amount" type="number" :min="1" :max="1000" class="w-full" />
        </UFormField>
        <template v-if="version === 'v3' || version === 'v5'">
          <UFormField label="Namespace">
            <USelect v-model="namespace" :items="namespaces" class="w-full" />
          </UFormField>
          <UFormField label="Name">
            <UInput v-model="name" class="w-full" />
          </UFormField>
        </template>
      </div>
      <div class="mt-4 flex flex-wrap items-center gap-6">
        <USwitch v-model="uppercase" label="Uppercase" />
        <USwitch v-model="hyphens" label="Hyphens" />
        <UButton v-if="!deterministic" icon="i-lucide-refresh-cw" class="ml-auto" @click="nonce++">Regenerate</UButton>
      </div>
    </UCard>

    <CodeBox :text="uuids.join('\n')" :title="`${uuids.length} UUID${uuids.length === 1 ? '' : 's'}`" label="UUIDs" />
  </div>
</template>
