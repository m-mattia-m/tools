export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  // Pure client-side app: everything runs in the browser, nothing is stored.
  ssr: false,
  devtools: { enabled: true },
  app: {
    head: {
      title: 'Tools',
      htmlAttrs: { lang: 'en' }
    }
  }
})
