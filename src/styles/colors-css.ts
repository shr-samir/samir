/**
 * Turns the palettes into CSS custom properties (F1a-D2). Each semantic color
 * is `light-dark(<light>, <dark>)`, so the theme follows `color-scheme`; each
 * accent is a `[data-accent]` block, and the first accent is also the default.
 * Throws if any palette fails the contrast or gamut check, which fails the build.
 */
import { toCss } from "#src/styles/color.ts";
import { accents, buildPalette, checkPalettes, ROLES } from "#src/styles/palette.ts";

/** `check` is replaceable so tests can prove a failing palette stops the build. */
export function colorsCss(check: typeof checkPalettes = checkPalettes): string {
  const problems = check();
  if (problems.length > 0) {
    const list = problems.map((p) => `  - ${p.accent} / ${p.theme}: ${p.message}`).join("\n");
    throw new Error(`Color palettes fail the contrast/gamut check:\n${list}`);
  }

  const blocks = accents.map((accent, index) => {
    const light = buildPalette(accent, "light");
    const dark = buildPalette(accent, "dark");
    const selector = index === 0 ? `:root,\n  [data-accent="${accent.name}"]` : `[data-accent="${accent.name}"]`;
    const declarations = ROLES.map(
      (role) => `    --color-${role}: light-dark(${toCss(light[role])}, ${toCss(dark[role])});`,
    ).join("\n");
    return `  /* Accent: ${accent.label} (hue ${accent.hue})${index === 0 ? ", the default" : ""} */
  ${selector} {
${declarations}
  }`;
  });

  return `/* Generated from src/styles/palette.ts. Edit that file, not this output. */
@layer tokens {
  /* Follow the OS theme; the theme switcher (F3) will override this. */
  :root {
    color-scheme: light dark;
  }

${blocks.join("\n\n")}
}
`;
}
