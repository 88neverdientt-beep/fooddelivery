import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxy = {
    '/api': {
      target: env.API_PROXY_TARGET || 'http://127.0.0.1:18080',
      changeOrigin: false,
      cookiePathRewrite: { '/auth': '/api/auth' },
      rewrite: (path: string) => path.replace(/^\/api(?=\/|$)/, ''),
      configure: (server: import('node:events').EventEmitter) => {
        server.on('error', () => {
          /* Vite returns 5xx; never log request headers. */
        });
      },
    },
  };
  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: { host: 'localhost', port: 5173, strictPort: true, proxy },
    preview: { host: 'localhost', port: 4173, strictPort: true, proxy },
    build: { sourcemap: false, manifest: true },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      restoreMocks: true,
    },
  };
});
