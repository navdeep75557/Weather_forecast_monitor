import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  // loadEnv reads .env files; process.env alone would ignore VITE_PROXY_TARGET set there.
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), tailwindcss()],
    // In dev, /api is proxied to the FastAPI backend so no CORS setup is needed locally.
    server: {
      port: 5173,
      proxy: { "/api": env.VITE_PROXY_TARGET || "http://localhost:8000" },
    },
    // Charts are lazy-loaded into their own chunk; Recharts alone is ~450 kB minified.
    build: { chunkSizeWarningLimit: 600 },
  };
});
