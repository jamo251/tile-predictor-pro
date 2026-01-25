import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Ensuring process.env is available for the Gemini SDK
    'process.env': process.env
  }
});