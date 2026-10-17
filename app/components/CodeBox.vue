<script setup lang="ts">
const props = defineProps<{ text: string, title?: string, label?: string, maxHeight?: string }>()
const LIMIT = 20000
const shown = computed(() =>
  props.text.length > LIMIT
    ? `${props.text.slice(0, LIMIT)}\n… ${props.text.length - LIMIT} more characters (use copy to get everything)`
    : props.text
)
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-default bg-elevated/50">
    <div class="flex items-center justify-between border-b border-default px-3 py-1">
      <span class="text-xs font-medium text-muted">{{ props.title }}</span>
      <CopyButton :text="props.text" :label="props.label ?? props.title?.toLowerCase()" />
    </div>
    <pre
      class="overflow-auto whitespace-pre-wrap break-all p-3 font-mono text-sm"
      :style="{ maxHeight: props.maxHeight ?? '24rem' }"
    >{{ shown }}</pre>
  </div>
</template>
