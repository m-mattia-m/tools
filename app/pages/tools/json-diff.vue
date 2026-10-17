<script setup lang="ts">
definePageMeta({
  title: 'JSON Diff',
  description: 'Compare two JSON documents structurally and list added, removed and changed values.',
  icon: 'i-lucide-git-compare',
  tags: ['json', 'diff', 'dev']
})

const left = ref('{\n  "name": "tools",\n  "version": 1,\n  "tags": ["a", "b"],\n  "meta": { "public": true }\n}')
const right = ref('{\n  "name": "tools",\n  "version": 2,\n  "tags": ["a", "c", "d"],\n  "meta": { "public": true, "owner": "me" }\n}')

interface Change { path: string, type: 'added' | 'removed' | 'changed', before?: unknown, after?: unknown }

function diff(a: unknown, b: unknown, path: string, out: Change[]) {
  const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
  if (Array.isArray(a) && Array.isArray(b)) {
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      const p = `${path}[${i}]`
      if (i >= a.length) out.push({ path: p, type: 'added', after: b[i] })
      else if (i >= b.length) out.push({ path: p, type: 'removed', before: a[i] })
      else diff(a[i], b[i], p, out)
    }
  } else if (isObj(a) && isObj(b)) {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const p = path ? `${path}.${k}` : k
      if (!(k in a)) out.push({ path: p, type: 'added', after: b[k] })
      else if (!(k in b)) out.push({ path: p, type: 'removed', before: a[k] })
      else diff(a[k], b[k], p, out)
    }
  } else if (JSON.stringify(a) !== JSON.stringify(b)) {
    out.push({ path: path || '(root)', type: 'changed', before: a, after: b })
  }
}

const result = computed(() => {
  if (!left.value.trim() || !right.value.trim()) return null
  let a: unknown, b: unknown
  try { a = JSON.parse(left.value) } catch (e) { return { error: `Left: ${e instanceof Error ? e.message : 'invalid JSON'}` } }
  try { b = JSON.parse(right.value) } catch (e) { return { error: `Right: ${e instanceof Error ? e.message : 'invalid JSON'}` } }
  const changes: Change[] = []
  diff(a, b, '', changes)
  return { changes }
})

const style = {
  added: { label: 'Added', color: 'success' as const },
  removed: { label: 'Removed', color: 'error' as const },
  changed: { label: 'Changed', color: 'warning' as const }
}
const show = (v: unknown) => JSON.stringify(v)
</script>

<template>
  <div class="space-y-6">
    <div class="grid gap-4 lg:grid-cols-2">
      <UCard>
        <template #header><h2 class="font-semibold">Original</h2></template>
        <UTextarea v-model="left" :rows="12" class="w-full" :ui="{ base: 'font-mono text-sm' }" />
      </UCard>
      <UCard>
        <template #header><h2 class="font-semibold">Modified</h2></template>
        <UTextarea v-model="right" :rows="12" class="w-full" :ui="{ base: 'font-mono text-sm' }" />
      </UCard>
    </div>

    <UAlert v-if="result && 'error' in result" color="error" variant="subtle" icon="i-lucide-circle-alert" :title="result.error" />
    <UCard v-else-if="result">
      <template #header>
        <h2 class="font-semibold">{{ result.changes.length ? `${result.changes.length} difference${result.changes.length === 1 ? '' : 's'}` : 'Identical' }}</h2>
      </template>
      <p v-if="!result.changes.length" class="text-muted">Both documents are structurally equal.</p>
      <div v-else class="divide-y divide-default">
        <div v-for="c in result.changes" :key="c.path + c.type" class="flex flex-wrap items-start gap-3 py-2.5">
          <UBadge :color="style[c.type].color" variant="subtle" class="w-20 justify-center">{{ style[c.type].label }}</UBadge>
          <div class="min-w-0 flex-1">
            <p class="font-mono text-sm font-semibold">{{ c.path }}</p>
            <p class="break-all font-mono text-sm">
              <span v-if="c.type !== 'added'" class="text-error">{{ show(c.before) }}</span>
              <span v-if="c.type === 'changed'" class="text-muted"> → </span>
              <span v-if="c.type !== 'removed'" class="text-success">{{ show(c.after) }}</span>
            </p>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>
