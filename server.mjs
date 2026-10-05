import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";
import { createApiMiddleware } from "./server/api.mjs";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));
const isDev = process.argv.includes("--dev");
const port = Number(process.env.PORT || 5173);
const distRoot = resolve(projectRoot, "dist");
const apiMiddleware = createApiMiddleware();
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

const vite = isDev
  ? await createViteServer({ server: { middlewareMode: true }, appType: "spa" })
  : null;

async function serveBuiltFile(request, response) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  } catch {
    response.writeHead(400).end("Invalid URL");
    return;
  }

  let filePath = resolve(distRoot, `.${pathname}`);
  if (filePath !== distRoot && !filePath.startsWith(`${distRoot}${sep}`)) {
    response.writeHead(403).end("Forbidden");
    return;
  }

  try {
    if (!(await stat(filePath)).isFile()) filePath = resolve(distRoot, "index.html");
  } catch {
    filePath = resolve(distRoot, "index.html");
  }

  try {
    const fileInfo = await stat(filePath);
    response.writeHead(200, {
      "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream",
      "Content-Length": fileInfo.size,
    });
    if (request.method === "HEAD") response.end();
    else createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404).end("Run npm run build before starting TextTV.");
  }
}

const server = createServer((request, response) => {
  apiMiddleware(request, response, () => {
    if (vite) vite.middlewares(request, response, () => response.writeHead(404).end());
    else void serveBuiltFile(request, response);
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`TextTV ${isDev ? "development" : "server"} listening on port ${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    server.close();
    await vite?.close();
    process.exit(0);
  });
}