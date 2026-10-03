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

/** Bare body (escaped), no document wrapper — for build-mechanics tests, not metadata. */
function pageModule(pages: Array<[path: string, body: string]>): string {
  return `import { html } from "${HTML_MODULE}";
export default () => ${JSON.stringify(pages)}.map(([path, body]) => ({ path, body: html\`\${body}\` }));`;
}

/** Full HTML document with valid default metadata; override only the field under test. */
function documentPageModule(pages: Array<{ path: string; title?: string; description?: string; canonical?: string }>): string {
  const docs = pages.map(({ path, title = `Title ${path}`, description = `Description ${path}`, canonical = `https://example.com${path}` }) => [
    path,
    `<!doctype html><html><head><title>${title}</title><meta name="description" content="${description}"><link rel="canonical" href="${canonical}"></head><body>x</body></html>`,
  ]);
  return `import { raw } from "${HTML_MODULE}";
export default () => ${JSON.stringify(docs)}.map(([path, body]) => ({ path, body: raw(body) }));`;
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

test("writes site.css from src/styles/stylesheet.ts when it exists", () =>
  withFixture(
    {
      "src/pages/index.ts": pageModule([["/", "Home"]]),
      "src/styles/stylesheet.ts": "export default async () => 'body { margin: 0; }';",
    },
    async (root) => {
      const result = await build({ root });
      assert.equal(result.stylesheet, true);
      assert.equal(await readFile(join(root, "dist", "site.css"), "utf8"), "body { margin: 0; }");
    },
  ));

test("builds without a stylesheet module", () =>
  withFixture({ "src/pages/index.ts": pageModule([["/", "Home"]]) }, async (root) => {
    const result = await build({ root });
    assert.equal(result.stylesheet, false);
    await assert.rejects(access(join(root, "dist", "site.css")));
  }));

test("fails the whole build on a raw value in hand-written CSS (O21)", () =>
  withFixture(
    {
      "src/pages/index.ts": pageModule([["/", "Home"]]),
      "src/styles/base.css": ".x { color: #fff; }",
      "src/styles/stylesheet.ts": "export default () => '';",
    },
    async (root) => {
      await assert.rejects(build({ root }), /Raw design values found.*base\.css:1 "#fff"/s);
      await assert.rejects(build({ root }), /Raw design values found/); // fails before writing site.css
    },
  ));

test("does not check fonts.css for raw values (X14)", () =>
  withFixture(
    {
      "src/pages/index.ts": pageModule([["/", "Home"]]),
      "src/styles/fonts.css": "@font-face { font-family: X; size-adjust: 102.19%; }",
      "src/styles/stylesheet.ts": "export default () => 'ok';",
    },
    async (root) => {
      const result = await build({ root });
      assert.equal(result.stylesheet, true);
    },
  ));

test("builds fine with no src/styles directory at all", () =>
  withFixture({ "src/pages/index.ts": pageModule([["/", "Home"]]) }, async (root) => {
    const result = await build({ root });
    assert.equal(result.stylesheet, false);
  }));

test("fails when site.css collides with a public/ file", () =>
  withFixture(
    {
      "src/pages/index.ts": pageModule([["/", "Home"]]),
      "src/styles/stylesheet.ts": "export default () => '';",
      "public/site.css": "old",
    },
    async (root) => {
      await assert.rejects(build({ root }), /site\.css collides with a file copied from public\//);
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

test("succeeds when every real page has complete, unique metadata (O3, O4)", () =>
  withFixture(
    { "src/pages/index.ts": documentPageModule([{ path: "/" }, { path: "/about/" }]) },
    async (root) => {
      const result = await build({ root });
      assert.deepEqual(result.pages.sort(), ["/", "/about/"]);
    },
  ));

test("fails the build on a missing title, description or canonical (O4)", () =>
  withFixture({ "src/pages/index.ts": documentPageModule([{ path: "/", title: "" }]) }, async (root) => {
    await assert.rejects(build({ root }), /Page metadata is incomplete.*"\/": missing title/s);
  }));

test("fails the build on a duplicate title, description or canonical across pages (O4)", () =>
  withFixture(
    {
      "src/pages/index.ts": documentPageModule([
        { path: "/", title: "Same Title" },
        { path: "/about/", title: "Same Title" },
      ]),
    },
    async (root) => {
      await assert.rejects(build({ root }), /duplicate title "Same Title", also used by \//);
    },
  ));

test("does not check a bare fragment with no <title> at all (build-mechanics fixtures stay exempt)", () =>
  withFixture({ "src/pages/index.ts": pageModule([["/", "Home"]]) }, async (root) => {
    const result = await build({ root });
    assert.deepEqual(result.pages, ["/"]);
  }));

test("checks metadata before writing any output file", () =>
  withFixture({ "src/pages/index.ts": documentPageModule([{ path: "/", canonical: "" }]) }, async (root) => {
    await assert.rejects(build({ root }), /Page metadata is incomplete/);
    await assert.rejects(access(join(root, "dist", "index.html")));
  }));
