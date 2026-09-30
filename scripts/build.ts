/**
 * Static site build (D1): renders every page module in `src/pages/` to
 * `dist/<path>/index.html` and copies `public/` as-is.
 *
 * Run with `pnpm build`.
 */
import { cp, mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, isAbsolute } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { outputFile, type Page, type PageModule } from "#src/lib/page.ts";

export interface BuildOptions {
  /** Project root containing `src/pages/` and optionally `public/`. */
  root: string;
  /** Output directory; must be inside `root`. Defaults to `<root>/dist`. */
  outDir?: string;
}

export interface BuildResult {
  pages: string[];
}

export async function build({ root, outDir = join(root, "dist") }: BuildOptions): Promise<BuildResult> {
  root = resolve(root);
  outDir = resolve(outDir);
  assertInside(root, outDir);

  // Start from an empty output directory so no stale files survive.
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  const publicDir = join(root, "public");
  if (await exists(publicDir)) {
    await cp(publicDir, outDir, { recursive: true });
  }

  const pages = await loadPages(join(root, "src", "pages"));
  for (const page of pages) {
    const file = join(outDir, outputFile(page.path));
    await mkdir(dirname(file), { recursive: true });
    try {
      // "wx" fails instead of overwriting, catching pages that collide with public/ files.
      await writeFile(file, page.body.value, { flag: "wx" });
    } catch (error) {
      if (isErrorCode(error, "EEXIST")) {
        throw new Error(`Page "${page.path}" collides with a file copied from public/`);
      }
      throw error;
    }
  }

  return { pages: pages.map((page) => page.path) };
}

async function loadPages(pagesDir: string): Promise<Page[]> {
  const files = (await readdir(pagesDir)).filter((name) => name.endsWith(".ts")).sort();

  const pages: Page[] = [];
  const sources = new Map<string, string>();
  for (const name of files) {
    const module = (await import(pathToFileURL(join(pagesDir, name)).href)) as Partial<PageModule>;
    if (typeof module.default !== "function") {
      throw new Error(`src/pages/${name} must default-export a function that returns its pages`);
    }
    for (const page of await module.default()) {
      const previous = sources.get(page.path);
      if (previous) {
        throw new Error(`Duplicate page path "${page.path}" from src/pages/${previous} and src/pages/${name}`);
      }
      sources.set(page.path, name);
      pages.push(page);
    }
  }
  return pages;
}

/** Guards the `rm` above: never clean the project root or anything outside it. */
function assertInside(root: string, dir: string): void {
  const rel = relative(root, dir);
  if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error(`Output directory must be inside the project root: ${dir}`);
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (isErrorCode(error, "ENOENT")) return false;
    throw error;
  }
}

function isErrorCode(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && error.code === code;
}

if (import.meta.main) {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const started = performance.now();
  try {
    const { pages } = await build({ root });
    console.log(`Built ${pages.length} page(s) in ${Math.round(performance.now() - started)} ms`);
  } catch (error) {
    console.error(`Build failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
