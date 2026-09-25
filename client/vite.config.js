import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// In development the API is reached through this proxy, so the browser sees one
// origin (localhost:5173) — the same setup as production, where vercel.json
// rewrites /api/* to Render. That keeps the refresh cookie first-party everywhere.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        "/api": { target: env.VITE_DEV_API_TARGET || "http://localhost:5000", changeOrigin: true },
      },
    },
  };
});
