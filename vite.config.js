import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'https://tank-battle-3d-nine.vercel.app',
        changeOrigin: true,
      },
    },
  },
});
