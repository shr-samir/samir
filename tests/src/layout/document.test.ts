import { test } from "node:test";
import assert from "node:assert/strict";
import { document } from "#src/layout/document.ts";
import { html } from "#src/lib/html.ts";
import { siteConfig } from "#site.config.ts";
import { accents, buildPalette } from "#src/styles/palette.ts";
import { toHex } from "#src/styles/color.ts";

const page = document({
  path: "/about/",
  title: "About",
  description: "About Samir.",
  lang: "en",
  body: html`<p>hi</p>`,
});
const out = page.value;

test("sets the canonical URL from site.config's url plus the page path", () => {
  assert.match(out, new RegExp(`<link rel="canonical" href="${siteConfig.url}/about/">`));
});

test("repeats title and description into OG and Twitter tags, not just <title>/<meta description>", () => {
  for (const tag of [
    '<meta name="description" content="About Samir.">',
    '<meta property="og:title" content="About">',
    '<meta property="og:description" content="About Samir.">',
    '<meta name="twitter:title" content="About">',
    '<meta name="twitter:description" content="About Samir.">',
  ]) {
    assert.ok(out.includes(tag), `missing: ${tag}`);
  }
});

test("theme-color matches the real default accent's light --color-bg, not a hardcoded guess", () => {
  const expected = toHex(buildPalette(accents[0]!, "light").bg);
  assert.match(out, new RegExp(`<meta name="theme-color" content="${expected}">`));
});

test("og:image and twitter:image point at the site-wide default, as a full URL", () => {
  const expectedImage = `${siteConfig.url}/og-default.png`;
  assert.match(out, new RegExp(`<meta property="og:image" content="${expectedImage}">`));
  assert.match(out, new RegExp(`<meta name="twitter:image" content="${expectedImage}">`));
  assert.match(out, /<meta property="og:image:width" content="1200">/);
  assert.match(out, /<meta property="og:image:height" content="630">/);
});

test("sets lang on <html> from the given value, not hardcoded", () => {
  assert.match(out, /<html lang="en">/);
  const french = document({ path: "/", title: "T", description: "D", lang: "fr", body: html`` });
  assert.match(french.value, /<html lang="fr">/);
});

test("escapes title and description, since they can come from content", () => {
  const unsafe = document({ path: "/", title: `<script>`, description: `"quoted" & unsafe`, lang: "en", body: html`` });
  assert.doesNotMatch(unsafe.value, /<script>/);
  assert.ok(unsafe.value.includes("&lt;script&gt;"));
});

test("references favicon, apple-touch-icon and the stylesheet", () => {
  assert.match(out, /<link rel="icon" href="\/favicon\.ico" sizes="32x32">/);
  assert.match(out, /<link rel="icon" href="\/favicon\.svg" type="image\/svg\+xml">/);
  assert.match(out, /<link rel="apple-touch-icon" href="\/apple-touch-icon\.png">/);
  assert.match(out, /<link rel="stylesheet" href="\/site\.css">/);
});
