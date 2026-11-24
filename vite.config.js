import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';

const r = (p) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  root: r('./client'),
  plugins: [vue()],
  resolve: { alias: { '@': r('./client/src'), '@shared': r('./shared') } },
  server: { fs: { allow: [r('.')] } },
  build: { outDir: r('./dist'), emptyOutDir: true },
});
