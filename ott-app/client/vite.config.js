import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Saari /api calls Express backend par jaati hain (API keys sirf backend mein)
    proxy: { '/api': 'http://localhost:5174' },
  },
});
