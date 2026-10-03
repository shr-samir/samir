/**
 * Serves `dist/` over HTTP so root-path links like `/site.css` resolve (X7) —
 * opening a built file directly makes the browser treat the filesystem as
 * root. Not a dev server: no rebuild or reload (F1b, D7); run `pnpm preview`.
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

// Arbitrary unregistered port; override with PORT. Checked for presence, not
// `||`, since PORT=0 (any free port) is falsy and would fall through.
const PORT = process.env.PORT ? Number(process.env.PORT) : 4173;

/** Enough to serve this site's own output correctly; unknown types fall back to octet-stream. */
const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
};

export function preview(root: string, port = PORT): ReturnType<typeof createServer> {
  const server = createServer((req, res) => {
    void (async () => {
      try {
        const file = resolveFile(root, req.url ?? "/");
        const body = await readFile(file);
        res.writeHead(200, { "content-type": CONTENT_TYPES[extname(file)] ?? "application/octet-stream" });
        res.end(body);
      } catch {
        res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        res.end("404 Not Found");
      }
    })();
  });
  server.listen(port);
  return server;
}

/** Maps a request URL to a file under `root`, defaulting a directory to its index.html. */
function resolveFile(root: string, url: string): string {
  const path = decodeURIComponent(new URL(url, "http://localhost").pathname);
  const relative = path.endsWith("/") ? `${path}index.html` : path;
  const resolved = normalize(join(root, relative));
  // Refuse an escaped path (e.g. "/../../secret"); same guard as build's assertInside.
  if (resolved !== root && !resolved.startsWith(root + sep)) {
    throw new Error(`Refusing to serve a path outside dist/: ${path}`);
  }
  return resolved;
}

if (import.meta.main) {
  const root = fileURLToPath(new URL("../dist", import.meta.url));
  const server = preview(root, PORT);
  server.on("listening", () => {
    console.log(`Previewing dist/ at http://localhost:${PORT}/ (rebuild with pnpm build, then refresh)`);
  });
  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      console.error(
        `Port ${PORT} is already in use — is another pnpm preview (or pnpm dev) already running?\n` +
          `Stop it, or run on a different port:\n` +
          `  PowerShell:  $env:PORT=4174; pnpm preview\n` +
          `  bash:        PORT=4174 pnpm preview`,
      );
    } else {
      console.error(`Preview server failed: ${error.message}`);
    }
    process.exitCode = 1;
  });
}
