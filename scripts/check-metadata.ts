/**
 * Metadata check (R9, O4): every page's rendered HTML needs a title,
 * description and canonical URL, none repeated across pages. Checks the
 * rendered output, not `document()`'s inputs, so a template bug is caught
 * too. Regex over three known tags, not a general HTML parser — this
 * project's own output only. A page with no `<title>` at all is exempt (not
 * a real document; only build-mechanics test fixtures do this).
 */

export interface PageMetadata {
  path: string;
  title: string | null;
  description: string | null;
  canonical: string | null;
}

export interface Violation {
  path: string;
  message: string;
}

function extractTitle(html: string): string | null {
  const match = /<title>([^<]*)<\/title>/.exec(html);
  return match ? match[1]!.trim() : null;
}

function extractMetaContent(html: string, name: string): string | null {
  const match = new RegExp(`<meta\\s+name="${name}"\\s+content="([^"]*)"`).exec(html);
  return match ? match[1]!.trim() : null;
}

function extractCanonical(html: string): string | null {
  const match = /<link\s+rel="canonical"\s+href="([^"]*)"/.exec(html);
  return match ? match[1]!.trim() : null;
}

export function extractMetadata(path: string, html: string): PageMetadata {
  return {
    path,
    title: extractTitle(html),
    description: extractMetaContent(html, "description"),
    canonical: extractCanonical(html),
  };
}

/** Fields that must be present on every page and unique across all of them. */
const REQUIRED_UNIQUE_FIELDS = ["title", "description", "canonical"] as const;

export function checkMetadata(pages: readonly PageMetadata[]): Violation[] {
  const violations: Violation[] = [];

  for (const page of pages) {
    if (page.title === null) continue; // not a real document, see file header
    for (const field of REQUIRED_UNIQUE_FIELDS) {
      if (!page[field]) {
        violations.push({ path: page.path, message: `missing ${field}` });
      }
    }
  }

  for (const field of REQUIRED_UNIQUE_FIELDS) {
    const seenAt = new Map<string, string>();
    for (const page of pages) {
      const value = page[field];
      if (!value) continue; // already reported as missing above
      const previous = seenAt.get(value);
      if (previous) {
        violations.push({ path: page.path, message: `duplicate ${field} "${value}", also used by ${previous}` });
      } else {
        seenAt.set(value, page.path);
      }
    }
  }

  return violations;
}
