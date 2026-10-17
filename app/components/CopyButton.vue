<script setup lang="ts">
const props = defineProps<{ text: string, label?: string }>()
const { copy } = useCopy()
</script>

<template>
  <UTooltip :text="`Copy ${props.label ?? 'value'}`">
    <UButton
      icon="i-lucide-copy"
      color="neutral"
      variant="ghost"
      size="xs"
      :disabled="!props.text"
      :aria-label="`Copy ${props.label ?? 'value'}`"
      @click="copy(props.text, props.label)"
    />
  </UTooltip>
</template>
