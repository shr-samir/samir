# Asset sources

SVG sources for the static images in `public/` that must ship as raster
(PNG/ICO) — social crawlers and Apple don't accept SVG for these, and a
build-time SVG → PNG pipeline is a real dependency (`sharp`, `resvg`, or
similar) that the PRD defers to F11 (D0: OG image generation is an
F11-decided dependency). Until then, these are rendered once, by hand, and
the output is committed as a static file.

**Not copied to `dist/`** — these are editor sources, not site content.
`public/favicon.svg` is the one SVG that *does* ship, since browsers render
it live and it needs no rasterization.

## Files

- `og-default.svg` → `public/og-default.png` (1200×630, the default
  link-preview image, F1b-D6/O5)
- `favicon-180.svg` → `public/apple-touch-icon.png` (180×180)
- `favicon-32.svg` → `public/favicon.svg` (shipped as-is, live SVG) and
  → `public/favicon.ico` (32×32, wrapped in a minimal hand-written ICO
  container — see below)

Both favicon SVGs render the same mark at different sizes via a different
`width`/`height` on the same `viewBox="0 0 32 32"`, so the inner shapes never
need editing separately.

**Note:** `favicon-32.svg`'s Geist font reference only renders correctly
during this authoring step, where it's wrapped in an HTML page that declares
`@font-face`. The *shipped* `public/favicon.svg` has that reference removed
(it falls back to `system-ui` anyway, since a standalone favicon has no
access to the site's stylesheet) — edit the shipped file separately if the
mark itself changes.

## How they were made (2026-10-01)

1. Palette colors pulled from the real violet-light tokens (not guessed):
   `buildPalette({ hue: 295, chroma: 0.16 }, "light")` → `bg`, `text`,
   `accent`, `on-accent`.
2. Each SVG wrapped in a small HTML page with `@font-face` pointing at
   `public/fonts/geist-latin-wght-normal.woff2`, so Geist renders for real.
3. Screenshotted with headless Chrome at the exact target pixel size
   (`--window-size`, `--screenshot`), confirmed by reading each PNG's IHDR
   dimensions afterward — not just assumed from the window size.
4. `favicon.ico`: PNG embedded directly in a 22-byte ICO header + one
   16-byte directory entry (the modern approach; ICO readers since Windows
   Vista accept a PNG payload, so no PNG → BMP conversion is needed). See the
   scratch script this was built from if the mark changes and the icon needs
   regenerating — recreate the render pipeline above, there's nothing to
   re-run automatically yet.

## Replacing later (F11 or whenever real branding exists)

Swap these four files in `public/`; nothing else references their content,
only their file names and dimensions (`og-default.png` must stay 1200×630;
the OG `<meta>` tags in `document.ts` hardcode that size).
