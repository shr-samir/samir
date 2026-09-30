import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { preview } from "#scripts/preview.ts";

/** Starts preview() on an ephemeral port and returns a fetch scoped to it, plus a cleanup fn. */
async function withPreview(files: Record<string, string>) {
  const root = await mkdtemp(join(tmpdir(), "preview-"));
  for (const [path, content] of Object.entries(files)) {
    await mkdir(join(root, path, ".."), { recursive: true });
    await writeFile(join(root, path), content);
  }
  const server = preview(root, 0); // port 0: ask the OS for any free port
  await new Promise((resolve) => server.once("listening", resolve));
  const port = (server.address() as { port: number }).port;
  const get = (path: string) => fetch(`http://localhost:${port}${path}`);
  const close = async () => {
    server.close();
    await rm(root, { recursive: true, force: true });
  };
  return { get, close };
}

test("serves a page at its root path with the right content type", async () => {
  const { get, close } = await withPreview({ "index.html": "<h1>Home</h1>" });
  try {
    const res = await get("/");
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type")!, /^text\/html/);
    assert.equal(await res.text(), "<h1>Home</h1>");
  } finally {
    await close();
  }
});

test("serves a nested page's index.html for its directory URL", async () => {
  const { get, close } = await withPreview({ "design/index.html": "<h1>Design</h1>" });
  try {
    assert.equal(await (await get("/design/")).text(), "<h1>Design</h1>");
  } finally {
    await close();
  }
});

test("serves site.css with a CSS content type, so root-relative <link> tags resolve", async () => {
  const { get, close } = await withPreview({ "index.html": "x", "site.css": "body { color: red; }" });
  try {
    const res = await get("/site.css");
    assert.match(res.headers.get("content-type")!, /^text\/css/);
    assert.equal(await res.text(), "body { color: red; }");
  } finally {
    await close();
  }
});

test("serves a font file with the font/woff2 content type", async () => {
  const { get, close } = await withPreview({ "fonts/x.woff2": "fake-font-bytes" });
  try {
    const res = await get("/fonts/x.woff2");
    assert.equal(res.headers.get("content-type"), "font/woff2");
  } finally {
    await close();
  }
});

test("returns 404 for a missing file", async () => {
  const { get, close } = await withPreview({ "index.html": "x" });
  try {
    assert.equal((await get("/nope.html")).status, 404);
  } finally {
    await close();
  }
});

test("refuses to serve a path that escapes the root, including a percent-encoded traversal", async () => {
  // A file that really exists one level above root, to prove escaping would have worked otherwise.
  const root = await mkdtemp(join(tmpdir(), "preview-"));
  const parentSecret = join(root, "..", "secret.txt");
  await writeFile(parentSecret, "top secret");
  await mkdir(join(root), { recursive: true });
  await writeFile(join(root, "index.html"), "ok");
  const server = preview(root, 0);
  await new Promise((resolve) => server.once("listening", resolve));
  const port = (server.address() as { port: number }).port;
  try {
    // A literal "/../secret.txt" is normalized away by the URL constructor itself before this
    // code ever sees it, so it can't tell us anything about our own guard. A request that keeps
    // its ".." past percent-decoding is the actual attack shape the guard has to stop.
    const res = await fetch(`http://localhost:${port}/foo/..%2f..%2fsecret.txt`);
    assert.equal(res.status, 404);
  } finally {
    server.close();
    await rm(parentSecret, { force: true });
    await rm(root, { recursive: true, force: true });
  }
});

test("decodes a URL-encoded path", async () => {
  const { get, close } = await withPreview({ "a b.html": "spaced" });
  try {
    assert.equal(await (await get("/a%20b.html")).text(), "spaced");
  } finally {
    await close();
  }
});
