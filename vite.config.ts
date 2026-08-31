import { federation } from '@module-federation/vite'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    vue(),
    federation({
      name: 'moduleManagement',
      filename: 'remoteEntry.js',
      dev: { remoteHmr: true },
      exposes: {
        './ManagementPage': './src/ManagementPage.vue'
      },
      dts: false,
      shared: ['vue']
    })
  ],
  server: {
    origin: 'http://localhost:4176'
  }
})
