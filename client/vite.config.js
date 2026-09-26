import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()], resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  server: { port: 5173, proxy: { "/api": "http://localhost:4100" } },
  build: { rollupOptions: { output: { manualChunks: { react: ["react", "react-dom", "react-router-dom"], charts: ["recharts"], motion: ["framer-motion"], data: ["@tanstack/react-query", "axios"] } } } }
});
