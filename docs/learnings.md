# Learnings

One shared log of things learned while building, newest first. Each entry is one
or two lines, tagged with its feature ID, and links to the feature doc (or PRD
decision) for detail. Add entries in the same PR as the code that taught them.

**Format:** `- YYYY-MM-DD [<ID>] <what was learned>. <fix or takeaway>. → <link>`

## Entries

- 2026-09-27 [repo] Node 24 runs `.ts` files directly (type stripping), so build scripts and tests (`node --test`) need no compile step or extra tooling. Only erasable TypeScript syntax works this way (no `enum`, no parameter properties). → [PRD D1, D7](PRD.md#d7-development-and-testing-tools--nodes-standard-library)
- 2026-09-27 [F1a] tailwind-merge 3.7.0 with its default config silently drops custom font-size tokens like `text-prose` when combined with a text color (it treats them as colors), and doesn't deduplicate custom spacing like `p-m p-l`. Class-merging libraries need every custom token registered; this extra upkeep was part of the case for native CSS. → [PRD D2](PRD.md#d2-styling--native-css-with-design-tokens)
