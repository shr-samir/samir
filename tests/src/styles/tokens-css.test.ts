import { test } from "node:test";
import assert from "node:assert/strict";
import { tokensCss } from "#src/styles/tokens-css.ts";
import { durations, measures, radii, shadows, spacing, typeScale, weights, widths } from "#src/styles/tokens.ts";
import { fluid, renderedPx } from "#src/styles/fluid.ts";

const css = tokensCss();

function declaredNames(source: string): string[] {
  return [...source.matchAll(/^\s*(--[\w-]+):/gm)].map((match) => match[1] ?? "");
}

test("declares every token from the data", () => {
  const expected = [
    ...typeScale.flatMap((t) => [`--text-${t.name}`, `--leading-${t.name}`, `--tracking-${t.name}`]),
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
  const declared = new Set(declaredNames(css));
  for (const name of expected) assert.ok(declared.has(name), `missing ${name}`);
});

test("declares each token once in :root (outside the reduced-motion override)", () => {
  const root = css.slice(0, css.indexOf("@media"));
  const names = declaredNames(root);
  assert.equal(new Set(names).size, names.length);
});

test("wraps everything in the tokens layer", () => {
  assert.match(css, /^\/\*[^*]*\*\/\n@layer tokens \{/);
});

test("uses fluid clamps for sizes that change, plain rem for fixed ones", () => {
  assert.match(css, /--text-base: 1rem;/);
  assert.match(css, /--text-4xl: clamp\(2\.5rem, 2\.1875rem \+ 1\.5625vw, 3\.4375rem\);/);
  assert.match(css, /--space-m: 1\.5rem;/);
});

test("sets every duration to 0s under prefers-reduced-motion", () => {
  const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
  for (const d of durations) assert.match(reduced, new RegExp(`--duration-${d.name}: 0s;`));
});

test("type scale grows, and line height never grows with size", () => {
  for (let i = 1; i < typeScale.length; i++) {
    const [smaller, larger] = [typeScale[i - 1]!, typeScale[i]!];
    assert.ok(larger.desktop >= smaller.desktop, `${larger.name} is smaller than ${smaller.name}`);
    assert.ok(larger.mobile >= smaller.mobile, `${larger.name} is smaller than ${smaller.name} on mobile`);
  }
  const headings = typeScale.filter((t) => t.desktop > 18);
  for (let i = 1; i < headings.length; i++) {
    assert.ok(headings[i]!.leading <= headings[i - 1]!.leading, `${headings[i]!.name} has taller leading`);
  }
});

test("body sizes keep line height of at least 1.5", () => {
  for (const name of ["sm", "base", "prose"]) {
    assert.ok(typeScale.find((t) => t.name === name)!.leading >= 1.5, name);
  }
});

/**
 * WCAG 1.4.4: text must reach 200% of its size through zoom. Browsers zoom up
 * to 500%. At 500% zoom the CSS viewport is tiny, so a fluid size sits at its
 * minimum and renders at 5 × min. The largest unzoomed size is max, so 200% is
 * always reachable when 5 × min ≥ 2 × max, i.e. max ≤ 2.5 × min.
 */
test("every size can reach 200% through browser zoom (WCAG 1.4.4)", () => {
  for (const t of typeScale) {
    const size = fluid(t.mobile, t.desktop);
    for (let windowPx = 320; windowPx <= 2560; windowPx += 80) {
      const baseline = renderedPx(size, windowPx, 1);
      assert.ok(renderedPx(size, windowPx, 5) >= 2 * baseline, `text-${t.name} at ${windowPx}px`);
    }
  }
});
