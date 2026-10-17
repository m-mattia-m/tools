export interface Tool {
  path: string
  title: string
  description: string
  icon: string
  tags: string[]
}

/**
 * Builds the tool list from the router: every page that declares `tags` via
 * `definePageMeta` is a tool. No separate registry to maintain.
 */
export function useTools(): Tool[] {
  return useRouter()
    .getRoutes()
    .filter(route => Array.isArray(route.meta.tags) && route.meta.tags.length > 0)
    .map(route => ({
      path: route.path,
      title: route.meta.title ?? route.path,
      description: route.meta.description ?? '',
      icon: route.meta.icon ?? 'i-lucide-wrench',
      tags: route.meta.tags ?? []
    }))
}
