// @ts-check
import preact from '@astrojs/preact';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://tower.dev',
  // One page, ~8 KB of CSS: inline it rather than spend a round trip before the first paint.
  build: { inlineStylesheets: 'always' },
  integrations: [preact()],
  i18n: {
    defaultLocale: 'ru',
    locales: ['ru', 'en'],
    routing: { prefixDefaultLocale: false },
  },
  vite: { plugins: [tailwindcss()] },
});
