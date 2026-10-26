import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import { createWorkspaceMediaHandler } from "./netlify/functions/workspace-media.js";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const configuredApiUrl =
    env.VITE_API_URL ||
    env.VITE_API_BASE_URL ||
    "https://facemex-backend-4akg.onrender.com";
  const aiProxyTarget = new URL(configuredApiUrl).origin;
  const workspaceMediaHandler = createWorkspaceMediaHandler({ env });
  const workspaceMediaPlugin = {
    name: "facemex-workspace-media-dev",
    configureServer(server) {
      server.middlewares.use("/api/workspace/media", async (request, response) => {
        if (request.method !== "POST") {
          response.statusCode = 405;
          response.setHeader("Allow", "POST");
          response.end();
          return;
        }

        const chunks: Buffer[] = [];
        let size = 0;
        for await (const chunk of request) {
          size += chunk.length;
          if (size > 4_000) {
            response.statusCode = 413;
            response.setHeader("Content-Type", "application/json; charset=utf-8");
            response.end(JSON.stringify({ error: "request_too_large" }));
            return;
          }
          chunks.push(chunk);
        }

        try {
          const result = await workspaceMediaHandler({
            httpMethod: request.method,
            headers: request.headers,
            body: Buffer.concat(chunks).toString("utf8"),
          });
          response.statusCode = result.statusCode;
          for (const [name, value] of Object.entries(result.headers || {})) {
            response.setHeader(name, value);
          }
          response.end(result.body);
        } catch (error) {
          console.error("Local Workspace media request failed", {
            errorName: error instanceof Error ? error.name : "UnknownError",
          });
          response.statusCode = 500;
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.end(JSON.stringify({ error: "media_unavailable" }));
        }
      });
    },
  };

  return {
    base: "/",
    optimizeDeps: {
      entries: ["src/main.tsx", "src/tempobook/**/*"],
    },
    plugins: [
      react(),
      workspaceMediaPlugin,
    ],
    resolve: {
      preserveSymlinks: true,
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      // @ts-ignore
      allowedHosts: true,
      proxy: {
        "/api/ai": {
          target: aiProxyTarget,
          changeOrigin: true,
          configure(proxy) {
            proxy.on("proxyReq", (proxyReq) => {
              proxyReq.removeHeader("origin");
            });
          },
        },
      },
    },
  };
});
