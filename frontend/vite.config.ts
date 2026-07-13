import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Bind to 0.0.0.0 (not just localhost) so phones on the same Wi-Fi
    // can reach this dev server via the machine's LAN IP — required for
    // the Install page's QR code / mobile testing to work at all.
    host: true,
  },
})
