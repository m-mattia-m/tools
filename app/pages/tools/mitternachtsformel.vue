<script setup lang="ts">
definePageMeta({
  title: 'Mitternachtsformel-Rechner',
  description: 'Solve ax² + bx + c = 0: discriminant D and the solutions x₁ and x₂ (real numbers only, D ≥ 0).',
  icon: 'i-lucide-square-radical',
  tags: ['math', 'calculator']
})

const a = ref<string>('1')
const b = ref<string>('-3')
const c = ref<string>('2')

function num(v: string) {
  const n = Number(v.replace(',', '.'))
  return v.trim() === '' || Number.isNaN(n) ? null : n
}

// Avoid output like 0.30000000000000004
function fmt(n: number) {
  if (Object.is(n, -0)) return '0'
  return String(Number(n.toPrecision(12)))
}

const result = computed(() => {
  const A = num(a.value)
  const B = num(b.value)
  const C = num(c.value)
  if (A === null || B === null || C === null) return { kind: 'incomplete' as const }

  if (A === 0) {
    if (B === 0) return { kind: C === 0 ? 'all' as const : 'none' as const }
    return { kind: 'linear' as const, x: -C / B }
  }

  const D = B * B - 4 * A * C
  const denom = 2 * A
  if (D > 0) {
    const root = Math.sqrt(D)
    return { kind: 'two' as const, A, B, C, D, root, x1: (-B + root) / denom, x2: (-B - root) / denom }
  }
  if (D === 0) {
    return { kind: 'one' as const, A, B, C, D, x1: -B / denom }
  }
  return { kind: 'negative' as const, A, B, C, D }
})

const quad = computed(() => {
  const r = result.value
  return r.kind === 'two' || r.kind === 'one' ? r : null
})
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <UCard>
      <div class="space-y-4">
        <div class="flex flex-col items-center gap-2 rounded-lg bg-elevated px-4 py-6 text-3xl [&_.katex-display]:my-0">
          <MathFormula tex="x_{1,2} = \frac{-b \pm \sqrt{D}}{2a}" />
          <p class="text-sm text-muted">mit</p>
          <MathFormula tex="D = b^2 - 4ac" />
        </div>
        <div class="grid gap-4 sm:grid-cols-3">
          <UFormField label="a">
            <UInput v-model="a" inputmode="decimal" placeholder="1" size="xl" class="w-full" :ui="{ base: 'font-mono' }" autofocus />
          </UFormField>
          <UFormField label="b">
            <UInput v-model="b" inputmode="decimal" placeholder="-3" size="xl" class="w-full" :ui="{ base: 'font-mono' }" />
          </UFormField>
          <UFormField label="c">
            <UInput v-model="c" inputmode="decimal" placeholder="2" size="xl" class="w-full" :ui="{ base: 'font-mono' }" />
          </UFormField>
        </div>
      </div>
    </UCard>

    <UAlert
      v-if="result.kind === 'incomplete'"
      color="neutral"
      variant="subtle"
      icon="i-lucide-info"
      title="Enter numbers for a, b and c."
    />
    <UAlert
      v-else-if="result.kind === 'linear'"
      color="warning"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      title="a = 0: not a quadratic equation"
      :description="`It is linear (bx + c = 0) with x = ${fmt(result.x)}.`"
    />
    <UAlert
      v-else-if="result.kind === 'none' || result.kind === 'all'"
      color="warning"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="result.kind === 'all' ? 'a = b = c = 0: every x is a solution.' : 'a = b = 0 and c ≠ 0: no solution.'"
    />

    <template v-else-if="result.kind === 'negative'">
      <UAlert
        color="error"
        variant="subtle"
        icon="i-lucide-octagon-x"
        title="No real solution: D < 0 is not allowed"
        description="The formula needs √D, and the square root of a negative number is not defined in the real numbers. So this equation has no real x₁ or x₂."
      />
      <UCard>
        <template #header>
          <h2 class="font-semibold">Why it fails</h2>
        </template>
        <div class="space-y-2 font-mono text-sm">
          <p>D = b² − 4ac = ({{ fmt(result.B) }})² − 4·({{ fmt(result.A) }})·({{ fmt(result.C) }}) = <span class="font-semibold text-error">{{ fmt(result.D) }}</span></p>
          <p>x₁,₂ = (−({{ fmt(result.B) }}) ± √<span class="text-error">({{ fmt(result.D) }})</span>) / (2·{{ fmt(result.A) }})</p>
          <p class="text-error">√({{ fmt(result.D) }}) is undefined → no solution</p>
        </div>
      </UCard>
    </template>

    <template v-else-if="quad">
      <div class="grid gap-4 sm:grid-cols-3">
        <UCard>
          <p class="text-sm text-muted">Discriminant D</p>
          <p class="font-mono text-2xl font-semibold">{{ fmt(quad.D) }}</p>
          <p class="text-sm text-muted">
            {{ quad.kind === 'two' ? 'D > 0: two real solutions' : 'D = 0: one real solution' }}
          </p>
        </UCard>
        <UCard>
          <p class="text-sm text-muted">x₁</p>
          <p class="flex items-center gap-1 font-mono text-2xl font-semibold">
            {{ fmt(quad.x1) }}
            <CopyButton :text="fmt(quad.x1)" label="x₁" />
          </p>
        </UCard>
        <UCard>
          <p class="text-sm text-muted">x₂</p>
          <p v-if="quad.kind === 'one'" class="font-mono text-2xl font-semibold text-muted">= x₁</p>
          <p v-else class="flex items-center gap-1 font-mono text-2xl font-semibold">
            {{ fmt(quad.x2) }}
            <CopyButton :text="fmt(quad.x2)" label="x₂" />
          </p>
        </UCard>
      </div>

      <UCard>
        <template #header>
          <h2 class="font-semibold">Calculation steps</h2>
        </template>
        <div class="space-y-2 font-mono text-sm">
          <p>D = b² − 4ac = ({{ fmt(quad.B) }})² − 4·({{ fmt(quad.A) }})·({{ fmt(quad.C) }}) = {{ fmt(quad.D) }}</p>
          <template v-if="quad.kind === 'two'">
            <p>x₁ = (−({{ fmt(quad.B) }}) + √{{ fmt(quad.D) }}) / (2·{{ fmt(quad.A) }}) = {{ fmt(quad.x1) }}</p>
            <p>x₂ = (−({{ fmt(quad.B) }}) − √{{ fmt(quad.D) }}) / (2·{{ fmt(quad.A) }}) = {{ fmt(quad.x2) }}</p>
          </template>
          <p v-else>x = −({{ fmt(quad.B) }}) / (2·{{ fmt(quad.A) }}) = {{ fmt(quad.x1) }}</p>
        </div>
      </UCard>
    </template>
  </div>
</template>
