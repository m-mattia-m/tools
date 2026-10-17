<script setup lang="ts">
const tools = useTools()

const search = ref('')
const selectedTags = ref<string[]>([])
const sort = ref<'title-asc' | 'title-desc'>('title-asc')

const allTags = computed(() => [...new Set(tools.flatMap(t => t.tags))].sort())

const sortItems = [
  { label: 'Name A–Z', value: 'title-asc' },
  { label: 'Name Z–A', value: 'title-desc' }
]

const visibleTools = computed(() => {
  const q = search.value.trim().toLowerCase()
  const result = tools.filter((tool) => {
    const matchesText = !q
      || [tool.title, tool.description, ...tool.tags].some(s => s.toLowerCase().includes(q))
    const matchesTags = selectedTags.value.every(tag => tool.tags.includes(tag))
    return matchesText && matchesTags
  })
  const dir = sort.value === 'title-asc' ? 1 : -1
  return result.sort((a, b) => a.title.localeCompare(b.title) * dir)
})

function toggleTag(tag: string) {
  selectedTags.value = selectedTags.value.includes(tag)
    ? selectedTags.value.filter(t => t !== tag)
    : [...selectedTags.value, tag]
}

function reset() {
  search.value = ''
  selectedTags.value = []
}
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-1 pb-2">
      <h1 class="text-3xl font-semibold tracking-tight">Developer tools</h1>
      <p class="text-muted">Small utilities that run entirely in your browser. Nothing is uploaded or stored.</p>
    </div>
    <div class="flex flex-col gap-3 md:flex-row">
      <UInput
        v-model="search"
        icon="i-lucide-search"
        placeholder="Search tools…"
        size="lg"
        class="flex-1"
        autofocus
      >
        <template v-if="search" #trailing>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="link"
            size="sm"
            aria-label="Clear search"
            @click="search = ''"
          />
        </template>
      </UInput>
      <USelectMenu
        v-model="selectedTags"
        :items="allTags"
        multiple
        icon="i-lucide-tags"
        placeholder="Filter by tags"
        size="lg"
        class="md:w-64"
      />
      <USelect v-model="sort" :items="sortItems" icon="i-lucide-arrow-down-a-z" size="lg" class="md:w-44" />
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <UBadge
        v-for="tag in allTags"
        :key="tag"
        :label="tag"
        :color="selectedTags.includes(tag) ? 'primary' : 'neutral'"
        :variant="selectedTags.includes(tag) ? 'solid' : 'subtle'"
        class="cursor-pointer"
        @click="toggleTag(tag)"
      />
    </div>

    <div v-if="visibleTools.length" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <NuxtLink v-for="tool in visibleTools" :key="tool.path" :to="tool.path" class="group">
        <UCard class="h-full transition group-hover:bg-elevated/60 group-hover:ring-accented">
          <div class="flex h-full flex-col gap-3">
            <div class="flex items-center gap-3">
              <span class="flex size-9 items-center justify-center rounded-lg bg-elevated ring ring-default"><UIcon :name="tool.icon" class="size-5" /></span>
              <h2 class="font-semibold tracking-tight">{{ tool.title }}</h2>
            </div>
            <p v-if="tool.description" class="flex-1 text-sm text-muted">{{ tool.description }}</p>
            <div class="flex flex-wrap gap-1.5">
              <UBadge v-for="tag in tool.tags" :key="tag" :label="tag" color="neutral" variant="subtle" size="sm" />
            </div>
          </div>
        </UCard>
      </NuxtLink>
    </div>

    <div v-else class="flex flex-col items-center gap-3 py-16 text-center text-muted">
      <UIcon name="i-lucide-search-x" class="size-10" />
      <p>No tools match your search.</p>
      <UButton color="neutral" variant="outline" @click="reset">Reset filters</UButton>
    </div>
  </div>
</template>
