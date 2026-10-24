import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  // loadEnv reads .env files; process.env alone would ignore VITE_PROXY_TARGET set there.
  const env = loadEnv(mode, process.cwd(), "");
  const proxy = { "/api": env.VITE_PROXY_TARGET || "http://localhost:8000" };
  return {
    plugins: [react(), tailwindcss()],
    // In dev, /api is proxied to the FastAPI backend so no CORS setup is needed locally.
    server: { port: 5173, proxy },
    // `vite preview` serves the production build with the same proxy (used by the e2e tests).
    preview: { port: 4173, proxy },
    // Charts are lazy-loaded into their own chunk; Recharts alone is ~450 kB minified.
    build: { chunkSizeWarningLimit: 600 },
  };
});
