/**
 * Static site build (D1): renders every page module in `src/pages/` to
 * `dist/<path>/index.html`, writes `dist/site.css` from
 * `src/styles/stylesheet.ts`, and copies `public/` as-is.
 *
 * Run with `pnpm build`.
 */
import { cp, mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, isAbsolute } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { outputFile, type Page, type PageModule } from "#src/lib/page.ts";
import { checkRawValues } from "#scripts/check-raw-values.ts";
import { checkMetadata, extractMetadata } from "#scripts/check-metadata.ts";

export interface BuildOptions {
  /** Project root containing `src/pages/` and optionally `public/`. */
  root: string;
  /** Output directory; must be inside `root`. Defaults to `<root>/dist`. */
  outDir?: string;
}

export interface BuildResult {
  pages: string[];
  /** Whether `site.css` was written (projects without `src/styles/stylesheet.ts` have none). */
  stylesheet: boolean;
}

/** The module whose default export returns the site's CSS (F1a-D3). */
type StylesheetModule = {
  default: () => string | Promise<string>;
};

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

  // Every page needs complete, unique metadata (R9), checked before any file is written.
  const metadataViolations = checkMetadata(pages.map((page) => extractMetadata(page.path, page.body.value)));
  if (metadataViolations.length > 0) {
    const list = metadataViolations.map((v) => `  - "${v.path}": ${v.message}`).join("\n");
    throw new Error(`Page metadata is incomplete or duplicated:\n${list}`);
  }

  for (const page of pages) {
    await writeNew(join(outDir, outputFile(page.path)), page.body.value, `Page "${page.path}"`);
  }

  const stylesDir = join(root, "src", "styles");
  if (await exists(stylesDir)) {
    // Every hand-written CSS file must use tokens, not raw values (R1, D2). Checked
    // before writing site.css, so a violation fails the build with no output.
    const violations = await checkRawValues(stylesDir);
    if (violations.length > 0) {
      const list = violations.map((v) => `  - ${v.file}:${v.line} "${v.value}" — ${v.reason}`).join("\n");
      throw new Error(`Raw design values found outside the token source:\n${list}`);
    }
  }

  const stylesheetModule = join(stylesDir, "stylesheet.ts");
  const hasStylesheet = await exists(stylesheetModule);
  if (hasStylesheet) {
    const module = (await import(pathToFileURL(stylesheetModule).href)) as Partial<StylesheetModule>;
    if (typeof module.default !== "function") {
      throw new Error("src/styles/stylesheet.ts must default-export a function that returns the site's CSS");
    }
    await writeNew(join(outDir, "site.css"), await module.default(), "site.css");
  }

  return { pages: pages.map((page) => page.path), stylesheet: hasStylesheet };
}

/** Writes a file that must not exist yet, so generated output never silently replaces a public/ file. */
async function writeNew(file: string, content: string, label: string): Promise<void> {
  await mkdir(dirname(file), { recursive: true });
  try {
    await writeFile(file, content, { flag: "wx" });
  } catch (error) {
    if (isErrorCode(error, "EEXIST")) {
      throw new Error(`${label} collides with a file copied from public/`);
    }
    throw error;
  }
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
