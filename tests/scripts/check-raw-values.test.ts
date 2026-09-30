import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkCss, checkRawValues, styleFiles } from "#scripts/check-raw-values.ts";

function one(css: string) {
  return checkCss(css, "t.css");
}

test("flags a raw length", () => {
  const [v] = one(".x { margin: 16px; }");
  assert.equal(v!.value, "16px");
  assert.match(v!.reason, /token/);
});

test("flags a raw hex color and a raw color function", () => {
  assert.equal(one(".x { color: #fff; }")[0]!.value, "#fff");
  assert.equal(one(".x { color: #ffffff80; }")[0]!.value, "#ffffff80");
  assert.equal(one(".x { color: rgb(0 0 0); }")[0]!.value, "rgb");
  assert.equal(one(".x { color: oklch(50% 0.1 250); }")[0]!.value, "oklch");
});

test("flags a raw duration", () => {
  assert.equal(one(".x { transition: 300ms; }")[0]!.value, "300ms");
  assert.equal(one(".x { animation-duration: 1.5s; }")[0]!.value, "1.5s");
});

test("allows var() tokens and the D2 allowlist (0, 100%, 1fr, 65ch)", () => {
  assert.deepEqual(one(".x { padding: var(--space-m); color: var(--color-text); }"), []);
  assert.deepEqual(one(".x { margin: 0; inset: 0%; }"), []);
  assert.deepEqual(one(".x { grid-template-columns: 1fr; }"), []);
  assert.deepEqual(one(".x { max-width: 65ch; }"), []);
});

test("exempts a custom property's own declared value, e.g. --space-2xl: 32px (it IS the token source)", () => {
  // A --* declaration defines a token; only its *consumers* (var(--space-2xl) elsewhere) must
  // avoid raw values. This also proves the digit in "--space-2xl" isn't mistaken for the value.
  assert.deepEqual(one(":root { --space-2xl: 32px; }"), []);
  assert.deepEqual(one(":root { --duration-fast: 120ms; }"), []);
  assert.deepEqual(one(":root { --color-accent: oklch(50% 0.15 255); }"), []);
});

test("still flags a raw value used as an ordinary property's value, even when a --custom-property with digits appears earlier on the line", () => {
  const violations = one(":root { --space-2xl: 5rem; margin: 40px; }");
  assert.equal(violations.length, 1);
  assert.equal(violations[0]!.value, "40px");
});

test("allows a hairline 1px border but flags 1px elsewhere", () => {
  assert.deepEqual(one(".x { border: 1px solid var(--color-border-strong); }"), []);
  assert.deepEqual(one(".x { border-block-end: 1px solid var(--color-border-subtle); }"), []);
  assert.equal(one(".x { margin: 1px; }")[0]!.value, "1px");
  assert.equal(one(".x { border-width: 2px; }")[0]!.value, "2px");
});

test("allows breakpoint widths only inside an @media/@container condition", () => {
  assert.deepEqual(one("@media (min-width: 768px) { .x { color: var(--color-text); } }"), []);
  assert.deepEqual(one("@container (min-width: 1024px) { .x { color: var(--color-text); } }"), []);
  assert.equal(one(".x { width: 768px; }")[0]!.value, "768px");
});

test("does not exempt a non-breakpoint width even inside an @media condition", () => {
  // 700px is not one of §7.2's four breakpoints, so it must still be flagged.
  const violations = one("@media (min-width: 700px) { .x { color: var(--color-text); } }");
  assert.equal(violations.length, 1);
  assert.equal(violations[0]!.value, "700px");
});

test("only exempts a breakpoint width inside the condition itself, not inside the block's own declarations", () => {
  // The 768px after the "{" is a real declaration value on .x, not part of the @media condition.
  const violations = one("@media (min-width: 640px) { .x { width: 768px; } }");
  assert.equal(violations.length, 1);
  assert.equal(violations[0]!.value, "768px");
});

test("ignores comments, string literals and url() paths", () => {
  assert.deepEqual(one("/* 16px note */ .x { color: var(--color-text); }"), []);
  assert.deepEqual(one('.x::before { content: "1px"; }'), []);
  assert.deepEqual(one(".x { background: url(/fonts/x-100px.woff2); }"), []);
});

test("color-mix() must mix tokens, not raw colors", () => {
  assert.deepEqual(one(".x { color: color-mix(in oklch, var(--color-text) 50%, var(--color-bg)); }"), []);
  const violations = one(".x { color: color-mix(in oklch, red 50%, blue); }");
  assert.equal(violations.length, 1);
  assert.match(violations[0]!.reason, /color-mix/);
});

test("reports the correct line number in a multi-line file", () => {
  const css = ".a {\n  color: var(--color-text);\n}\n\n.b {\n  margin: 8px;\n}\n";
  const [v] = one(css);
  assert.equal(v!.line, 6);
});

test("handles the real generated shape: :root, [data-accent] multi-selector with custom properties", () => {
  const css = ':root,\n  [data-accent="violet"] {\n    --color-text: oklch(24% 0.015 295);\n  }\n';
  assert.deepEqual(one(css), []);
});

test("styleFiles excludes fonts.css (X14) but includes other .css files", async () => {
  const dir = await mkdtemp(join(tmpdir(), "styles-"));
  try {
    await writeFile(join(dir, "base.css"), "");
    await writeFile(join(dir, "fonts.css"), "");
    await writeFile(join(dir, "tokens-css.ts"), ""); // generated source, not hand-written CSS
    const files = (await styleFiles(dir)).map((f) => f.split(/[\\/]/).pop());
    assert.deepEqual(files.sort(), ["base.css"]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("checkRawValues scans every hand-written CSS file in a directory and reports its name", async () => {
  const dir = await mkdtemp(join(tmpdir(), "styles-"));
  try {
    await writeFile(join(dir, "base.css"), ".x { color: #fff; }");
    await writeFile(join(dir, "fonts.css"), "@font-face { size-adjust: 102.19%; }"); // must be ignored
    const violations = await checkRawValues(dir);
    assert.equal(violations.length, 1);
    assert.equal(violations[0]!.file, "base.css");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("the real src/styles CSS files pass the check", async () => {
  const stylesDir = join(import.meta.dirname, "..", "..", "src", "styles");
  assert.deepEqual(await checkRawValues(stylesDir), []);
});
