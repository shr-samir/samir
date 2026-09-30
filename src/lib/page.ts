import type { SafeHtml } from "#src/lib/html.ts";

/** One rendered URL. */
export interface Page {
  /** URL path: lowercase, hyphenated segments, always ending in `/` (e.g. `/`, `/blog/my-post/`). */
  path: string;
  /** The complete HTML document. */
  body: SafeHtml;
}

/**
 * A module in `src/pages/` default-exports one of these. A module handles one
 * URL pattern, so it may return many pages (e.g. one per post).
 */
export type PageModule = {
  default: () => Page[] | Promise<Page[]>;
};

const PAGE_PATH = /^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*\/)*$/;

/**
 * Maps a URL path to its output file, relative to the output directory:
 * `/` → `index.html`, `/blog/my-post/` → `blog/my-post/index.html`.
 */
export function outputFile(path: string): string {
  if (!PAGE_PATH.test(path)) {
    throw new Error(
      `Invalid page path "${path}": use lowercase letters, digits and single hyphens, starting and ending with "/"`,
    );
  }
  return `${path.slice(1)}index.html`;
}
