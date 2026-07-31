import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// Point this at a running raisfast binary (default APP_PORT is 9898).
const backend = process.env.RAISFAST_BACKEND ?? "http://localhost:9898";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-md-editor": ["@uiw/react-md-editor"],
          "vendor-xyflow": ["@xyflow/react"],
          "vendor-chart": ["chart.js", "react-chartjs-2"],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": { target: backend, changeOrigin: true },
      "/storage": { target: backend, changeOrigin: true },
      "/uploads": { target: backend, changeOrigin: true },
    },
  },
});
