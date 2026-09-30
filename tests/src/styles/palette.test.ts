import { test } from "node:test";
import assert from "node:assert/strict";
import { accents, buildPalette, checkPalette, checkPalettes, REQUIREMENTS, ROLES, THEMES } from "#src/styles/palette.ts";
import { contrastRatio, fitToGamut, inSrgbGamut, maxChroma } from "#src/styles/color.ts";

test("every accent × theme palette passes contrast and gamut (O14, O15)", () => {
  assert.deepEqual(checkPalettes(), []);
});

test("offers 3 or 4 accents with unique names", () => {
  assert.ok(accents.length >= 3 && accents.length <= 4);
  assert.equal(new Set(accents.map((a) => a.name)).size, accents.length);
});

test("every palette defines every role", () => {
  for (const accent of accents) {
    for (const theme of THEMES) {
      const palette = buildPalette(accent, theme);
      for (const role of ROLES) assert.ok(palette[role], `${accent.name}/${theme} missing ${role}`);
    }
  }
});

test("a failing pair is reported with the pair, the ratio and the minimum", () => {
  const palette = { ...buildPalette(accents[0]!, "light") };
  palette["text-secondary"] = { ...palette.bg, l: palette.bg.l - 0.05 }; // nearly invisible
  const messages = checkPalette(palette);
  assert.ok(
    messages.some((m) => /^text-secondary on bg is \d\.\d\d:1, needs 4\.5:1 \(secondary text\)$/.test(m)),
    messages.join("\n"),
  );
});

test("an out-of-gamut color is reported", () => {
  const palette = { ...buildPalette(accents[0]!, "light") };
  palette.accent = { l: 0.9, c: 0.3, h: 250 };
  assert.ok(checkPalette(palette).includes("accent is outside the sRGB gamut"));
});

test("fitToGamut lowers chroma only as far as needed", () => {
  const tooColorful = { l: 0.5, c: 0.3, h: 195 };
  assert.equal(inSrgbGamut(tooColorful), false);
  const fitted = fitToGamut(tooColorful);
  assert.equal(inSrgbGamut(fitted), true);
  assert.ok(fitted.c > maxChroma(0.5, 195) * 0.97, "kept most of the available chroma");
  const mild = { l: 0.5, c: 0.05, h: 195 };
  assert.deepEqual(fitToGamut(mild), mild);
});

test("dark theme is really dark, light theme really light", () => {
  for (const accent of accents) {
    assert.ok(buildPalette(accent, "light").bg.l > 0.9);
    assert.ok(buildPalette(accent, "dark").bg.l < 0.3);
  }
});

test("status colors don't change with the accent", () => {
  for (const theme of THEMES) {
    const [first, ...rest] = accents.map((a) => buildPalette(a, theme));
    for (const palette of rest) {
      for (const role of ["success", "warning", "danger", "info"] as const) assert.deepEqual(palette[role], first![role]);
    }
  }
});

test("requirements cover the pairs PRD §7.3 names", () => {
  const covered = new Set(REQUIREMENTS.flatMap((r) => r.backgrounds.map((b) => `${r.foreground}/${b}`)));
  for (const pair of ["text/bg", "on-accent/accent", "accent/bg", "border-strong/bg", "focus-ring/bg"]) {
    assert.ok(covered.has(pair), `missing ${pair}`);
  }
  // Sanity: the check really measures, not just passes.
  const palette = buildPalette(accents[0]!, "light");
  assert.ok(contrastRatio(palette.text, palette.bg) > 10);
});
