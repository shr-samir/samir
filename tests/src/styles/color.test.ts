import { test } from "node:test";
import assert from "node:assert/strict";
import { contrastRatio, inSrgbGamut, relativeLuminance, srgbChannelToLinear, toCss, toHex, toLinearSrgb, type Oklch } from "#src/styles/color.ts";

const WHITE: Oklch = { l: 1, c: 0, h: 0 };
const BLACK: Oklch = { l: 0, c: 0, h: 0 };

function close(actual: number, expected: number, tolerance: number, label: string): void {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: expected ${expected} ± ${tolerance}, got ${actual}`);
}

test("white and black convert to full and zero light", () => {
  const white = toLinearSrgb(WHITE);
  for (const channel of [white.r, white.g, white.b]) close(channel, 1, 1e-4, "white");
  const black = toLinearSrgb(BLACK);
  for (const channel of [black.r, black.g, black.b]) close(channel, 0, 1e-9, "black");
});

// Reference OKLCH values of the sRGB primaries, from Ottosson's OKLab definition.
test("pure sRGB red and blue convert back to their channels", () => {
  const red = toLinearSrgb({ l: 0.62796, c: 0.25768, h: 29.2339 });
  close(red.r, 1, 2e-3, "red.r");
  close(red.g, 0, 2e-3, "red.g");
  close(red.b, 0, 2e-3, "red.b");
  const blue = toLinearSrgb({ l: 0.45201, c: 0.31321, h: 264.052 });
  close(blue.r, 0, 2e-3, "blue.r");
  close(blue.g, 0, 2e-3, "blue.g");
  close(blue.b, 1, 2e-3, "blue.b");
});

test("black on white is 21:1, and order doesn't matter", () => {
  close(contrastRatio(BLACK, WHITE), 21, 1e-3, "black/white");
  close(contrastRatio(WHITE, BLACK), 21, 1e-3, "white/black");
  close(contrastRatio(WHITE, WHITE), 1, 1e-9, "white/white");
});

test("matches the WCAG reference: #767676 on white is 4.54:1", () => {
  // #767676 is the classic lightest gray that passes AA on white.
  const y = srgbChannelToLinear(0x76);
  close((1 + 0.05) / (y + 0.05), 4.54, 0.01, "#767676");
  // The same gray in OKLCH: for grays, OKLab lightness is the cube root of linear light,
  // ∛0.181164 = 0.56577. Through the full matrix conversion it must give the same ratio.
  const gray: Oklch = { l: 0.56577, c: 0, h: 0 };
  close(relativeLuminance(gray), y, 1e-3, "luminance");
  close(contrastRatio(gray, WHITE), 4.54, 0.02, "oklch gray");
});

test("detects colors outside the sRGB gamut", () => {
  assert.equal(inSrgbGamut(WHITE), true);
  assert.equal(inSrgbGamut({ l: 0.62796, c: 0.25768, h: 29.2339 }), true); // red, on the edge
  assert.equal(inSrgbGamut({ l: 0.9, c: 0.3, h: 250 }), false); // a very light, very saturated blue
  assert.equal(inSrgbGamut({ l: 0.5, c: 0.4, h: 145 }), false); // greener than any screen green
});

test("formats CSS with and without alpha", () => {
  assert.equal(toCss({ l: 0.5, c: 0.12345678, h: 250.123 }), "oklch(50% 0.1235 250.12)");
  assert.equal(toCss({ l: 0.2, c: 0, h: 0, alpha: 0.08 }), "oklch(20% 0 0 / 0.08)");
});

test("renders black, white and pure sRGB red as their known hex values", () => {
  assert.equal(toHex(BLACK), "#000000");
  assert.equal(toHex(WHITE), "#ffffff");
  assert.equal(toHex({ l: 0.62796, c: 0.25768, h: 29.2339 }), "#ff0000");
});

test("clamps an out-of-gamut color instead of throwing", () => {
  assert.doesNotThrow(() => toHex({ l: 0.9, c: 0.3, h: 250 }));
  assert.match(toHex({ l: 0.9, c: 0.3, h: 250 }), /^#[0-9a-f]{6}$/);
});

test("matches the #767676 WCAG reference gray", () => {
  const gray: Oklch = { l: 0.56577, c: 0, h: 0 };
  assert.equal(toHex(gray), "#767676");
});
