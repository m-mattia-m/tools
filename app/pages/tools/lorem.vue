<script setup lang="ts">
definePageMeta({
  title: 'Lorem Ipsum Generator',
  description: 'Placeholder text in paragraphs, sentences or words.',
  icon: 'i-lucide-text',
  tags: ['text', 'generator']
})

const WORDS = `lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum curabitur pretium tincidunt lacus nunc vitae mauris egestas faucibus vulputate integer feugiat scelerisque varius morbi tristique senectus netus malesuada fames turpis`.split(' ')

const unit = ref<'paragraphs' | 'sentences' | 'words'>('paragraphs')
const count = ref(3)
const startWithLorem = ref(true)
const html = ref(false)
const nonce = ref(0)

const unitItems = [
  { label: 'Paragraphs', value: 'paragraphs' },
  { label: 'Sentences', value: 'sentences' },
  { label: 'Words', value: 'words' }
]

function sentence() {
  const n = 6 + randomInt(10)
  const w = Array.from({ length: n }, () => pick(WORDS))
  for (let i = 3; i < n - 2; i++) if (randomInt(8) === 0) w[i] += ','
  const s = w.join(' ')
  return s.charAt(0).toUpperCase() + s.slice(1) + '.'
}

const text = computed(() => {
  void nonce.value
  const n = Math.min(Math.max(Math.floor(count.value) || 1, 1), 500)
  let out: string
  if (unit.value === 'words') {
    out = Array.from({ length: n }, () => pick(WORDS)).join(' ')
    if (startWithLorem.value) out = ['lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur'].slice(0, n).concat(out.split(' ').slice(Math.min(n, 6))).join(' ')
    return html.value ? `<p>${out}</p>` : out
  }
  if (unit.value === 'sentences') {
    const s = Array.from({ length: n }, sentence)
    if (startWithLorem.value) s[0] = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'
    out = s.join(' ')
    return html.value ? `<p>${out}</p>` : out
  }
  const paras = Array.from({ length: n }, () => Array.from({ length: 3 + randomInt(5) }, sentence).join(' '))
  if (startWithLorem.value) paras[0] = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ' + paras[0]!.split('. ').slice(1).join('. ')
  return html.value ? paras.map(p => `<p>${p}</p>`).join('\n') : paras.join('\n\n')
})
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <UCard>
      <div class="flex flex-wrap items-end gap-4">
        <UFormField label="Amount"><UInput v-model.number="count" type="number" :min="1" :max="500" class="w-28" /></UFormField>
        <UFormField label="Unit"><USelect v-model="unit" :items="unitItems" class="w-40" /></UFormField>
        <USwitch v-model="startWithLorem" label="Start with “Lorem ipsum”" class="pb-2" />
        <USwitch v-model="html" label="HTML <p> tags" class="pb-2" />
        <UButton icon="i-lucide-refresh-cw" class="ml-auto" @click="nonce++">Regenerate</UButton>
      </div>
    </UCard>
    <CodeBox :text="text" title="Lorem ipsum" max-height="32rem" />
  </div>
</template>
