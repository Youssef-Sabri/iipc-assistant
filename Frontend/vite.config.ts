import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file from the parent directory (since envDir is "../")
  const env = loadEnv(mode, path.resolve(__dirname, "../"), "");
  const backendUrl = env.CHAT_API_URL;

  return {
    server: {
      host: "localhost",
      port: 8080,
      proxy: {
        "/api": {
          target: backendUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              if (env.BACKEND_API_KEY) {
                proxyReq.setHeader("Authorization", `Bearer ${env.BACKEND_API_KEY.trim()}`);
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
