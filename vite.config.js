import { defineConfig } from 'vite';

// O Mermaid sozinho passa de 500 kB; o aviso padrao do Vite nao ajuda aqui.
export default defineConfig({
  build: { chunkSizeWarningLimit: 2000 },
});
