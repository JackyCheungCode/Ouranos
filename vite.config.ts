import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { 'lucide-react': new URL('./src/lib/odoo-icons.tsx', import.meta.url).pathname } },
})
