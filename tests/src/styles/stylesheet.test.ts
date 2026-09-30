import { test } from "node:test";
import assert from "node:assert/strict";
import stylesheet, { LAYERS } from "#src/styles/stylesheet.ts";

const css = await stylesheet();

/** Strips comments and returns the source with nested blocks collapsed, leaving top-level statements. */
function topLevelStatements(source: string): string[] {
  const text = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const statements: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of text) {
    if (char === "{") {
      if (depth === 0) statements.push(current.trim());
      depth++;
    } else if (char === "}") {
      depth--;
      if (depth === 0) current = "";
    } else if (depth === 0) {
      current += char;
      if (char === ";") {
        statements.push(current.trim());
        current = "";
      }
    }
  }
  assert.equal(depth, 0, "unbalanced braces");
  return statements.filter(Boolean);
}

test("declares the layer order first", () => {
  assert.ok(css.startsWith(`@layer ${LAYERS.join(", ")};`));
});

test("every top-level block is a declared layer, so no CSS escapes the layers", () => {
  const [order, ...blocks] = topLevelStatements(css);
  assert.equal(order, `@layer ${LAYERS.join(", ")};`);
  assert.ok(blocks.length > 0);
  for (const block of blocks) {
    const match = /^@layer ([\w-]+)$/.exec(block);
    assert.ok(match, `unlayered CSS: "${block}"`);
    assert.ok((LAYERS as readonly string[]).includes(match[1]!), `unknown layer "${match[1]}"`);
  }
});

test("includes tokens, font roles, base and demo styles", () => {
  for (const marker of ["--text-base:", "--font-sans:", "body {", ".demo-text-4xl"]) {
    assert.ok(css.includes(marker), `missing ${marker}`);
  }
});

test("base typography uses only tokens for the rules that matter", () => {
  assert.match(css, /body \{[^}]*line-height: var\(--leading-base\)/);
  assert.match(css, /h1 \{[^}]*font-size: var\(--text-3xl\)/);
  assert.match(css, /\.prose \{[^}]*max-width: var\(--measure-prose\)/);
  assert.match(css, /:focus-visible \{[^}]*outline: var\(--focus-width\)/);
});
