export function useCopy() {
  const toast = useToast()

  async function copy(text: string, label = 'Value') {
    try {
      await navigator.clipboard.writeText(text)
      toast.add({ title: `${label} copied`, icon: 'i-lucide-check', color: 'success', duration: 1500 })
    } catch {
      toast.add({ title: 'Copy failed', icon: 'i-lucide-x', color: 'error' })
    }
  }

  return { copy }
}
