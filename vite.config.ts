import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: null,
      manifest: {
        name: 'tendline',
        short_name: 'tendline',
        description: 'A shared perspective on your day.',
        theme_color: '#234f49',
        background_color: '#f7f6f2',
        display: 'standalone',
        icons: [
          { src: '/icons/tendline.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
        cleanupOutdatedCaches: true,
        navigateFallbackDenylist: [/^\/auth\//],
        runtimeCaching: [],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          validation: ['zod'],
        },
      },
    },
  },
  test: { include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'], testTimeout: 30000 },
});
