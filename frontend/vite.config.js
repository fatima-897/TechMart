import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // strictPort: if 5173 is busy, fail loudly instead of silently moving to 5174
  // (the backend only allows requests from the origin listed in its .env).
  server: { port: 5173, strictPort: true },
  test: { environment: 'jsdom', globals: true, setupFiles: './src/test/setup.js' },
});
