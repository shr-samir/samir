/**
 * Turns the token data into CSS custom properties inside `@layer tokens`
 * (F1a-D1). The output only exists inside the built site.css; edit tokens.ts.
 */
import { fluid, rem } from "#src/styles/fluid.ts";
import {
  durations,
  ease,
  focus,
  measures,
  radii,
  shadows,
  spacing,
  typeScale,
  weights,
  widths,
} from "#src/styles/tokens.ts";

function px(value: number): string {
  return `${value}px`;
}

function em(value: number): string {
  return value === 0 ? "0" : `${value}em`;
}

export function tokensCss(): string {
  const lines: string[] = [];
  const group = (comment: string, declarations: Array<[name: string, value: string]>) => {
    lines.push(`    /* ${comment} */`);
    for (const [name, value] of declarations) lines.push(`    --${name}: ${value};`);
  };

  for (const token of typeScale) {
    const range = token.mobile === token.desktop ? `${token.mobile}px` : `${token.mobile}px → ${token.desktop}px`;
    group(`text-${token.name}: ${range}. ${token.use}`, [
      [`text-${token.name}`, fluid(token.mobile, token.desktop).css],
      [`leading-${token.name}`, String(token.leading)],
      [`tracking-${token.name}`, em(token.tracking)],
    ]);
  }
  group("Font weights", weights.map((w) => [`weight-${w.name}`, String(w.value)]));
  group("Spacing", spacing.map((s) => [`space-${s.name}`, rem(s.px)]));
  group("Container widths", widths.map((w) => [`width-${w.name}`, rem(w.px)]));
  group("Line length", measures.map((m) => [`measure-${m.name}`, m.value]));
  group("Radius", radii.map((r) => [`radius-${r.name}`, px(r.px)]));
  group("Elevation", shadows.map((s) => [`shadow-${s.name}`, s.value]));
  group("Motion", [...durations.map((d): [string, string] => [`duration-${d.name}`, `${d.ms}ms`]), ["ease", ease]]);
  group("Focus indicator", [
    ["focus-width", px(focus.widthPx)],
    ["focus-offset", px(focus.offsetPx)],
  ]);

  const reducedMotion = durations.map((d) => `      --duration-${d.name}: 0s;`).join("\n");

  return `/* Generated from src/styles/tokens.ts. Edit that file, not this output. */
@layer tokens {
  :root {
${lines.join("\n")}
  }

  @media (prefers-reduced-motion: reduce) {
    :root {
${reducedMotion}
    }
  }
}
`;
}
