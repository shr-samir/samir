import { html, type SafeHtml } from "#src/lib/html.ts";
import { siteConfig } from "#site.config.ts";
import { accents, buildPalette } from "#src/styles/palette.ts";
import { toHex } from "#src/styles/color.ts";

/** Every page's metadata contract (R9, F1b-D6) — missing a field is a type error, not a missing tag. */
export interface DocumentOptions {
  /** URL path, e.g. "/" or "/design/" — used for the canonical URL. */
  path: string;
  /** Unique across the site; build fails on a duplicate (O4). */
  title: string;
  /** Unique across the site; build fails on a duplicate (O4). */
  description: string;
  /** BCP 47 language tag. */
  lang: string;
  body: SafeHtml;
}

/** Site-wide default link-preview image (O5); F11 lets a page override it. */
const DEFAULT_OG_IMAGE = "/og-default.png";

/** Computed from the real default-accent token so it can't drift (theme-color needs hex, not oklch() [verified: MDN]); light theme only, A3. */
const THEME_COLOR = toHex(buildPalette(accents[0]!, "light").bg);

function canonicalUrl(path: string): string {
  return `${siteConfig.url}${path}`;
}

/** The HTML document every page renders through (B1) — no page hand-writes its own `<head>`. */
export function document({ path, title, description, lang, body }: DocumentOptions): SafeHtml {
  const canonical = canonicalUrl(path);
  const ogImage = canonicalUrl(DEFAULT_OG_IMAGE);

  return html`<!doctype html>
<html lang="${lang}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    <meta name="description" content="${description}">
    <link rel="canonical" href="${canonical}">
    <meta name="theme-color" content="${THEME_COLOR}">

    <meta property="og:type" content="website">
    <meta property="og:site_name" content="${siteConfig.name}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:image" content="${ogImage}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${ogImage}">

    <link rel="icon" href="/favicon.ico" sizes="32x32">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <link rel="apple-touch-icon" href="/apple-touch-icon.png">

    <link rel="preload" href="/fonts/geist-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="stylesheet" href="/site.css">
  </head>
  <body>
${body}
  </body>
</html>
`;
}
