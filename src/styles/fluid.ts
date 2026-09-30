/**
 * Fluid sizes (F1a-D4): a value that grows linearly from `min` px at the
 * narrowest viewport to `max` px at the widest, as a CSS `clamp()`.
 *
 * The preferred value mixes rem and vw. The rem part keeps the size tied to the
 * user's font-size setting and browser zoom; a pure-vw size would ignore both.
 */

/** Viewport widths (CSS px) where fluid values reach their min and max. */
export const FLUID_VIEWPORT = { min: 320, max: 1280 } as const;

/** Browser default root font size; rem values are written relative to it. */
export const ROOT_PX = 16;

export interface Fluid {
  minPx: number;
  maxPx: number;
  /** The `clamp()` expression, or a plain rem value when min equals max. */
  css: string;
}

export function fluid(minPx: number, maxPx: number, viewport = FLUID_VIEWPORT): Fluid {
  if (minPx > maxPx) throw new Error(`Fluid min (${minPx}px) is larger than max (${maxPx}px)`);
  if (minPx === maxPx) return { minPx, maxPx, css: rem(minPx) };

  // size(v) = intercept + slope × v, passing through (viewport.min, minPx) and (viewport.max, maxPx).
  const slope = (maxPx - minPx) / (viewport.max - viewport.min);
  const intercept = minPx - slope * viewport.min;
  const css = `clamp(${rem(minPx)}, ${rem(intercept)} + ${round(slope * 100)}vw, ${rem(maxPx)})`;
  return { minPx, maxPx, css };
}

/**
 * The rendered size in device pixels of a fluid value, at a given window width
 * (device px) and browser zoom. Zooming makes each CSS px `zoom` device px wide,
 * so the viewport in CSS px shrinks to `windowPx / zoom`.
 */
export function renderedPx(value: Fluid, windowPx: number, zoom = 1, viewport = FLUID_VIEWPORT): number {
  const cssViewport = windowPx / zoom;
  const t = (cssViewport - viewport.min) / (viewport.max - viewport.min);
  const cssPx = Math.min(value.maxPx, Math.max(value.minPx, value.minPx + t * (value.maxPx - value.minPx)));
  return cssPx * zoom;
}

export function rem(px: number): string {
  return `${round(px / ROOT_PX)}rem`;
}

function round(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}
