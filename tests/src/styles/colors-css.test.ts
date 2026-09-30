import { test } from "node:test";
import assert from "node:assert/strict";
import { colorsCss } from "#src/styles/colors-css.ts";
import { accents, ROLES } from "#src/styles/palette.ts";

const css = colorsCss();

test("follows the OS theme by default", () => {
  assert.match(css, /:root \{\s*color-scheme: light dark;\s*\}/);
});

test("the first accent is the default on :root", () => {
  assert.match(css, new RegExp(`:root,\\s*\\[data-accent="${accents[0]!.name}"\\] \\{`));
});

test("every accent block declares every role as light-dark(light, dark)", () => {
  for (const accent of accents) {
    const start = css.indexOf(`[data-accent="${accent.name}"] {`);
    assert.ok(start >= 0, `missing block for ${accent.name}`);
    const block = css.slice(start, css.indexOf("}", start));
    for (const role of ROLES) {
      assert.match(block, new RegExp(`--color-${role}: light-dark\\(oklch\\([^)]+\\), oklch\\([^)]+\\)\\);`), `${accent.name} ${role}`);
    }
  }
});

test("throws, naming palette, pair and ratio, when a palette fails (so the build fails)", () => {
  const failing = () => [{ accent: "teal", theme: "dark" as const, message: "text on bg is 3.10:1, needs 4.5:1 (body text)" }];
  assert.throws(() => colorsCss(failing), /teal \/ dark: text on bg is 3\.10:1, needs 4\.5:1 \(body text\)/);
});

test("lives in the tokens layer", () => {
  assert.match(css, /^\/\*[^*]*\*\/\n@layer tokens \{/);
});
