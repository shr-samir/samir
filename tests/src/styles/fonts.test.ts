import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import stylesheet from "#src/styles/stylesheet.ts";
import { readWoff2Metrics } from "#scripts/font-metrics.ts";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const fontsCss = await readFile(`${root}src/styles/fonts.css`, "utf8");
const siteCss = await stylesheet();

/** Every url("/fonts/…") in fonts.css, as a path inside public/. */
const fontFiles = [...fontsCss.matchAll(/url\("\/fonts\/([^"]+)"\)/g)].map((m) => `public/fonts/${m[1]}`);

test("declares self-hosted Geist upright, italic and Geist Mono with font-display: swap", () => {
  assert.deepEqual(fontFiles.sort(), [
    "public/fonts/geist-latin-wght-italic.woff2",
    "public/fonts/geist-latin-wght-normal.woff2",
    "public/fonts/geist-mono-latin-wght-normal.woff2",
  ]);
  const webFaces = fontsCss.split("@font-face").slice(1).filter((face) => face.includes("url("));
  for (const face of webFaces) assert.match(face, /font-display: swap;/);
});

test("font files exist and fit the budget: ≤ 2 files / 100 KB, ≤ 3 files / 150 KB with code (PRD §6)", async () => {
  const size = async (path: string) => (await stat(`${root}${path}`)).size;
  const sans = (await size("public/fonts/geist-latin-wght-normal.woff2")) + (await size("public/fonts/geist-latin-wght-italic.woff2"));
  const mono = await size("public/fonts/geist-mono-latin-wght-normal.woff2");
  assert.ok(sans <= 100_000, `sans upright + italic is ${sans} bytes`);
  assert.ok(sans + mono <= 150_000, `with mono ${sans + mono} bytes`);
});

test("ships the font license", async () => {
  assert.match(await readFile(`${root}public/fonts/OFL.txt`, "utf8"), /SIL Open Font License, Version 1\.1/);
});

test("only fonts.css names font families; everything else reads the role variables (G2)", () => {
  const withoutFonts = siteCss.replace(fontsCss, "");
  assert.notEqual(withoutFonts, siteCss, "fonts.css should appear verbatim in site.css");
  for (const [, value] of withoutFonts.matchAll(/font-family:\s*([^;]+);/g)) {
    assert.match(value!, /^(var\(--font-[a-z]+\)|inherit)$/, `font-family: ${value}`);
  }
  assert.doesNotMatch(withoutFonts, /Geist/);
});

test("switching metadata to monospace is one line", () => {
  const lines = fontsCss.split("\n").filter((line) => line.trim().startsWith("--font-meta:"));
  assert.deepEqual(lines.map((l) => l.trim()), ["--font-meta: var(--font-sans);"]);
});

test("reads vertical metrics from a WOFF2 file", async () => {
  const metrics = readWoff2Metrics(await readFile(`${root}public/fonts/geist-latin-wght-normal.woff2`));
  assert.deepEqual(
    { unitsPerEm: metrics.unitsPerEm, ascender: metrics.ascender, descender: metrics.descender, lineGap: metrics.lineGap },
    { unitsPerEm: 1000, ascender: 1005, descender: -295, lineGap: 0 },
  );
});

test("rejects files that aren't WOFF2", () => {
  assert.throws(() => readWoff2Metrics(new Uint8Array(64)), /Not a WOFF2 file/);
});
