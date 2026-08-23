import { fileURLToPath, URL } from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    vue(),
    {
      name: "web-health",
      configureServer(server) {
        server.middlewares.use("/health", (_request, response) => {
          response.statusCode = 200;
          response.setHeader("Content-Type", "application/json");
          response.end(JSON.stringify({ service: "web", status: "UP" }));
        });
      },
    },
  ],
  server: {
    host: true,
    proxy: {
      "/api": {
        target: process.env.JAVA_CORE_URL ?? "http://127.0.0.1:8080",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@contracts": fileURLToPath(new URL("../../contracts", import.meta.url)),
    },
  },
});
