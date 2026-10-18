<script setup lang="ts">
import type { MathJsInstance } from 'mathjs'

definePageMeta({
  title: 'Scientific Calculator',
  description: 'TI-30X Pro MathPrint style calculator: typeset expressions, fractions, DEG/RAD/GRAD, Ans and memory variables, nDeriv, fnInt, Σ, table and statistics.',
  icon: 'i-lucide-calculator',
  tags: ['math', 'calculator', 'science']
})

/* eslint-disable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------- engine
const math = shallowRef<MathJsInstance | null>(null)
const scope = new Map<string, unknown>(['Ans', 'x', 'y', 'z', 't', 'a', 'b', 'c', 'd'].map(k => [k, 0]))
const angle = ref<'DEG' | 'RAD' | 'GRAD'>('DEG')
const notation = ref<'float' | 'fix' | 'sci' | 'eng'>('float')
const decimals = ref(2)
const preferFraction = ref(false)
const mixed = ref(false)

onMounted(async () => {
  const lib = await import('mathjs')
  const m = lib.create(lib.all!) as MathJsInstance
  const o = {
    sin: m.sin, cos: m.cos, tan: m.tan, asin: m.asin, acos: m.acos, atan: m.atan,
    log: m.log, log10: m.log10
  } as Record<string, any>

  const k = () => (angle.value === 'DEG' ? Math.PI / 180 : angle.value === 'GRAD' ? Math.PI / 200 : 1)
  const inAngle = (fn: string) => (x: any) => (typeof x === 'number' ? o[fn](x * k()) : o[fn](x))
  const outAngle = (fn: string) => (x: any) => (typeof x === 'number' && x >= -1 && x <= 1 ? o[fn](x) / k() : o[fn](x))
  const raw = (fn: (...a: any[]) => any) => Object.assign(fn, { rawArgs: true })

  const withVar = (compiled: any, name: string, value: number, s: Map<string, unknown>) => {
    const old = s.get(name)
    s.set(name, value)
    try {
      return Number(compiled.evaluate(s))
    } finally {
      if (old === undefined) s.delete(name)
      else s.set(name, old)
    }
  }

  const simpson = (f: (x: number) => number, a: number, b: number, fa: number, fm: number, fb: number, whole: number, eps: number, depth: number): number => {
    const m1 = (a + b) / 2
    const l = (a + m1) / 2
    const r = (m1 + b) / 2
    const fl = f(l)
    const fr = f(r)
    const left = ((m1 - a) / 6) * (fa + 4 * fl + fm)
    const right = ((b - m1) / 6) * (fm + 4 * fr + fb)
    if (depth <= 0 || Math.abs(left + right - whole) <= 15 * eps) return left + right + (left + right - whole) / 15
    return simpson(f, a, m1, fa, fl, fm, left, eps / 2, depth - 1) + simpson(f, m1, b, fm, fr, fb, right, eps / 2, depth - 1)
  }

  m.import({
    sin: inAngle('sin'),
    cos: inAngle('cos'),
    tan: inAngle('tan'),
    asin: outAngle('asin'),
    acos: outAngle('acos'),
    atan: (x: any) => (typeof x === 'number' ? o.atan(x) / k() : o.atan(x)),
    // TI convention: log is base 10, ln is natural; log(x, b) is logBASE
    log: (x: any, b?: any) => (b === undefined ? o.log10(x) : o.log(x, b)),
    ln: (x: any) => o.log(x),
    nPr: (n: number, r: number) => m.permutations(n, r),
    nCr: (n: number, r: number) => m.combinations(n, r),
    iPart: (x: number) => Math.trunc(x),
    fPart: (x: number) => x - Math.trunc(x),
    int: (x: number) => Math.floor(x),
    remainder: (a: number, b: number) => a - b * Math.trunc(a / b),
    rand: () => Math.random(),
    randInt: (a: number, b: number) => Math.floor(Math.random() * (Math.abs(b - a) + 1)) + Math.min(a, b),
    nDeriv: raw((args: any[], _m: any, s: Map<string, unknown>) => {
      const f = args[0].compile()
      const name = args[1].name as string
      const at = Number(args[2].compile().evaluate(s))
      const h = 1e-3 * Math.max(1, Math.abs(at))
      const g = (x: number) => withVar(f, name, x, s)
      return (-g(at + 2 * h) + 8 * g(at + h) - 8 * g(at - h) + g(at - 2 * h)) / (12 * h)
    }),
    fnInt: raw((args: any[], _m: any, s: Map<string, unknown>) => {
      const f = args[0].compile()
      const name = args[1].name as string
      const a = Number(args[2].compile().evaluate(s))
      const b = Number(args[3].compile().evaluate(s))
      const g = (x: number) => withVar(f, name, x, s)
      const mid = (a + b) / 2
      const fa = g(a), fm = g(mid), fb = g(b)
      return simpson(g, a, b, fa, fm, fb, ((b - a) / 6) * (fa + 4 * fm + fb), 1e-11, 24)
    }),
    sumSeq: raw((args: any[], _m: any, s: Map<string, unknown>) => {
      const f = args[0].compile()
      const name = args[1].name as string
      const lo = Number(args[2].compile().evaluate(s))
      const hi = Number(args[3].compile().evaluate(s))
      if (hi - lo > 1e6) throw new Error('Range too large')
      let total = 0
      for (let i = lo; i <= hi; i++) total += withVar(f, name, i, s)
      return total
    }),
    prodSeq: raw((args: any[], _m: any, s: Map<string, unknown>) => {
      const f = args[0].compile()
      const name = args[1].name as string
      const lo = Number(args[2].compile().evaluate(s))
      const hi = Number(args[3].compile().evaluate(s))
      if (hi - lo > 1e6) throw new Error('Range too large')
      let total = 1
      for (let i = lo; i <= hi; i++) total *= withVar(f, name, i, s)
      return total
    })
  }, { override: true })

  math.value = m
})

function preprocess(src: string) {
  let s = src
    .replace(/π/g, 'pi').replace(/×/g, '*').replace(/÷/g, '/').replace(/[−–]/g, '-')
    .replace(/√/g, 'sqrt').replace(/ᴇ/g, 'e').replace(/%/g, '/100').replace(/->/g, '→')
  const sto = s.match(/^(.*)→\s*([A-Za-z]\w*)\s*$/)
  if (sto) s = `${sto[2]} = ${sto[1]}`
  if (/^\s*[*/^+]/.test(s)) s = `Ans${s}`
  return s
}

// ---------------------------------------------------------------- formatting
function toFraction(x: number): [number, number] | null {
  if (!Number.isFinite(x) || Number.isInteger(x)) return null
  const sign = x < 0 ? -1 : 1
  const target = Math.abs(x)
  let h1 = 1, h0 = 0, k1 = 0, k0 = 1, v = target
  for (let i = 0; i < 40; i++) {
    const a = Math.floor(v)
    ;[h1, h0] = [a * h1 + h0, h1]
    ;[k1, k0] = [a * k1 + k0, k1]
    if (k1 > 100000) return null
    if (Math.abs(target - h1 / k1) < 1e-12 * Math.max(1, target)) return [sign * h1, k1]
    v = 1 / (v - a)
    if (!Number.isFinite(v)) break
  }
  return null
}

function formatNumber(x: number): string {
  const m = math.value!
  const n = notation.value
  if (n === 'fix') return m.format(x, { notation: 'fixed', precision: decimals.value })
  if (n === 'sci') return m.format(x, { notation: 'exponential', precision: 10 })
  if (n === 'eng') return m.format(x, { notation: 'engineering', precision: 10 })
  return m.format(x, { precision: 10, lowerExp: -9, upperExp: 10 })
}

const expToTex = (s: string) => s.replace(/e([+-]?\d+)$/, (_, e) => `\\times10^{${Number(e)}}`)

function fractionTex(f: [number, number]) {
  const [n, d] = f
  if (mixed.value && Math.abs(n) > d) {
    const whole = Math.trunc(n / d)
    const rest = Math.abs(n) - Math.abs(whole) * d
    return `${whole}\\,\\frac{${rest}}{${d}}`
  }
  return n < 0 ? `-\\frac{${-n}}{${d}}` : `\\frac{${n}}{${d}}`
}

function resultTex(value: unknown): { primary: string, secondary?: string } {
  const m = math.value!
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return { primary: '\\text{undefined}' }
    if (!Number.isFinite(value)) return { primary: value > 0 ? '\\infty' : '-\\infty' }
    const dec = expToTex(formatNumber(value))
    const frac = toFraction(value)
    if (!frac) return { primary: dec }
    const f = fractionTex(frac)
    return preferFraction.value ? { primary: f, secondary: dec } : { primary: dec, secondary: f }
  }
  return { primary: expToTex(m.format(value as any, { precision: 10 })) }
}

function inputTex(src: string) {
  try {
    const handler = (node: any, options: any): string | undefined => {
      if (node.type !== 'FunctionNode' || node.fn?.name !== 'log') return undefined
      const [x, base] = node.args.map((a: any) => a.toTex(options))
      return base ? `\\log_{${base}}\\left(${x}\\right)` : `\\log\\left(${x}\\right)`
    }
    return math.value!.parse(src).toTex({ parenthesis: 'auto', handler })
  } catch {
    return `\\text{${src.replace(/[\\{}$&#^_%~]/g, ' ')}}`
  }
}

// ---------------------------------------------------------------- session
interface Entry { input: string, tex: string, value?: unknown, error?: string }
const history = ref<Entry[]>([])
const input = ref('')
const inputEl = ref<HTMLInputElement | null>(null)
let recall = -1

const preview = computed(() => (math.value && input.value.trim() ? inputTex(preprocess(input.value).replace(/→\s*\w+$/, '')) : ''))

function run() {
  const m = math.value
  const raw = input.value.trim()
  if (!m || !raw) return
  const src = preprocess(raw)
  const entry: Entry = { input: raw, tex: inputTex(src.replace(/^\w+ = /, '')) }
  try {
    const value = m.evaluate(src, scope)
    if (value === undefined || typeof value === 'function') throw new Error('Nothing to display')
    if (typeof value === 'number' && !Number.isFinite(value)) {
      throw new Error(Number.isNaN(value) ? 'Math error' : 'Math error: division by 0 or overflow')
    }
    entry.value = value
    scope.set('Ans', value)
  } catch (e) {
    entry.error = (e instanceof Error ? e.message : 'Error').replace(/\s*\(char \d+\)/, '')
  }
  history.value = [...history.value, entry].slice(-60)
  input.value = ''
  recall = -1
  nextTick(() => {
    const box = document.getElementById('calc-history')
    if (box) box.scrollTop = box.scrollHeight
  })
}

function insert(text: string) {
  const el = inputEl.value
  const s = el?.selectionStart ?? input.value.length
  const e = el?.selectionEnd ?? s
  input.value = input.value.slice(0, s) + text + input.value.slice(e)
  nextTick(() => {
    el?.focus()
    el?.setSelectionRange(s + text.length, s + text.length)
  })
}

function backspace() {
  const el = inputEl.value
  const s = el?.selectionStart ?? input.value.length
  const e = el?.selectionEnd ?? s
  const from = e > s ? s : Math.max(0, s - 1)
  input.value = input.value.slice(0, from) + input.value.slice(e)
  nextTick(() => {
    el?.focus()
    el?.setSelectionRange(from, from)
  })
}

function moveCaret(dir: -1 | 1) {
  const el = inputEl.value
  if (!el) return
  const p = Math.min(Math.max((el.selectionStart ?? 0) + dir, 0), input.value.length)
  el.focus()
  el.setSelectionRange(p, p)
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'ArrowUp' && history.value.length) {
    e.preventDefault()
    recall = recall < 0 ? history.value.length - 1 : Math.max(0, recall - 1)
    input.value = history.value[recall]!.input
  } else if (e.key === 'ArrowDown' && recall >= 0) {
    e.preventDefault()
    recall = Math.min(history.value.length - 1, recall + 1)
    input.value = history.value[recall]!.input
  } else if (e.key === 'Escape') {
    input.value = ''
  }
}

function resetAll() {
  history.value = []
  input.value = ''
  for (const k of ['Ans', 'x', 'y', 'z', 't', 'a', 'b', 'c', 'd']) scope.set(k, 0)
  varsTick.value++
}

// keypad ------------------------------------------------------------
type Key = { l: string, t: string }
const sci: Key[] = [
  { l: 'sin', t: 'sin(' }, { l: 'cos', t: 'cos(' }, { l: 'tan', t: 'tan(' }, { l: 'sin⁻¹', t: 'asin(' }, { l: 'cos⁻¹', t: 'acos(' }, { l: 'tan⁻¹', t: 'atan(' },
  { l: 'sinh', t: 'sinh(' }, { l: 'cosh', t: 'cosh(' }, { l: 'tanh', t: 'tanh(' }, { l: 'x²', t: '^2' }, { l: '√', t: 'sqrt(' }, { l: 'ʸ√x', t: 'nthRoot(' },
  { l: 'log', t: 'log(' }, { l: 'ln', t: 'ln(' }, { l: '10ˣ', t: '10^(' }, { l: 'eˣ', t: 'e^(' }, { l: 'xʸ', t: '^' }, { l: 'x⁻¹', t: '^-1' },
  { l: 'π', t: 'π' }, { l: 'e', t: 'e' }, { l: '|x|', t: 'abs(' }, { l: 'n!', t: '!' }, { l: 'nPr', t: 'nPr(' }, { l: 'nCr', t: 'nCr(' },
  { l: '(', t: '(' }, { l: ')', t: ')' }, { l: ',', t: ',' }, { l: 'EE', t: 'ᴇ' }, { l: '%', t: '%' }, { l: 'STO▸', t: '→' },
  { l: 'iPart', t: 'iPart(' }, { l: 'fPart', t: 'fPart(' }, { l: 'int', t: 'int(' }, { l: 'round', t: 'round(' }, { l: 'min', t: 'min(' }, { l: 'max', t: 'max(' },
  { l: 'lcm', t: 'lcm(' }, { l: 'gcd', t: 'gcd(' }, { l: 'remainder', t: 'remainder(' }, { l: 'rand', t: 'rand()' }, { l: 'randInt', t: 'randInt(' }, { l: 'logᵦ', t: 'log(' },
  { l: 'nDeriv', t: 'nDeriv(' }, { l: 'fnInt', t: 'fnInt(' }, { l: 'Σ', t: 'sumSeq(' }, { l: 'Π', t: 'prodSeq(' }, { l: 'Ans', t: 'Ans' }, { l: '→', t: '→' }
].slice(0, 48) as Key[]
const vars = ['x', 'y', 'z', 't', 'a', 'b', 'c', 'd']
const pad: Key[] = [
  { l: '7', t: '7' }, { l: '8', t: '8' }, { l: '9', t: '9' }, { l: '÷', t: '÷' }, { l: 'DEL', t: 'DEL' },
  { l: '4', t: '4' }, { l: '5', t: '5' }, { l: '6', t: '6' }, { l: '×', t: '×' }, { l: 'AC', t: 'AC' },
  { l: '1', t: '1' }, { l: '2', t: '2' }, { l: '3', t: '3' }, { l: '−', t: '−' }, { l: 'Ans', t: 'Ans' },
  { l: '0', t: '0' }, { l: '.', t: '.' }, { l: '(−)', t: '−' }, { l: '+', t: '+' }, { l: 'enter', t: 'ENTER' }
]

function press(k: Key) {
  if (k.t === 'DEL') backspace()
  else if (k.t === 'AC') input.value = ''
  else if (k.t === 'ENTER') run()
  else insert(k.t)
}

// ---------------------------------------------------------------- extra tools
const panel = ref('table')
const panels = [
  { label: 'Table', value: 'table', icon: 'i-lucide-table' },
  { label: 'Statistics', value: 'stats', icon: 'i-lucide-bar-chart-3' },
  { label: 'Variables', value: 'vars', icon: 'i-lucide-database' }
]

const tableFn = ref('x^2 - 2')
const tableStart = ref(0)
const tableStep = ref(1)
const tableRows = ref(10)
const table = computed(() => {
  const m = math.value
  if (!m) return { rows: [] as [number, string][] }
  try {
    const f = m.parse(preprocess(tableFn.value)).compile()
    const rows: [number, string][] = []
    for (let i = 0; i < Math.min(Math.max(tableRows.value, 1), 200); i++) {
      const xv = tableStart.value + i * tableStep.value
      const v = f.evaluate(new Map<string, unknown>([['x', xv]]))
      rows.push([xv, typeof v === 'number' ? formatNumber(v) : m.format(v, { precision: 10 })])
    }
    return { rows }
  } catch (e) {
    return { rows: [] as [number, string][], error: e instanceof Error ? e.message : 'Error' }
  }
})

const statX = ref('3, 5, 7, 8, 12')
const statY = ref('')
const parseList = (s: string) => s.split(/[\s,;]+/).filter(Boolean).map(Number)
const stats = computed(() => {
  const m = math.value
  const xs = parseList(statX.value)
  if (!m || !xs.length || xs.some(Number.isNaN)) return null
  const ys = parseList(statY.value)
  const n = xs.length
  const sum = (a: number[]) => a.reduce((s, v) => s + v, 0)
  const mean = sum(xs) / n
  const ss = sum(xs.map(v => (v - mean) ** 2))
  const sorted = [...xs].sort((a, b) => a - b)
  const med = (a: number[]) => (a.length % 2 ? a[(a.length - 1) / 2]! : (a[a.length / 2 - 1]! + a[a.length / 2]!) / 2)
  const half = Math.floor(n / 2)
  const f = (v: number) => m.format(v, { precision: 10 })
  const rows: [string, string][] = [
    ['n', String(n)], ['Σx', f(sum(xs))], ['Σx²', f(sum(xs.map(v => v * v)))], ['x̄', f(mean)],
    ['Sx (sample)', n > 1 ? f(Math.sqrt(ss / (n - 1))) : '—'], ['σx (population)', f(Math.sqrt(ss / n))],
    ['minX', f(sorted[0]!)], ['Q1', f(half ? med(sorted.slice(0, half)) : sorted[0]!)], ['Med', f(med(sorted))],
    ['Q3', f(half ? med(sorted.slice(n - half)) : sorted[n - 1]!)], ['maxX', f(sorted[n - 1]!)]
  ]
  if (ys.length === n && !ys.some(Number.isNaN) && n > 1) {
    const my = sum(ys) / n
    const sxy = sum(xs.map((v, i) => (v - mean) * (ys[i]! - my)))
    const syy = sum(ys.map(v => (v - my) ** 2))
    const b = sxy / ss
    rows.push(['Σy', f(sum(ys))], ['ȳ', f(my)], ['Σxy', f(sum(xs.map((v, i) => v * ys[i]!)))],
      ['Linear fit  y = a + bx', `a = ${f(my - b * mean)},  b = ${f(b)}`], ['r', f(sxy / Math.sqrt(ss * syy))])
  }
  return rows
})

const varsTick = ref(0)
const memory = computed(() => {
  void varsTick.value
  void history.value.length
  const m = math.value
  if (!m) return []
  return ['Ans', ...vars].map(k => [k, m.format(scope.get(k) as any, { precision: 10 })] as [string, string])
})
</script>

<template>
  <div class="grid items-start gap-6 lg:grid-cols-[minmax(0,36rem)_minmax(0,1fr)]">
    <!-- calculator -->
    <UCard :ui="{ body: 'p-3 sm:p-4' }">
      <div class="space-y-3">
        <!-- mode bar -->
        <div class="flex flex-wrap items-center gap-2">
          <div class="flex rounded-lg border border-default p-0.5">
            <button
              v-for="a in (['DEG', 'RAD', 'GRAD'] as const)" :key="a"
              class="rounded-md px-2.5 py-1 text-xs font-medium transition"
              :class="angle === a ? 'bg-inverted text-inverted' : 'text-muted hover:text-default'"
              @click="angle = a"
            >{{ a }}</button>
          </div>
          <USelect
            v-model="notation" size="sm" class="w-28"
            :items="[{ label: 'Float', value: 'float' }, { label: 'Fix', value: 'fix' }, { label: 'Sci', value: 'sci' }, { label: 'Eng', value: 'eng' }]"
          />
          <UInput v-if="notation === 'fix'" v-model.number="decimals" type="number" :min="0" :max="9" size="sm" class="w-16" />
          <UButton size="xs" color="neutral" variant="outline" @click="preferFraction = !preferFraction">F↔D</UButton>
          <UButton size="xs" color="neutral" :variant="mixed ? 'solid' : 'outline'" @click="mixed = !mixed">Uⁿ⁄d</UButton>
          <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-rotate-ccw" class="ml-auto" @click="resetAll">Reset</UButton>
        </div>

        <!-- display -->
        <div class="overflow-hidden rounded-xl border border-default bg-elevated/60">
          <div id="calc-history" class="h-56 space-y-1 overflow-y-auto p-3">
            <p v-if="!history.length" class="pt-16 text-center text-sm text-muted">
              Type an expression and press Enter.<br>↑ recalls the previous entry.
            </p>
            <div v-for="(h, i) in history" :key="i" class="space-y-0.5">
              <button class="block w-full text-left text-muted hover:text-default" @click="insert(h.input)">
                <MathFormula :tex="h.tex" :display="false" />
              </button>
              <p v-if="h.error" class="text-right text-sm text-error">{{ h.error }}</p>
              <div v-else class="flex items-baseline justify-end gap-3 text-lg">
                <span v-if="resultTex(h.value).secondary" class="text-sm text-muted"><MathFormula :tex="resultTex(h.value).secondary!" :display="false" /></span>
                <button class="font-semibold" @click="insert(String(math!.format(h.value as any, { precision: 14 })))">
                  <MathFormula :tex="resultTex(h.value).primary" :display="false" />
                </button>
              </div>
            </div>
          </div>
          <div class="border-t border-default bg-default">
            <div v-if="preview" class="min-h-10 overflow-x-auto px-3 pt-2 text-lg"><MathFormula :tex="preview" :display="false" /></div>
            <div class="flex items-center gap-1 px-2 py-2">
              <input
                ref="inputEl" v-model="input" type="text" spellcheck="false" autocomplete="off" autofocus
                placeholder="e.g. sqrt(2)/3 + 2^3"
                class="min-w-0 flex-1 bg-transparent px-1 font-mono text-base outline-none placeholder:text-dimmed"
                @keydown.enter.prevent="run" @keydown="onKey"
              >
              <UButton icon="i-lucide-chevron-left" size="xs" color="neutral" variant="ghost" aria-label="Cursor left" @click="moveCaret(-1)" />
              <UButton icon="i-lucide-chevron-right" size="xs" color="neutral" variant="ghost" aria-label="Cursor right" @click="moveCaret(1)" />
            </div>
          </div>
        </div>

        <p v-if="!math" class="text-sm text-muted">Loading math engine…</p>

        <!-- keys -->
        <div class="grid grid-cols-6 gap-1.5">
          <UButton
            v-for="k in sci" :key="k.l + k.t" color="neutral" variant="subtle" size="sm" block
            class="h-8 justify-center px-0 text-xs" @click="press(k)"
          >{{ k.l }}</UButton>
        </div>
        <div class="grid grid-cols-8 gap-1.5">
          <UButton
            v-for="v in vars" :key="v" color="neutral" variant="outline" size="sm" block
            class="h-8 justify-center px-0 font-mono text-xs italic" @click="insert(v)"
          >{{ v }}</UButton>
        </div>
        <div class="grid grid-cols-5 gap-1.5">
          <UButton
            v-for="k in pad" :key="k.l + k.t"
            :color="k.t === 'ENTER' ? 'primary' : /\d|\./.test(k.t) ? 'neutral' : 'neutral'"
            :variant="k.t === 'ENTER' ? 'solid' : /^[\d.]$/.test(k.t) ? 'outline' : 'subtle'"
            size="md" block class="h-11 justify-center px-0 text-base" @click="press(k)"
          >{{ k.l }}</UButton>
        </div>
      </div>
    </UCard>

    <!-- side panels -->
    <div class="space-y-4">
      <UTabs v-model="panel" :items="panels" :content="false" class="w-full max-w-md" />

      <UCard v-if="panel === 'table'">
        <div class="space-y-4">
          <div class="grid gap-3 sm:grid-cols-4">
            <UFormField label="f(x) =" class="sm:col-span-2"><UInput v-model="tableFn" class="w-full" :ui="{ base: 'font-mono' }" /></UFormField>
            <UFormField label="Start"><UInput v-model.number="tableStart" type="number" class="w-full" /></UFormField>
            <UFormField label="Step"><UInput v-model.number="tableStep" type="number" class="w-full" /></UFormField>
          </div>
          <UAlert v-if="table.error" color="error" variant="subtle" :title="table.error" />
          <div v-else class="max-h-96 overflow-auto rounded-lg border border-default">
            <table class="w-full font-mono text-sm">
              <thead class="sticky top-0 bg-elevated text-left"><tr><th class="px-3 py-1.5">x</th><th class="px-3 py-1.5">f(x)</th></tr></thead>
              <tbody class="divide-y divide-default">
                <tr v-for="[xv, v] in table.rows" :key="xv"><td class="px-3 py-1">{{ xv }}</td><td class="px-3 py-1">{{ v }}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </UCard>

      <UCard v-else-if="panel === 'stats'">
        <div class="space-y-4">
          <div class="grid gap-3 sm:grid-cols-2">
            <UFormField label="Data X" hint="numbers separated by space, comma or newline"><UTextarea v-model="statX" :rows="3" class="w-full" :ui="{ base: 'font-mono text-sm' }" /></UFormField>
            <UFormField label="Data Y (optional, for linear fit)"><UTextarea v-model="statY" :rows="3" class="w-full" :ui="{ base: 'font-mono text-sm' }" /></UFormField>
          </div>
          <div v-if="stats" class="divide-y divide-default rounded-lg border border-default text-sm">
            <div v-for="[k, v] in stats" :key="k" class="flex justify-between gap-4 px-3 py-1.5">
              <span class="text-muted">{{ k }}</span><span class="font-mono">{{ v }}</span>
            </div>
          </div>
          <p v-else class="text-sm text-muted">Enter at least one valid number.</p>
        </div>
      </UCard>

      <UCard v-else>
        <div class="space-y-3">
          <p class="text-sm text-muted">Store a value with <code>5 → x</code> (or the STO▸ key) and use it in later entries.</p>
          <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div v-for="[k, v] in memory" :key="k" class="rounded-lg border border-default px-3 py-2">
              <p class="font-mono text-xs italic text-muted">{{ k }}</p>
              <p class="truncate font-mono text-sm">{{ v }}</p>
            </div>
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header><h2 class="font-semibold">Cheat sheet</h2></template>
        <ul class="space-y-1 text-sm text-muted">
          <li><code>log(x)</code> is base 10, <code>ln(x)</code> natural, <code>log(x, b)</code> any base</li>
          <li><code>nDeriv(x^2, x, 3)</code> derivative · <code>fnInt(sin(x), x, 0, pi)</code> integral (set RAD for π)</li>
          <li><code>sumSeq(k^2, k, 1, 10)</code> sum · <code>prodSeq(k, k, 1, 5)</code> product</li>
          <li><code>5 → x</code> store · <code>Ans</code> last result · starting with <code>+ − × ÷ ^</code> continues from Ans</li>
          <li><code>nCr(5,2)</code> <code>nPr(5,2)</code> <code>5!</code> <code>50%</code> <code>2ᴇ3</code> <code>randInt(1,6)</code></li>
          <li>Keyboard: Enter evaluates, ↑/↓ recalls entries, Esc clears</li>
        </ul>
      </UCard>
    </div>
  </div>
</template>
