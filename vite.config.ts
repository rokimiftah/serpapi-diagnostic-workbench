import path from "node:path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import { backendHmr } from "./hmr";

export default defineConfig({
  plugins: [react(), tailwindcss(), backendHmr()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./frontend"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
  server: {
    port: 3000,
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom"],
  },
  build: {
    outDir: "dist/frontend",
    rollupOptions: {
      input: {
        main: "index.html",
      },
    },
  },
});
