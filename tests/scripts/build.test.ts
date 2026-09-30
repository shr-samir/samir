import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "#scripts/build.ts";

// Fixtures live in the system temp folder, outside this package, so they can't
// use "#src/…" themselves; they import html.ts by its resolved file URL instead.
const HTML_MODULE = import.meta.resolve("#src/lib/html.ts");

/** Creates a throwaway project with the given files (paths relative to its root). */
async function fixture(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "portfolio-build-"));
  await writeFile(join(root, "package.json"), `{ "type": "module" }`);
  for (const [path, content] of Object.entries(files)) {
    await mkdir(join(root, path, ".."), { recursive: true });
    await writeFile(join(root, path), content);
  }
  return root;
}

function pageModule(pages: Array<[path: string, body: string]>): string {
  return `import { html } from "${HTML_MODULE}";
export default () => ${JSON.stringify(pages)}.map(([path, body]) => ({ path, body: html\`\${body}\` }));`;
}

async function withFixture(files: Record<string, string>, run: (root: string) => Promise<void>): Promise<void> {
  const root = await fixture(files);
  try {
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("renders each page to <path>/index.html with escaped content", () =>
  withFixture(
    {
      "src/pages/index.ts": pageModule([["/", "Home & <away>"]]),
      "src/pages/about.ts": pageModule([["/about/", "About"]]),
    },
    async (root) => {
      const result = await build({ root });
      assert.deepEqual(result.pages.sort(), ["/", "/about/"]);
      assert.equal(await readFile(join(root, "dist", "index.html"), "utf8"), "Home &amp; &lt;away&gt;");
      assert.equal(await readFile(join(root, "dist", "about", "index.html"), "utf8"), "About");
    },
  ));

test("one module can produce many pages, including nested paths", () =>
  withFixture({ "src/pages/blog.ts": pageModule([["/blog/", "Index"], ["/blog/first-post/", "First"]]) }, async (root) => {
    await build({ root });
    assert.equal(await readFile(join(root, "dist", "blog", "first-post", "index.html"), "utf8"), "First");
  }));

test("copies public/ and removes stale output", () =>
  withFixture(
    {
      "src/pages/index.ts": pageModule([["/", "Home"]]),
      "public/fonts/a.woff2": "font",
      "dist/stale.html": "old",
    },
    async (root) => {
      await build({ root });
      assert.equal(await readFile(join(root, "dist", "fonts", "a.woff2"), "utf8"), "font");
      await assert.rejects(access(join(root, "dist", "stale.html")));
    },
  ));

test("fails on duplicate paths, naming both modules", () =>
  withFixture(
    {
      "src/pages/a.ts": pageModule([["/same/", "A"]]),
      "src/pages/b.ts": pageModule([["/same/", "B"]]),
    },
    async (root) => {
      await assert.rejects(build({ root }), /Duplicate page path "\/same\/" from src\/pages\/a\.ts and src\/pages\/b\.ts/);
    },
  ));

test("fails on an invalid path", () =>
  withFixture({ "src/pages/a.ts": pageModule([["/About", "A"]]) }, async (root) => {
    await assert.rejects(build({ root }), /Invalid page path "\/About"/);
  }));

test("fails when a page collides with a public/ file", () =>
  withFixture(
    {
      "src/pages/index.ts": pageModule([["/", "Home"]]),
      "public/index.html": "static",
    },
    async (root) => {
      await assert.rejects(build({ root }), /Page "\/" collides with a file copied from public\//);
    },
  ));

test("fails when a module has no default-exported function, naming the file", () =>
  withFixture({ "src/pages/broken.ts": "export const pages = [];" }, async (root) => {
    await assert.rejects(build({ root }), /src\/pages\/broken\.ts must default-export a function/);
  }));

test("refuses an output directory that is the root or outside it", () =>
  withFixture({ "src/pages/index.ts": pageModule([["/", "Home"]]) }, async (root) => {
    await assert.rejects(build({ root, outDir: root }), /must be inside the project root/);
    await assert.rejects(build({ root, outDir: join(root, "..") }), /must be inside the project root/);
    await access(join(root, "src", "pages", "index.ts")); // nothing was deleted
  }));
