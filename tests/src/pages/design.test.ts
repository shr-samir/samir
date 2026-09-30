import { test } from "node:test";
import assert from "node:assert/strict";
import pages from "#src/pages/design.ts";
import { demoCss } from "#src/styles/demo-css.ts";
import { durations, measures, radii, shadows, spacing, typeScale, weights, widths } from "#src/styles/tokens.ts";

const [page] = pages();
const body = page!.body.value;

test("is published at /design/", () => {
  assert.equal(page!.path, "/design/");
});

test("shows every token from the data", () => {
  const names = [
    ...typeScale.map((t) => `--text-${t.name}`),
    ...weights.map((w) => `--weight-${w.name}`),
    ...spacing.map((s) => `--space-${s.name}`),
    ...widths.map((w) => `--width-${w.name}`),
    ...measures.map((m) => `--measure-${m.name}`),
    ...radii.map((r) => `--radius-${r.name}`),
    ...shadows.map((s) => `--shadow-${s.name}`),
    ...durations.map((d) => `--duration-${d.name}`),
    "--ease",
    "--focus-width",
    "--focus-offset",
  ];
  for (const name of names) assert.ok(body.includes(`<code>${name}</code>`), `missing ${name}`);
});

test("every demo class used on the page is defined in the demo CSS", () => {
  const css = demoCss();
  const used = new Set([...body.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1]!.split(" ")));
  for (const name of used) {
    if (name === "prose") continue; // base style
    assert.ok(css.includes(`.${name} `), `.${name} has no rule`);
  }
});

test("has one h1, headings in order, and no inline styles", () => {
  assert.equal(body.match(/<h1[\s>]/g)?.length, 1);
  const levels = [...body.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
  for (let i = 1; i < levels.length; i++) {
    assert.ok(levels[i]! <= levels[i - 1]! + 1, `heading level jumps from h${levels[i - 1]} to h${levels[i]}`);
  }
  assert.doesNotMatch(body, /\sstyle="/);
});

test("links the stylesheet and sets the language", () => {
  assert.match(body, /<html lang="en">/);
  assert.match(body, /<link rel="stylesheet" href="\/site\.css">/);
});
