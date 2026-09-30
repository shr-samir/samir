/**
 * Raw-value check (D2, R1): fails if any hand-written CSS uses a raw length,
 * color or duration instead of a token (`var(--…)`). Enforces "every visual
 * value comes from a token" without a linter dependency (D0), since the CSS
 * here is small and the rules are narrow.
 *
 * Scope: only hand-written `.css` files under `src/styles/` (F1a-D20).
 * Generated CSS (tokens-css.ts, colors-css.ts, demo-css.ts, stylesheet.ts) IS
 * the token source or reads tokens exclusively by construction; checking its
 * *output* would mean re-allowing every token value we just generated.
 *
 * Run with `node scripts/check-raw-values.ts` (also wired into `pnpm build`).
 */
import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";

export interface Violation {
  file: string;
  line: number;
  /** The offending text, e.g. "16px" or "#fff". */
  value: string;
  reason: string;
}

/**
 * Values that are not design decisions and never need a token (D2). Matched
 * as a whole declaration value or standalone number, never as a substring of
 * something else (so this doesn't allow "10%" or "100px").
 */
const ALLOWED_VALUES = new Set(["0", "0%", "100%", "100vh", "1fr", "65ch"]);

/** Property names (case-insensitive) allowed exactly one raw hairline border width. */
const HAIRLINE_PROPERTIES = /^(border|border-(top|right|bottom|left|block|inline)(-(start|end))?)(-width)?$/i;

/** The one place a raw breakpoint may appear (§7.2): a media/container width condition. */
const BREAKPOINTS = new Set([640, 768, 1024, 1280]);

// A number with a CSS unit that represents a design value if unguarded.
const RAW_LENGTH = /(-?\d*\.?\d+)(px|em|rem|vw|vh|ch|vmin|vmax)\b/g;
const RAW_DURATION = /(-?\d*\.?\d+)(ms|s)\b(?!\s*\()/g; // exclude steps(1s) etc. is unnecessary here, kept simple
const RAW_HEX_COLOR = /#[0-9a-fA-F]{3,8}\b/g;
const RAW_FUNCTIONAL_COLOR = /\b(rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|color)\(/g;

/** Strips comment blocks and string literals, then reports remaining decls with their original line numbers. */
function stripCommentsAndStrings(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " ")).replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, (m) => " ".repeat(m.length));
}

/** Strips `url(...)` contents (font/image paths, not design values), preserving length for line numbers. */
function stripUrls(css: string): string {
  return css.replace(/url\([^)]*\)/gi, (m) => "url(" + " ".repeat(m.length - 5) + ")");
}

function lineAt(css: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i++) if (css[i] === "\n") line++;
  return line;
}

/** True if `index` (into `css`) falls inside an @media/@container prelude, e.g. `@media (min-width: 768px)`. */
function isInsideConditionPrelude(css: string, index: number): boolean {
  const before = css.slice(0, index);
  const atStart = Math.max(before.lastIndexOf("@media"), before.lastIndexOf("@container"));
  if (atStart === -1) return false;
  const braceBefore = before.lastIndexOf("{");
  if (braceBefore > atStart) return false; // a later block opened since the last @media/@container
  // We're between an @media/@container and its opening "{": still in the condition.
  return css.slice(atStart, index).indexOf("{") === -1;
}

/** Start of the current declaration: just after the last ";" or "{" before `index`. */
function declarationStart(css: string, index: number): number {
  return Math.max(css.lastIndexOf(";", index), css.lastIndexOf("{", index)) + 1;
}

/** The declaration's own colon (property : value), not a colon inside a selector like `:root` or `:is(...)`. */
function declarationColon(css: string, start: number): number {
  return css.indexOf(":", start);
}

/** True if `index` sits inside the declaration for a custom property (`--name: ...`), whose value is exempt. */
function isCustomPropertyDeclaration(css: string, index: number): boolean {
  const start = declarationStart(css, index);
  const colon = declarationColon(css, start);
  if (colon === -1 || colon > index) return false;
  return /^\s*--[\w-]+\s*$/.test(css.slice(start, colon));
}

/** True if `index` sits inside a property name (before its colon) rather than a value. */
function isInPropertyName(css: string, index: number): boolean {
  const start = declarationStart(css, index);
  const colon = declarationColon(css, start);
  return colon !== -1 && index < colon;
}

export function checkCss(css: string, file: string): Violation[] {
  const cleaned = stripUrls(stripCommentsAndStrings(css));
  const violations: Violation[] = [];

  const report = (index: number, matchText: string, reason: string) => {
    if (isCustomPropertyDeclaration(cleaned, index) || isInPropertyName(cleaned, index)) return;
    violations.push({ file, line: lineAt(css, index), value: matchText, reason });
  };

  for (const match of cleaned.matchAll(RAW_LENGTH)) {
    const [full, numberText] = match;
    const index = match.index!;
    if (ALLOWED_VALUES.has(full)) continue;
    if (full === "1px" && HAIRLINE_PROPERTIES.test(propertyOf(cleaned, index))) continue;
    if (isInsideConditionPrelude(cleaned, index) && full.endsWith("px") && BREAKPOINTS.has(Number(numberText))) continue;
    report(index, full, "raw length; use a var(--space-*), var(--text-*) or var(--radius-*) token");
  }

  for (const match of cleaned.matchAll(RAW_DURATION)) {
    const full = match[0];
    if (ALLOWED_VALUES.has(full)) continue;
    report(match.index!, full, "raw duration; use a var(--duration-*) token");
  }

  for (const match of cleaned.matchAll(RAW_HEX_COLOR)) {
    report(match.index!, match[0], "raw hex color; use a var(--color-*) token");
  }

  for (const match of cleaned.matchAll(RAW_FUNCTIONAL_COLOR)) {
    if (match[1]!.toLowerCase() === "color" && /^color\(\s*from\s/i.test(cleaned.slice(match.index!))) continue; // color-mix() is separate below
    report(match.index!, match[0].slice(0, -1), "raw color function; use a var(--color-*) token");
  }

  // color-mix() is allowed only when mixing var(--color-*) (an overlay tint), not raw colors.
  for (const match of cleaned.matchAll(/color-mix\(([^)]*)\)/g)) {
    if (!/var\(--color-/.test(match[1]!)) {
      report(match.index!, "color-mix(...)", "color-mix() must mix a var(--color-*) token, not a raw color");
    }
  }

  return violations;
}

/** The CSS property whose value contains `index`, read backward to the previous ";" or "{". */
function propertyOf(css: string, index: number): string {
  const start = declarationStart(css, index);
  const colon = declarationColon(css, start);
  return colon !== -1 && colon < index ? css.slice(start, colon).trim() : "";
}

/** Hand-written CSS files this check covers; excludes fonts.css (X14: font metadata, not design values). */
export async function styleFiles(stylesDir: string): Promise<string[]> {
  const entries = await readdir(stylesDir);
  return entries.filter((name) => name.endsWith(".css") && name !== "fonts.css").map((name) => join(stylesDir, name));
}

export async function checkRawValues(stylesDir: string): Promise<Violation[]> {
  const files = await styleFiles(stylesDir);
  const violations: Violation[] = [];
  for (const file of files) {
    const css = await readFile(file, "utf8");
    violations.push(...checkCss(css, relative(stylesDir, file)));
  }
  return violations;
}
