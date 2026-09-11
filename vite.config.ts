// eslint-disable-next-line @typescript-eslint/triple-slash-reference -- required by Vitest to type the `test` config key
/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    host: host || false,
    watch: { ignored: ['**/src-tauri/**'] },
  },
  build: { target: 'chrome120', sourcemap: true },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // @liqui-design/glass imports its stylesheet as a side effect
    // (`import './glass.css'`); Vitest's default dep externalization hands
    // that straight to Node's ESM loader, which doesn't know `.css`. Inlining
    // the package routes it through Vite's pipeline instead, where `css:
    // false` above turns the import into a no-op.
    server: { deps: { inline: ['@liqui-design/glass'] } },
  },
});
