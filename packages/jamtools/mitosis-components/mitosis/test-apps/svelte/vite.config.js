import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    allowedHosts: [
      '5173-jamtools-jamtools-ve96ewqgyik.ws-us117.gitpod.io'
    ]
  }
});
