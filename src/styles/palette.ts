/**
 * Color palettes (PRD §7.3, F1a-D2). An accent is a hue and a chroma; every
 * semantic role has a fixed lightness per theme, so each accent × theme palette
 * is generated rather than hand-picked. Neutrals are tinted toward the accent
 * hue. The contrast check below proves every generated palette meets WCAG AA.
 */
import { contrastRatio, fitToGamut, inSrgbGamut, type Oklch } from "#src/styles/color.ts";

export type Theme = "light" | "dark";
export const THEMES: readonly Theme[] = ["light", "dark"];

export interface Accent {
  name: string;
  label: string;
  hue: number;
  /**
   * Target chroma of the main accent step in the light theme; other steps scale
   * from it. Each step is lowered to what an sRGB screen can show at its lightness.
   */
  chroma: number;
}

/** The accents a visitor can choose from (Q2); the first is the default. */
export const accents: readonly Accent[] = [
  { name: "violet", label: "Violet", hue: 295, chroma: 0.16 },
  { name: "blue", label: "Blue", hue: 255, chroma: 0.15 },
  { name: "teal", label: "Teal", hue: 195, chroma: 0.1 },
  { name: "rust", label: "Rust", hue: 45, chroma: 0.14 },
];

export const ROLES = [
  "text",
  "text-secondary",
  "bg",
  "bg-subtle",
  "surface-raised",
  "border-strong",
  "border-subtle",
  "accent-strongest",
  "accent-hover",
  "accent",
  "accent-light",
  "accent-lightest",
  "on-accent",
  "overlay-hover",
  "overlay-press",
  "success",
  "warning",
  "danger",
  "info",
  "focus-ring",
  "shadow",
] as const;

export type Role = (typeof ROLES)[number];
export type Palette = Record<Role, Oklch>;

/** Neutral tint strength (chroma) toward the accent hue. */
const NEUTRAL_TINT = { text: 0.015, surface: 0.006, border: 0.012 };

/** Status hues are fixed across accents, so meaning never depends on the accent. */
const STATUS_HUES = { success: 150, warning: 70, danger: 25, info: 245 };

/** Dark theme accents are slightly desaturated (PRD §7.3). */
const DARK_CHROMA = 0.85;

export function buildPalette(accent: Accent, theme: Theme): Palette {
  const { hue } = accent;
  const neutral = (l: number, c: number): Oklch => ({ l, c, h: hue });
  const tone = (l: number, share: number): Oklch =>
    fitToGamut({ l, c: accent.chroma * share * (theme === "dark" ? DARK_CHROMA : 1), h: hue });
  const status = (h: number, l: number, c: number): Oklch => fitToGamut({ l, c, h });

  if (theme === "light") {
    return {
      text: neutral(0.24, NEUTRAL_TINT.text),
      "text-secondary": neutral(0.46, NEUTRAL_TINT.text),
      bg: neutral(0.99, NEUTRAL_TINT.surface / 2),
      "bg-subtle": neutral(0.965, NEUTRAL_TINT.surface),
      "surface-raised": neutral(1, 0),
      "border-strong": neutral(0.58, NEUTRAL_TINT.border),
      "border-subtle": neutral(0.9, NEUTRAL_TINT.border / 2),
      "accent-strongest": tone(0.38, 0.9),
      "accent-hover": tone(0.44, 1),
      accent: tone(0.5, 1),
      "accent-light": tone(0.88, 0.3),
      "accent-lightest": tone(0.95, 0.12),
      "on-accent": neutral(0.99, NEUTRAL_TINT.surface / 2),
      "overlay-hover": { ...neutral(0.24, NEUTRAL_TINT.text), alpha: 0.08 },
      "overlay-press": { ...neutral(0.24, NEUTRAL_TINT.text), alpha: 0.16 },
      success: status(STATUS_HUES.success, 0.5, 0.13),
      warning: status(STATUS_HUES.warning, 0.52, 0.11),
      danger: status(STATUS_HUES.danger, 0.52, 0.18),
      info: status(STATUS_HUES.info, 0.5, 0.13),
      "focus-ring": tone(0.5, 1),
      shadow: { l: 0.2, c: NEUTRAL_TINT.text, h: hue, alpha: 0.1 },
    };
  }

  return {
    text: neutral(0.94, NEUTRAL_TINT.surface),
    "text-secondary": neutral(0.76, NEUTRAL_TINT.text),
    bg: neutral(0.18, NEUTRAL_TINT.surface),
    "bg-subtle": neutral(0.21, NEUTRAL_TINT.surface),
    "surface-raised": neutral(0.25, NEUTRAL_TINT.surface),
    "border-strong": neutral(0.58, NEUTRAL_TINT.border),
    "border-subtle": neutral(0.32, NEUTRAL_TINT.border / 2),
    "accent-strongest": tone(0.88, 0.6),
    "accent-hover": tone(0.82, 0.9),
    accent: tone(0.76, 1),
    "accent-light": tone(0.36, 0.5),
    "accent-lightest": tone(0.26, 0.3),
    "on-accent": neutral(0.18, NEUTRAL_TINT.surface),
    "overlay-hover": { ...neutral(0.94, NEUTRAL_TINT.surface), alpha: 0.08 },
    "overlay-press": { ...neutral(0.94, NEUTRAL_TINT.surface), alpha: 0.16 },
    success: status(STATUS_HUES.success, 0.76, 0.12),
    warning: status(STATUS_HUES.warning, 0.8, 0.12),
    danger: status(STATUS_HUES.danger, 0.72, 0.14),
    info: status(STATUS_HUES.info, 0.76, 0.1),
    "focus-ring": tone(0.76, 1),
    // Dark theme uses lighter surfaces instead of shadows (PRD §7.5).
    shadow: { l: 0, c: 0, h: 0, alpha: 0 },
  };
}

export interface Requirement {
  foreground: Role;
  backgrounds: readonly Role[];
  /** 4.5 for text (WCAG 1.4.3), 3 for borders, focus and other non-text (WCAG 1.4.11). */
  min: number;
  why: string;
}

const SURFACES: readonly Role[] = ["bg", "bg-subtle", "surface-raised"];

/** Every pair that must stay readable, in every accent × theme palette (PRD §7.3). */
export const REQUIREMENTS: readonly Requirement[] = [
  { foreground: "text", backgrounds: [...SURFACES, "accent-lightest"], min: 4.5, why: "body text" },
  { foreground: "text-secondary", backgrounds: SURFACES, min: 4.5, why: "secondary text" },
  { foreground: "accent", backgrounds: SURFACES, min: 4.5, why: "links" },
  { foreground: "accent-hover", backgrounds: SURFACES, min: 4.5, why: "hovered links" },
  { foreground: "accent-strongest", backgrounds: ["accent-lightest", "accent-light"], min: 4.5, why: "text on selected states" },
  { foreground: "on-accent", backgrounds: ["accent", "accent-hover"], min: 4.5, why: "text on primary buttons" },
  { foreground: "success", backgrounds: SURFACES, min: 4.5, why: "status text" },
  { foreground: "warning", backgrounds: SURFACES, min: 4.5, why: "status text" },
  { foreground: "danger", backgrounds: SURFACES, min: 4.5, why: "status text" },
  { foreground: "info", backgrounds: SURFACES, min: 4.5, why: "status text" },
  { foreground: "border-strong", backgrounds: SURFACES, min: 3, why: "control borders" },
  { foreground: "focus-ring", backgrounds: SURFACES, min: 3, why: "focus indicator" },
];

export interface Problem {
  accent: string;
  theme: Theme;
  message: string;
}

/** Gamut and contrast failures in one palette, as readable messages. */
export function checkPalette(palette: Palette): string[] {
  const messages: string[] = [];
  for (const role of ROLES) {
    const color = palette[role];
    if ((color.alpha ?? 1) > 0 && !inSrgbGamut(color)) messages.push(`${role} is outside the sRGB gamut`);
  }
  for (const { foreground, backgrounds, min, why } of REQUIREMENTS) {
    for (const background of backgrounds) {
      const ratio = contrastRatio(palette[foreground], palette[background]);
      if (ratio < min) messages.push(`${foreground} on ${background} is ${ratio.toFixed(2)}:1, needs ${min}:1 (${why})`);
    }
  }
  return messages;
}

/** Every failure across all accent × theme palettes; empty means all pass. */
export function checkPalettes(list: readonly Accent[] = accents): Problem[] {
  return list.flatMap((accent) =>
    THEMES.flatMap((theme) =>
      checkPalette(buildPalette(accent, theme)).map((message) => ({ accent: accent.name, theme, message })),
    ),
  );
}
