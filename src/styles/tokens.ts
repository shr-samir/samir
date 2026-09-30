/**
 * Design tokens (PRD §7, F1a-D1): the single source of every visual value.
 * The build turns this data into CSS custom properties (tokens-css.ts), and the
 * demo page at /design/ renders it, so neither can drift from the other.
 *
 * Colors arrive in L3 and font families in L4.
 */

export interface TypeToken {
  name: string;
  /** Size at the narrowest viewport (px). */
  mobile: number;
  /** Size at 1280px and wider (px). */
  desktop: number;
  /** Unitless line height; shrinks as size grows. */
  leading: number;
  /** Letter spacing in em; negative tightens large sizes. */
  tracking: number;
  use: string;
}

/**
 * PRD §7.1: heading sizes step by 1.2 on mobile (from 16px) and 1.25 on
 * desktop (from 18px, the prose size), rounded to whole pixels.
 */
export const typeScale: readonly TypeToken[] = [
  { name: "sm", mobile: 14, desktop: 14, leading: 1.5, tracking: 0, use: "Captions, metadata only" },
  { name: "base", mobile: 16, desktop: 16, leading: 1.5, tracking: 0, use: "UI text, cards, nav" },
  { name: "prose", mobile: 18, desktop: 18, leading: 1.6, tracking: 0, use: "Long reading: posts, project write-ups" },
  { name: "lg", mobile: 19, desktop: 22, leading: 1.4, tracking: 0, use: "Lead paragraphs, h4" },
  { name: "xl", mobile: 23, desktop: 28, leading: 1.3, tracking: -0.01, use: "h3, card titles in features" },
  { name: "2xl", mobile: 28, desktop: 35, leading: 1.2, tracking: -0.01, use: "h2, section titles" },
  { name: "3xl", mobile: 33, desktop: 44, leading: 1.2, tracking: -0.015, use: "h1, page titles" },
  { name: "4xl", mobile: 40, desktop: 55, leading: 1.1, tracking: -0.02, use: "Hero only" },
];

export interface WeightToken {
  name: string;
  value: number;
}

/** Regular and bold only, site-wide (PRD §7.1). */
export const weights: readonly WeightToken[] = [
  { name: "regular", value: 400 },
  { name: "bold", value: 700 },
];

export interface SizeToken {
  name: string;
  px: number;
  use: string;
}

/** Multiples of 8; 4 only for tight spots (PRD §7.2). */
export const spacing: readonly SizeToken[] = [
  { name: "2xs", px: 4, use: "Tight UI only, e.g. icon to label" },
  { name: "xs", px: 8, use: "Label to value" },
  { name: "s", px: 16, use: "Items within a group" },
  { name: "m", px: 24, use: "Items within a group" },
  { name: "l", px: 32, use: "Blocks within a section" },
  { name: "xl", px: 48, use: "Blocks within a section; sections on mobile" },
  { name: "2xl", px: 80, use: "Section to section" },
];

/** Container widths (PRD §7.2). */
export const widths: readonly SizeToken[] = [
  { name: "content", px: 680, use: "Reading column" },
  { name: "wide", px: 1120, use: "Grids" },
];

export interface MeasureToken {
  name: string;
  value: string;
  use: string;
}

/** Line length caps, in characters of the current font (PRD §7.1). */
export const measures: readonly MeasureToken[] = [{ name: "prose", value: "65ch", use: "Long-form text containers" }];

/** Corner radii (PRD §7.5). */
export const radii: readonly SizeToken[] = [
  { name: "sm", px: 4, use: "Tags, small controls" },
  { name: "md", px: 8, use: "Buttons, inputs" },
  { name: "lg", px: 16, use: "Cards, tiles" },
  { name: "full", px: 9999, use: "Pills, avatars" },
];

export interface ShadowToken {
  name: string;
  value: string;
  use: string;
}

/**
 * Two elevation levels: soft two-layer shadows, light from above (PRD §7.5).
 * The shadow color becomes theme-aware in L3; dark theme uses lighter surfaces instead.
 */
export const shadows: readonly ShadowToken[] = [
  {
    name: "1",
    value: "0 1px 2px oklch(0% 0 0 / 0.06), 0 1px 3px oklch(0% 0 0 / 0.1)",
    use: "Raised: cards, tiles",
  },
  {
    name: "2",
    value: "0 4px 8px oklch(0% 0 0 / 0.06), 0 12px 24px oklch(0% 0 0 / 0.1)",
    use: "Overlay: menus, popovers",
  },
];

export interface DurationToken {
  name: string;
  ms: number;
  use: string;
}

/** Motion (PRD §7.5). Every duration becomes 0s under prefers-reduced-motion. */
export const durations: readonly DurationToken[] = [
  { name: "fast", ms: 120, use: "Hover and press feedback" },
  { name: "base", ms: 200, use: "Small movements, fades" },
  { name: "slow", ms: 320, use: "Larger movements, menus" },
];

/** The one easing curve: quick start, gentle stop. */
export const ease = "cubic-bezier(0.2, 0, 0, 1)";

/** Focus indicator geometry; its color arrives with the palette in L3. */
export const focus = { widthPx: 2, offsetPx: 2 } as const;
