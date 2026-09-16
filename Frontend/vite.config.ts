import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file from the parent directory (since envDir is "../")
  const env = loadEnv(mode, path.resolve(__dirname, "../"), "");
  const rawBackendUrl = env.CHAT_API_URL || "http://localhost:7860";
  const backendTarget = rawBackendUrl.replace(/\/+$/, "").replace(/\/chat$/, "");

  return {
    server: {
      host: "localhost",
      port: 8080,
      proxy: {
        "/api": {
          target: backendTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              if (env.HF_TOKEN) {
                proxyReq.setHeader("Authorization", `Bearer ${env.HF_TOKEN.trim()}`);
              }
            });
          },
        },
      },
    },
    envDir: "../",
    plugins: [
      react(),
      mode === 'development' &&
      componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
