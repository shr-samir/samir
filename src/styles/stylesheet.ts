/**
 * Assembles the one stylesheet every page loads (F1a-D3). The build calls the
 * default export and writes the result to dist/site.css.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { tokensCss } from "#src/styles/tokens-css.ts";
import { demoCss } from "#src/styles/demo-css.ts";

/**
 * Cascade layer order, declared once at the top. Later layers win regardless of
 * selector specificity, so a component style never needs to out-specify a base
 * style. Every rule must live in one of these layers: unlayered CSS would beat
 * all of them.
 */
export const LAYERS = ["reset", "tokens", "base", "layout", "components", "utilities"] as const;

async function source(name: string): Promise<string> {
  return readFile(join(import.meta.dirname, name), "utf8");
}

export default async function stylesheet(): Promise<string> {
  const parts = [
    `@layer ${LAYERS.join(", ")};\n`,
    await source("reset.css"),
    tokensCss(),
    await source("fonts.css"),
    await source("base.css"),
    demoCss(),
  ];
  return parts.join("\n");
}
