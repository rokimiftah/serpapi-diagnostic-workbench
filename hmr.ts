import type { Plugin, ViteDevServer } from "vite";

export function backendHmr(): Plugin {
  return {
    name: "backend-hmr",
    configureServer(server: ViteDevServer) {
      // biome-ignore lint/suspicious/noExplicitAny: <>
      const handler = (req: any, res: any, next: () => void) => {
        if (req.url === "/__backend-reload") {
          server.ws.send({ type: "full-reload" });
          res.writeHead(200);
          res.end("ok");
          return;
        }
        next();
      };
      server.middlewares.use(handler);
    },
  };
}
