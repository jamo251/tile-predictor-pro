import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API_PROXY = process.env.VITE_DEV_API_PROXY ?? 'http://127.0.0.1:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: API_PROXY,
        changeOrigin: true,
      },
    },
  },
});
