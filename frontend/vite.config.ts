import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  // loadEnv reads .env files; process.env alone would ignore VITE_PROXY_TARGET set there.
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    // In dev, /api is proxied to the FastAPI backend so no CORS setup is needed locally.
    server: {
      port: 5173,
      proxy: { "/api": env.VITE_PROXY_TARGET || "http://localhost:8000" },
    },
    // Recharts alone is ~500 kB minified; one chunk is fine for a single-page dashboard.
    build: { chunkSizeWarningLimit: 900 },
  };
});
