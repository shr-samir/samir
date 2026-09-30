/**
 * Color math for the contrast and gamut checks (F1a-D7). Colors are authored
 * in OKLCH; WCAG contrast is defined on sRGB luminance, so each color is
 * converted OKLCH → OKLab → linear sRGB (Björn Ottosson's published matrices).
 */

export interface Oklch {
  /** Lightness, 0 (black) to 1 (white). */
  l: number;
  /** Chroma (colorfulness), 0 for grays; screen-displayable colors stay below about 0.37. */
  c: number;
  /** Hue angle in degrees. */
  h: number;
  /** Opacity, 0 to 1. Defaults to 1. */
  alpha?: number;
}

export interface LinearRgb {
  r: number;
  g: number;
  b: number;
}

export function toLinearSrgb({ l, c, h }: Oklch): LinearRgb {
  const radians = (h * Math.PI) / 180;
  const a = c * Math.cos(radians);
  const b = c * Math.sin(radians);

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;
  const [lc, mc, sc] = [l_ ** 3, m_ ** 3, s_ ** 3];

  return {
    r: 4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc,
    g: -1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc,
    b: -0.0041960863 * lc - 0.7034186147 * mc + 1.707614701 * sc,
  };
}

/** Tolerance for rounding in the conversion; far below one 8-bit sRGB step (1/255). */
const GAMUT_EPSILON = 1e-4;

/** Whether an sRGB screen can show the color exactly (no channel below 0 or above 1). */
export function inSrgbGamut(color: Oklch): boolean {
  const { r, g, b } = toLinearSrgb(color);
  return [r, g, b].every((channel) => channel >= -GAMUT_EPSILON && channel <= 1 + GAMUT_EPSILON);
}

/**
 * The most colorful version of a lightness and hue that an sRGB screen can
 * show. How much chroma fits depends heavily on both: dark teals and blues
 * run out quickly, light yellows too.
 */
export function maxChroma(l: number, h: number): number {
  let [low, high] = [0, 0.4];
  for (let i = 0; i < 30; i++) {
    const mid = (low + high) / 2;
    if (inSrgbGamut({ l, c: mid, h })) low = mid;
    else high = mid;
  }
  return low;
}

/** The color with its chroma lowered, if needed, to fit the sRGB gamut (with a small margin). */
export function fitToGamut(color: Oklch): Oklch {
  return { ...color, c: Math.min(color.c, maxChroma(color.l, color.h) * 0.98) };
}

/** WCAG 2 relative luminance: how much light the color emits, 0 to 1. */
export function relativeLuminance(color: Oklch): number {
  const { r, g, b } = toLinearSrgb(color);
  const clamp = (channel: number) => Math.min(1, Math.max(0, channel));
  return 0.2126 * clamp(r) + 0.7152 * clamp(g) + 0.0722 * clamp(b);
}

/** WCAG 2 contrast ratio, from 1 (same) to 21 (black on white). Order doesn't matter. */
export function contrastRatio(a: Oklch, b: Oklch): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [number, number];
  return (lighter + 0.05) / (darker + 0.05);
}

/** Linear-light value of one 8-bit sRGB channel (for tests against hex references). */
export function srgbChannelToLinear(value255: number): number {
  const v = value255 / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

export function toCss({ l, c, h, alpha = 1 }: Oklch): string {
  const round = (n: number, digits: number) => Number(n.toFixed(digits));
  const base = `${round(l * 100, 2)}% ${round(c, 4)} ${round(h, 2)}`;
  return alpha === 1 ? `oklch(${base})` : `oklch(${base} / ${round(alpha, 3)})`;
}
