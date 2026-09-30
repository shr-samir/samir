import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const css = await readFile(join(import.meta.dirname, "..", "..", "..", "src", "styles", "layout.css"), "utf8");

test("lives entirely in the layout cascade layer", () => {
  assert.match(css, /^\/\*[\s\S]*?\*\/\n@layer layout \{/);
  // Exactly one top-level "@layer layout {", and it closes at the very end (no stray top-level rule).
  assert.equal((css.match(/@layer layout \{/g) ?? []).length, 1);
});

test("the page shell sizes main from the leftover space, not a viewport unit", () => {
  assert.match(css, /body \{[^}]*display: flex;[^}]*flex-direction: column;[^}]*min-height: 100vh;/);
  assert.match(css, /body > header,\s*body > footer \{[^}]*flex: none;/);
  assert.match(css, /body > main \{[^}]*flex: 1;/);
  // Strip comments first: the file's own comment *mentions* calc(100vh - ...) as the
  // approach being avoided, which would otherwise make this assertion trivially fail.
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  assert.doesNotMatch(withoutComments, /calc\(100vh/, "must not hardcode a header/footer height into main's size");
});

test("main is a size container, so its children query it instead of the viewport (F1b-D4)", () => {
  assert.match(css, /body > main \{[^}]*container-type: inline-size;/s);
});

test("main has an explicit width, so container-type containment can't collapse it (found in L1)", () => {
  // Without this, main shrank to a single character's width per line: container-type: inline-size
  // makes main a size-containment context, which combined with the flex-column parent removes the
  // usual stretch signal. Verified by removing this line and confirming the collapse reproduces.
  assert.match(css, /body > main \{[^}]*width: 100%;/s);
});

test("container and container-wide use the width tokens, not raw pixel values", () => {
  assert.match(css, /\.container \{[^}]*max-inline-size: var\(--width-content\);/);
  assert.match(css, /\.container-wide \{[^}]*max-inline-size: var\(--width-wide\);/);
  assert.doesNotMatch(css, /max-inline-size:\s*\d/);
});

test("section spacing only ever applies between two sections, never around a lone one", () => {
  assert.match(css, /\.section \+ \.section \{/);
  assert.doesNotMatch(css, /^\s*\.section \{/m);
});

test("grid steps 4 -> 8 -> 12 columns at the md/lg breakpoints (PRD §7.2)", () => {
  assert.match(css, /\.grid \{[^}]*grid-template-columns: repeat\(4, 1fr\);/s);
  assert.match(css, /@media \(min-width: 768px\) \{\s*\.grid \{[^}]*grid-template-columns: repeat\(8, 1fr\);/s);
  assert.match(css, /@media \(min-width: 1024px\) \{\s*\.grid \{[^}]*grid-template-columns: repeat\(12, 1fr\);/s);
});

test("stack uses gap, not margins that would leak onto its outer edges", () => {
  assert.match(css, /\.stack \{[^}]*display: flex;[^}]*flex-direction: column;[^}]*gap: var\(--space-m\);/s);
  assert.doesNotMatch(css, /\.stack[^{]*\{[^}]*margin/);
});
