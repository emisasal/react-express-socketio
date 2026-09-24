import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // proxy: {
  //   "/socket.io": { target: "http://localhost:4000", ws: true },
  // },
})
