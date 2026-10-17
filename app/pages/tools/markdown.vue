<script setup lang="ts">
import { Marked, type RendererObject } from 'marked'
import DOMPurify from 'dompurify'

definePageMeta({
  title: 'Markdown Preview',
  description: 'Write Markdown and preview it rendered like CommonMark, GitHub or GitLab.',
  icon: 'i-lucide-file-code-2',
  tags: ['markdown', 'text', 'web']
})

type Engine = 'default' | 'github' | 'gitlab'
const engine = ref<Engine>('github')
const engines = [
  { label: 'Default (CommonMark)', value: 'default' },
  { label: 'GitHub (GFM)', value: 'github' },
  { label: 'GitLab (GLFM)', value: 'gitlab' }
]
const notes: Record<Engine, string> = {
  default: 'Strict CommonMark: no tables, task lists or strikethrough.',
  github: 'GitHub Flavored Markdown: tables, task lists, strikethrough, autolinks, heading anchors, alerts (> [!NOTE]) and :emoji:.',
  gitlab: 'GitLab Flavored Markdown: like GFM plus [[_TOC_]] table of contents and line breaks on single newlines.'
}

const source = ref(`# Markdown preview

Switch the **engine** above to see how the same text renders differently.

[[_TOC_]]

## Text

~~Strikethrough~~, **bold**, *italic*, \`inline code\` and an autolink: https://example.com :rocket:

Line one
line two (a single newline)

> [!NOTE]
> Alerts render as callouts on GitHub and GitLab.

## Lists

- [x] Task list item
- [ ] Open task
- Normal item

## Table

| Tool | Type |
| ---- | ---- |
| JWT  | Security |
| QR   | Generator |

## Code

\`\`\`ts
const answer: number = 42
\`\`\`
`)

const emoji: Record<string, string> = {
  rocket: '🚀', smile: '😄', tada: '🎉', warning: '⚠️', heart: '❤️', fire: '🔥', thumbsup: '👍', '+1': '👍',
  eyes: '👀', bug: '🐛', sparkles: '✨', white_check_mark: '✅', x: '❌', star: '⭐', bulb: '💡', zap: '⚡'
}

const alerts: Record<string, string> = { NOTE: 'Note', TIP: 'Tip', IMPORTANT: 'Important', WARNING: 'Warning', CAUTION: 'Caution' }

const slugify = (t: string) => t.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s/g, '-')

function render(md: string, e: Engine) {
  const toc: { depth: number, text: string, id: string }[] = []
  const seen = new Map<string, number>()
  const flavored = e !== 'default'

  const renderer: RendererObject = {}
  if (flavored) {
    renderer.heading = function ({ tokens, depth }) {
      const html = this.parser.parseInline(tokens)
      let id = slugify(html)
      const n = seen.get(id) ?? 0
      seen.set(id, n + 1)
      if (n) id += `-${n}`
      toc.push({ depth, text: html, id })
      return `<h${depth} id="${id}">${html}</h${depth}>\n`
    }
    renderer.blockquote = function ({ tokens }) {
      const body = this.parser.parse(tokens)
      const m = body.match(/^<p>\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(?:<br>)?\s*/i)
      if (!m) return `<blockquote>\n${body}</blockquote>\n`
      const kind = m[1]!.toUpperCase()
      return `<div class="md-alert md-alert-${kind.toLowerCase()}"><p class="md-alert-title">${alerts[kind]}</p><p>${body.slice(m[0].length)}</div>\n`
    }
  }

  const marked = new Marked({ gfm: flavored, breaks: e === 'gitlab', renderer })
  let text = md
  // the placeholder must be swapped out first: marked would turn "_TOC_" into emphasis
  if (e === 'gitlab') text = text.replace(/^\[\[_TOC_\]\]\s*$/m, '<!--md-toc-->')
  if (flavored) text = text.replace(/:([a-z0-9_+]+):/g, (all, name: string) => emoji[name] ?? all)
  let html = marked.parse(text, { async: false })

  if (e === 'gitlab') {
    const list = toc.map(h => `<li style="margin-left:${(h.depth - 1) * 1}rem"><a href="#${h.id}">${h.text}</a></li>`).join('')
    html = html.replace('<!--md-toc-->', `<ul class="md-toc">${list}</ul>`)
  }
  return DOMPurify.sanitize(html)
}

const html = computed(() => render(source.value, engine.value))
const view = ref<'preview' | 'html'>('preview')
const viewItems = [
  { label: 'Preview', value: 'preview', icon: 'i-lucide-eye' },
  { label: 'HTML', value: 'html', icon: 'i-lucide-code' }
]
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-3">
      <USelect v-model="engine" :items="engines" class="w-56" />
      <UTabs v-model="view" :items="viewItems" :content="false" class="w-56" />
      <CopyButton :text="html" label="HTML" />
    </div>
    <p class="text-sm text-muted">{{ notes[engine] }}</p>

    <div class="grid items-start gap-4 lg:grid-cols-2">
      <UCard>
        <template #header><h2 class="font-semibold">Markdown</h2></template>
        <UTextarea v-model="source" :rows="28" class="w-full" :ui="{ base: 'font-mono text-sm' }" />
      </UCard>
      <UCard>
        <template #header><h2 class="font-semibold">{{ view === 'preview' ? 'Preview' : 'HTML' }}</h2></template>
        <div v-if="view === 'preview'" :class="['md', `md-${engine}`]" v-html="html" />
        <pre v-else class="overflow-auto whitespace-pre-wrap break-all font-mono text-sm">{{ html }}</pre>
      </UCard>
    </div>
  </div>
</template>

<style>
.md { line-height: 1.65; word-wrap: break-word; }
.md > :first-child { margin-top: 0; }
.md h1, .md h2, .md h3, .md h4 { font-weight: 600; margin: 1.4em 0 0.6em; line-height: 1.25; }
.md h1 { font-size: 1.75em; }
.md h2 { font-size: 1.4em; }
.md h3 { font-size: 1.15em; }
.md-github h1, .md-github h2, .md-gitlab h1, .md-gitlab h2 { padding-bottom: 0.3em; border-bottom: 1px solid var(--ui-border); }
.md p, .md ul, .md ol, .md blockquote, .md pre, .md table { margin: 0 0 1em; }
.md ul { list-style: disc; padding-left: 1.6em; }
.md ol { list-style: decimal; padding-left: 1.6em; }
.md li > input[type='checkbox'] { margin-right: 0.4em; }
.md ul:has(> li > input[type='checkbox']) { list-style: none; padding-left: 0.2em; }
.md a { text-decoration: underline; text-underline-offset: 2px; }
.md code { font-family: var(--font-mono); font-size: 0.875em; background: var(--ui-bg-elevated); padding: 0.15em 0.4em; border-radius: 6px; }
.md pre { background: var(--ui-bg-elevated); padding: 1em; border-radius: 8px; overflow: auto; }
.md pre code { background: none; padding: 0; }
.md blockquote { border-left: 4px solid var(--ui-border-accented, var(--ui-border)); padding-left: 1em; color: var(--ui-text-muted); }
.md table { border-collapse: collapse; display: block; overflow: auto; }
.md th, .md td { border: 1px solid var(--ui-border); padding: 0.4em 0.8em; }
.md th { background: var(--ui-bg-elevated); font-weight: 600; }
.md hr { border: 0; border-top: 1px solid var(--ui-border); margin: 1.5em 0; }
.md img { max-width: 100%; }
.md-toc { list-style: none !important; padding-left: 0 !important; border: 1px solid var(--ui-border); border-radius: 8px; padding: 0.8em 1em !important; }
.md-alert { border-left: 4px solid; padding: 0.4em 1em; margin: 0 0 1em; border-radius: 2px; }
.md-alert > p { margin: 0.3em 0; }
.md-alert-title { font-weight: 600; }
.md-alert-note { border-color: #3b82f6; } .md-alert-note .md-alert-title { color: #3b82f6; }
.md-alert-tip { border-color: #22c55e; } .md-alert-tip .md-alert-title { color: #22c55e; }
.md-alert-important { border-color: #a855f7; } .md-alert-important .md-alert-title { color: #a855f7; }
.md-alert-warning { border-color: #eab308; } .md-alert-warning .md-alert-title { color: #eab308; }
.md-alert-caution { border-color: #ef4444; } .md-alert-caution .md-alert-title { color: #ef4444; }
</style>
