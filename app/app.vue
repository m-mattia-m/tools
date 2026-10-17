<script setup lang="ts">
const route = useRoute()
const isTool = computed(() => Array.isArray(route.meta.tags) && route.meta.tags.length > 0)

useHead({
  title: computed(() => route.meta.title ? `${route.meta.title} · Tools` : 'Tools')
})
</script>

<template>
  <UApp>
    <header class="sticky top-0 z-10 border-b border-default bg-default/80 backdrop-blur">
      <UContainer class="flex h-14 items-center justify-between">
        <NuxtLink to="/" class="flex items-center gap-2 font-semibold">
          <span class="flex size-7 items-center justify-center rounded-md bg-inverted text-inverted"><UIcon name="i-lucide-wrench" class="size-4" /></span>
          Tools
        </NuxtLink>
        <UColorModeButton />
      </UContainer>
    </header>

    <UContainer class="py-10">
      <div v-if="isTool" class="mb-6 space-y-3">
        <UButton to="/" icon="i-lucide-arrow-left" color="neutral" variant="link" class="px-0">
          All tools
        </UButton>
        <div class="flex items-start gap-3">
          <span class="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg bg-elevated ring ring-default"><UIcon :name="route.meta.icon ?? 'i-lucide-wrench'" class="size-5" /></span>
          <div>
            <h1 class="text-2xl font-semibold tracking-tight">{{ route.meta.title }}</h1>
            <p v-if="route.meta.description" class="text-muted">{{ route.meta.description }}</p>
          </div>
        </div>
      </div>
      <NuxtPage />
    </UContainer>
  </UApp>
</template>
