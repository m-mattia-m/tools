export default defineAppConfig({
  ui: {
    // shadcn-like: monochrome primary on a zinc scale instead of Nuxt green
    colors: {
      primary: 'neutral',
      neutral: 'zinc'
    },
    card: {
      slots: {
        root: 'rounded-xl bg-default ring ring-default shadow-xs divide-y-0',
        header: 'p-4 sm:px-5 border-b border-default',
        body: 'p-4 sm:p-5'
      }
    },
    button: {
      defaultVariants: { size: 'md' }
    },
    badge: {
      slots: { base: 'rounded-md font-medium' }
    }
  }
})
