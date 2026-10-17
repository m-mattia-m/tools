declare module '#app' {
  interface PageMeta {
    /** Short description shown on the tile and the tool page. */
    description?: string
    /** Iconify name, e.g. `i-lucide-key-round`. */
    icon?: string
    /** Tags used for filtering. A page is listed on the index iff it has tags. */
    tags?: string[]
  }
}

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    description?: string
    icon?: string
    tags?: string[]
  }
}

export {}
