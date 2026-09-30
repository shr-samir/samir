# Learnings

One shared log of things learned while building, newest first. Each entry is one
or two lines, tagged with its feature ID, and links to the feature doc (or PRD
decision) for detail. Add entries in the same PR as the code that taught them.

**Format:** `- YYYY-MM-DD [<ID>] <what was learned>. <fix or takeaway>. → <link>`

## Entries

- 2026-09-30 [F1a] Inter's variable Latin files (upright 48.3 KB + italic 51.8 KB) total 100.1 KB, just over a 100 KB font budget; Geist is 60.4 KB. Measure candidates before choosing, since sizes vary 2.5× between similar-looking sans fonts. → [F1a-D19](features/F1a-design-tokens-and-fonts.md#f1a-d19-geist--geist-mono-q1)
- 2026-09-30 [F1a] Tuned fallback faces (`size-adjust` + ascent/descent overrides) made the fallback take exactly the web font's space (92px vs 92px; plain Arial 84px). Measure `size-adjust` from rendered text width rather than the font's `xAvgCharWidth`. → [F1a-D17](features/F1a-design-tokens-and-fonts.md#f1a-d17-fallback-metrics-come-from-measurement-not-the-fonts-average-width-field)

- 2026-09-30 [F1a] Dark, saturated blues and teals fall outside sRGB sooner than expected: OKLCH L 0.44 / C 0.15 at hue 255 already needs a negative red channel. Fit chroma to the gamut per lightness (binary search) instead of hand-tuning. → [F1a-D16](features/F1a-design-tokens-and-fonts.md#f1a-d16-chroma-is-fitted-into-the-srgb-gamut-by-the-generator-the-gamut-check-stays-as-a-guard)
- 2026-09-30 [F1a] Inherited `color` is resolved on the parent, so a child that switches `color-scheme` or redefines `--color-*` must restate `color: var(--color-text)` to use its own palette. → [F1a X11](features/F1a-design-tokens-and-fonts.md#discovered-checklist)
- 2026-09-30 [F1a] To preview OS dark mode in headless Chrome, put the page in an iframe with `color-scheme: dark`; the framed page's `prefers-color-scheme` follows it. → [F1a layer log](features/F1a-design-tokens-and-fonts.md#layer-log)

- 2026-09-30 [F1a] Fluid `clamp(rem + vw)` headings grow less than the zoom level, because zoom shrinks the CSS viewport and the vw part with it (`text-4xl`: 164% at 200% zoom on a 1280px window). 200% stays reachable within the browser's 500% zoom limit as long as max ≤ 2.5 × min. → [F1a X6](features/F1a-design-tokens-and-fonts.md#discovered-checklist)
- 2026-09-30 [F1a] Headless Chrome won't render narrower than roughly 500px, whatever `--window-size` says, so "mobile" screenshots look cut off. Load the page in an iframe of the exact width inside a wider window instead. → [F1a layer log](features/F1a-design-tokens-and-fonts.md#layer-log)

- 2026-09-28 [F1a] tsconfig `paths` aliases (`@/…`) only work with a bundler: Node never reads tsconfig, so the import fails at runtime. Node's own `package.json` `"imports"` map (`"#src/*": "./src/*"`) works at runtime and in TypeScript alike; browsers need an import map instead. → [F1a-D10](features/F1a-design-tokens-and-fonts.md#f1a-d10-absolute-imports-through-node-subpath-imports-src-scripts)

- 2026-09-28 [F1a] TypeScript 7 defaults to `types: []`, so build scripts importing `node:fs` fail type-checking until `@types/node` is installed and listed in `types`. It also errors (TS18003) on a config whose `include` matches no files, e.g. an empty `src/client/`. → [F1a S1](features/F1a-design-tokens-and-fonts.md#s1-typescript-7-config-2026-09-28)
- 2026-09-28 [F1a] With Node type stripping, `import { SomeType } from "./x.ts"` crashes at runtime ("does not provide an export named"), because Node keeps the import but the type doesn't exist in JavaScript. `verbatimModuleSyntax` turns this into a compile error (TS1484); write `import type`. → [F1a-D6](features/F1a-design-tokens-and-fonts.md#f1a-d6-two-typescript-configs)

- 2026-09-27 [repo] Node 24 runs `.ts` files directly (type stripping), so build scripts and tests (`node --test`) need no compile step or extra tooling. Only erasable TypeScript syntax works this way (no `enum`, no parameter properties). → [PRD D1, D7](PRD.md#d7-development-and-testing-tools--nodes-standard-library)
- 2026-09-27 [F1a] tailwind-merge 3.7.0 with its default config silently drops custom font-size tokens like `text-prose` when combined with a text color (it treats them as colors), and doesn't deduplicate custom spacing like `p-m p-l`. Class-merging libraries need every custom token registered; this extra upkeep was part of the case for native CSS. → [PRD D2](PRD.md#d2-styling--native-css-with-design-tokens)
