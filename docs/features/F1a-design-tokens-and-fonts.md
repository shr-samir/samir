# F1a — Design tokens and fonts

| | |
|---|---|
| **PRD** | [§8 F1a](../PRD.md#f1a--design-tokens-and-fonts) |
| **Status** | done |
| **Checklist frozen** | 2026-09-28 |

Learnings from this feature go in [`docs/learnings.md`](../learnings.md), tagged `[F1a]`.

## Understanding
Plain-language summary for the owner, updated every layer. Platform concepts
that apply beyond this feature are explained in
[`fundamentals.md`](../fundamentals.md); this section covers what *this* feature
is doing and why.

### TL;DR
F1a is **done**. It builds the foundation everything else stands on: the
machinery that turns TypeScript into HTML files (L1), the design system as CSS
variables — type, spacing, color, motion — (L2–L3), self-hosted fonts with no
layout shift (L4), a build check that a raw value can never bypass a token
(L5), a `pnpm preview` server, and an accessibility close-out. One demo page
(`/design/`) shows every token; no real site content yet — that starts at F4.

| Layer | In one line | Status |
|---|---|---|
| L1 Foundations | A tiny program that writes HTML files, with safe templates | done |
| L2 Tokens | Sizes, spacing and motion as CSS variables; base text styles; demo page | done |
| L3 Color | Light and dark palettes per accent, and a contrast check | done |
| L4 Fonts | Chosen fonts, measured, self-hosted | done |
| L5 Raw-value check | Build fails if CSS skips the design system, `pnpm preview` added | done |
| Close-out | Accessibility manual passes; F1a marked done | done |

### L1 — Foundations

**Essence.** There's no framework, so we wrote the part Vite would normally
provide: a build script that Node runs directly. It calls a function for each
page, gets HTML text back, and writes it to `dist/`. The `html` helper makes
writing that HTML safe by escaping inserted text. TypeScript is used for
checking, not converting: Node strips the types and runs the code, and `tsc`
checks it separately.

**What changed**
- `scripts/build.ts`: the build (clean `dist/`, copy `public/`, render pages, write files).
- `src/lib/html.ts`: `html` tagged template with automatic escaping, and `raw()` for trusted HTML.
- `src/lib/page.ts`: the page contract (`{ path, body }`) and URL → file mapping.
- `src/pages/index.ts`: a placeholder home page.
- `tsconfig.json` / `tsconfig.client.json`: type-checking for Node code; compiling for browser code later.
- `package.json`: `pnpm build`, `pnpm typecheck`, `pnpm test`; TypeScript 7 and `@types/node`; Node ≥ 24.12; the `"imports"` map behind absolute imports (`#src/…`, `#scripts/…`).
- `tests/`: all tests, mirroring the app's folders (`tests/src/lib/html.test.ts` tests `src/lib/html.ts`).

**Questions asked**
- *How do we build files without Vite or any tools?* Node is the tool. Building
  just means running a program that writes files, and Node's built-in `fs` can do
  that. → [fundamentals §5](../fundamentals.md#5-building-is-writing-files)
- *Does `pnpm build` convert our TypeScript to JavaScript and bundle it with the
  HTML and CSS into one file?* No to both. Our TypeScript runs in Node and
  *writes* HTML; it never reaches the browser, so it isn't converted. Output is
  separate files (HTML, one CSS file, fonts, scripts), not a bundle. Only browser
  scripts (from F3) get compiled to JavaScript.
  → [fundamentals §6](../fundamentals.md#6-two-kinds-of-typescript)
- *Why generate HTML instead of writing it by hand? Is it because of dynamic
  content?* Mostly repetition: shared header and footer, one template for many
  posts, derived pages like the sitemap and RSS, and build-time checks. The
  content is data-driven, but the HTML is fixed until the next deploy; truly
  per-visitor things are done by small browser scripts.
  → [fundamentals §4](../fundamentals.md#4-why-build-at-all-instead-of-writing-html-by-hand)
- *In what order does the browser load HTML, CSS and JavaScript?* HTML first; it
  starts downloading CSS and scripts in parallel as it finds them, waits for CSS
  before painting, and runs module scripts after reading the HTML.
  → [fundamentals §1](../fundamentals.md#1-the-browser-only-ever-receives-files)
- *How does `build.ts` work, step by step?* See [How it works](#how-it-works).
- *How does `src/pages/index.ts` work, and why does it export HTML inside an
  object?* It default-exports a function that returns a list of
  `{ path, body }` objects. There's no router, so each page states its own URL
  (`path`); the build turns that into a file name (`/` → `dist/index.html`) and
  writes `body`, the full HTML document, into it. `body` is made with `html`,
  which escapes any `${…}` values and returns a `SafeHtml` object, so at runtime
  the module returns plain data: a URL and a string. It's like a React page
  component, except it returns HTML text written to a file at build time instead
  of elements rendered in the browser. It's a function, not a constant, so it can
  do work at build time (read Markdown, loop over posts) and return many pages,
  optionally `async`. The pieces: `html` builds the text, `Page` lets TypeScript
  check the shape, `outputFile` maps URL → file, `build` calls the function and
  writes the files. The inline `<head>` moves into a shared layout function in F1b.
- *Can we use absolute imports instead of relative ones?* Yes, with Node's own
  **subpath imports**: `package.json` maps `#src/*` to `./src/*`, so every file
  writes `import { html } from "#src/lib/html.ts"` from anywhere. The Vite-style
  `@/…` alias with tsconfig `paths` wouldn't work, because only TypeScript reads
  `paths`; Node would crash at runtime. (F1a-D10)
  → [fundamentals §11](../fundamentals.md#11-imports-are-urls-not-magic)
- *Can tests live in one folder?* Yes: `tests/` mirrors the app, so the test for
  `src/lib/html.ts` is `tests/src/lib/html.test.ts`. `node --test` finds every
  `*.test.ts` file on its own. (F1a-D11)

**Questions you might have**
- *Does `pnpm build` catch type errors?* No. Node strips types without checking
  them, so the build runs even with type errors. Run `pnpm typecheck` too; the
  deploy pipeline (F12) will run both.
- *How do I see the page?* Run `pnpm build`, then open `dist/index.html` in a
  browser. That works while pages have no linked files. Once pages link
  `/site.css` (L2), paths starting with `/` point to the root of your drive when
  a file is opened directly, so you'll need a local server; the dev server
  arrives in F1b.
- *Why does `html` return a `SafeHtml` object instead of a string?* So the
  helper can tell "markup we already built" apart from "text that needs
  escaping". A plain string would be escaped again when nested, turning `<p>`
  into visible `&lt;p&gt;`.
- *Why not a template engine like Handlebars or EJS?* Tagged templates are part
  of JavaScript, give us type checking inside templates, and need no dependency
  (D0, D1a).
- *Why does a page module return a list instead of one page?* One module handles
  a URL pattern. The blog post module will return one page per Markdown file.
- *Why delete `dist/` on every build?* Otherwise a page you removed from the
  source would stay in the output and get deployed forever.
- *Why do imports end in `.ts`?* Node and browsers load exact files, never
  guessing extensions. → [fundamentals §11](../fundamentals.md#11-imports-are-urls-not-magic)
- *Why the `#` in `#src/…`?* Node requires it. Names starting with `#` are
  looked up in this package's own `"imports"` map, and can never clash with an
  npm package name.
- *Will browser scripts use `#src/…` too?* No. Browsers don't read
  `package.json`, so they can't resolve `#src/…`. Browser scripts (F3) will use
  relative imports or an *import map*; decided in F3 (X5).
- *How do I add a new absolute prefix, say for `content/`?* Add one line to
  `"imports"` in `package.json` (`"#content/*": "./content/*"`); Node and
  TypeScript both pick it up.
- *Where does CSS go?* Nowhere yet; the build learns to produce `site.css` in L2.

### L2 — Non-color tokens and base typography

**Essence.** Every size, space, radius, shadow and duration is written down
once, as data in `src/styles/tokens.ts`. The build turns that data into CSS
custom properties (`--text-xl`, `--space-m`, …), joins them with a few
hand-written CSS files into one `dist/site.css`, and the demo page at `/design/`
loops over the same data to show every token. The stylesheet and the demo can't
disagree, and a new token appears in both with no extra work. Text sizes that
change between phone and laptop are *fluid*: computed by a formula that grows
them smoothly, instead of jumping at a breakpoint.

**What changed**
- `src/styles/tokens.ts`: the token data (type scale, weights, spacing, widths, line length, radius, shadows, motion, focus).
- `src/styles/fluid.ts`: the fluid-size formula, and a model of how a size renders at any window width and zoom (used by tests).
- `src/styles/tokens-css.ts`: turns the data into custom properties, plus the reduced-motion override.
- `src/styles/reset.css`, `fonts.css`, `base.css`: browser quirks removed; font role variables (system fonts until L4); default element styles, `.prose`, focus outline.
- `src/styles/demo-css.ts`: demo page styles, one class per token, generated from the data.
- `src/styles/stylesheet.ts`: joins everything under one cascade-layer order; the build writes the result to `dist/site.css`.
- `src/layout/document.ts`: the shared HTML document (`<head>` with the stylesheet link), which F1b grows into the full layout.
- `src/pages/design.ts`: the demo page at `/design/`; `src/pages/index.ts` now uses `document()`.
- `scripts/build.ts`: also writes `site.css`.

**Questions asked**
- *Where should the demo page live?* Public at `/design/`, not in the
  navigation. It shows the design system as part of the portfolio and gives the
  build checks a real page. (F1a-D12)
- *Fluid headings grow only 164–182% at exactly 200% zoom on wide windows;
  accept or narrow the fluid range?* Accepted: 200% is still reachable within the
  browser's zoom range, and a test enforces it. (X6)
- *h3 and h4 use line heights 1.3 and 1.4, not the checklist's 1.2; keep?*
  Kept: those sizes also set lead paragraphs, where 1.2 is cramped. (X9)
- *How do tokens work? Walk me through an example.* Take `text-xl`, the h3 size:
  1. **Data** (`tokens.ts`): `{ name: "xl", mobile: 23, desktop: 28, leading: 1.3, tracking: -0.01 }`.
  2. **Build** (`tokens-css.ts` + `fluid.ts`) writes
     `--text-xl: clamp(1.4375rem, 1.3333rem + 0.5208vw, 1.75rem);` plus
     `--leading-xl` and `--tracking-xl`. 1.4375rem = 23px (min), 1.75rem = 28px
     (max); in between, the size grows 5px over 960px of window width
     (0.5208vw), starting from 21.33px (1.3333rem) so the line hits 23px at a
     320px window.
  3. **Style** (`base.css`): `h3 { font-size: var(--text-xl); … }` — never the number.
  4. **Browser** computes it for the current window: 23px at 320px, 25.5px at
     800px, 28px at 1280px, and stays 28px wider than that.

  Changing `desktop: 28` to `30` and rebuilding updates every h3, the demo page
  and the tests' checks at once. It's the same idea as a Tailwind theme value
  behind a `text-xl` class, except the output is a CSS variable that any rule can
  use and that exists at runtime.

**Questions you might have**
- *What is a CSS custom property?* A variable in CSS: `--space-m: 1.5rem`
  defines it, `var(--space-m)` reads it. Unlike Sass variables, they exist in the
  browser at runtime, so a theme can change them without a rebuild; that's how
  L3's light and dark palettes will work.
  → [fundamentals §13](../fundamentals.md#13-css-without-tailwind-design-tokens-and-cascade-layers)
- *What are the `@layer` blocks for?* They decide which styles win: a later
  layer beats an earlier one regardless of selector specificity, so component
  styles never need `!important` or longer selectors to override base styles.
  → [fundamentals §13](../fundamentals.md#13-css-without-tailwind-design-tokens-and-cascade-layers)
- *Why isn't there a `tokens.css` file in the repo?* It's generated from
  `tokens.ts` on every build and exists only inside `dist/site.css`. A committed
  copy could go stale; generating it keeps the data the only source of truth.
- *Why rem instead of px?* rem follows the user's browser font-size setting.
  Someone who sets larger text gets larger text *and* proportionally larger
  spacing, so layouts keep their shape. Radii stay in px because they shouldn't
  grow with text.
- *How does fluid type work?* Each size is a straight line between two points:
  its mobile size at a 320px window and its desktop size at 1280px.
  `clamp(min, preferred, max)` draws that line and stops it at both ends; the
  preferred value mixes rem and vw so it still responds to zoom.
- *Why generated classes like `demo-text-xl` instead of `style=""`?* Inline
  `style` attributes need `'unsafe-inline'` in a Content-Security-Policy, which
  the strict policy planned for F12 would rather avoid.
- *How do I view the demo page?* Opening `dist/design/index.html` directly
  won't load the CSS, because `/site.css` then means the root of your drive. It
  needs a local server until the F1b dev server exists. (X7)
- *Are these values final?* Type sizes and spacing come from the PRD. The radii
  (4, 8, 16px), the easing curve and per-size line heights are picks within the
  PRD's rules; change them in `tokens.ts` and everything follows.

### L3 — Color and contrast check

**Essence.** Colors are generated, not hand-picked. An accent is just a hue and
a chroma (how colorful). Every role — text, backgrounds, borders, the five
accent steps, status colors, focus ring — has a fixed lightness per theme, so
each accent × theme palette falls out of a formula. Before the build writes any
CSS, it converts every color to the light a screen actually emits and checks
every pair that must stay readable against WCAG AA; one failing pair fails the
build. In the CSS, each color is `light-dark(<light>, <dark>)`, so the page
follows the OS theme on its own, and an accent is a `[data-accent]` block that
redefines the same variable names.

**What changed**
- `src/styles/color.ts`: color math: OKLCH → linear sRGB, WCAG luminance and contrast, gamut test, and fitting a color into the gamut.
- `src/styles/palette.ts`: the accents, the lightness of every role per theme, the list of pairs that must pass, and the check.
- `src/styles/colors-css.ts`: writes the `--color-*` variables per accent; throws (failing the build) if any palette fails.
- `src/styles/tokens.ts`: shadows now take their color from `--color-shadow`, which is transparent in dark mode.
- `src/styles/base.css`: page text, background, links and focus ring use the semantic colors.
- `src/pages/design.ts`, `src/styles/demo-css.ts`: a Color section with one panel per accent × theme, showing swatches, sample text, buttons and contrast ratios.

**Questions asked**
- *Which accent colors?* Not decided yet (Q2): four candidates are on the demo
  page (blue, teal, violet, rust); the owner picks at the L3 gate.

**Questions you might have**
- *What is OKLCH, and why not hex?* OKLCH describes a color as lightness,
  chroma (colorfulness) and hue, and its lightness matches how bright colors
  *look*. With hex or HSL, a yellow and a blue at "50% lightness" look very
  different in brightness; in OKLCH they look alike, which is what makes
  "every role has a fixed lightness" work across hues.
  → [fundamentals §13](../fundamentals.md#13-css-without-tailwind-design-tokens-and-cascade-layers)
- *How does the theme switch without JavaScript?* `color-scheme: light dark` on
  the page tells the browser both themes are supported; `light-dark(a, b)` then
  picks `a` or `b` from the visitor's OS setting. The theme switcher (F3) will
  set `color-scheme` to force one.
- *How does the demo show dark and light side by side?* Each panel sets its own
  `color-scheme` and `data-accent`. The variables are re-read inside the panel,
  so it shows its own palette no matter what the page uses.
- *What is "out of gamut"?* OKLCH can describe colors no ordinary (sRGB) screen
  can show. The browser would quietly swap in a nearby color, so the contrast we
  computed would no longer be true. So the build rejects such colors, and the
  generator lowers an accent's chroma to what fits at each lightness (teal
  asked for 0.10 and gets 0.084).
- *Why do status colors ignore the accent?* So "danger" always looks like
  danger. They're also always paired with text or an icon, never color alone.
- *Why is the blue accent close to the "info" color?* Both are blue. It's
  harmless because status always comes with a label, but if blue is chosen as the
  default accent, "info" could shift toward cyan. (X10)
- *What does the check actually compare?* 12 rules, each a foreground against
  its backgrounds in every palette: text, secondary text, links, hovered links,
  selected-state text, button text and status text must reach 4.5:1; control
  borders and the focus ring 3:1. That's 35 pairs per palette, 280 in total.

### L4 — Fonts

**Essence.** The site now uses Geist for text and Geist Mono for code, served
from our own domain as three small files. The browser only downloads a file
when the page actually uses it: the home page fetches one file (29 KB), the
demo page two (52 KB), and the italic file only loads on pages with italic
text. While a file downloads, text shows in a system font (Arial, Courier New)
that has been resized and re-measured to take up exactly the same space, so
nothing jumps when Geist arrives.

**What changed**
- `public/fonts/`: `geist-latin-wght-normal.woff2` (29.4 KB), `…-italic.woff2` (31.0 KB), `geist-mono-latin-wght-normal.woff2` (23.1 KB), and `OFL.txt` (the license).
- `src/styles/fonts.css`: `@font-face` rules for Geist, Geist italic and Geist Mono; tuned fallback faces; the role variables (`--font-sans`, `--font-heading`, `--font-meta`, `--font-code`).
- `scripts/font-metrics.ts`: reads a font's vertical metrics from its WOFF2 file, used to tune the fallbacks.
- `src/layout/document.ts`: preloads the upright Geist file, which every page uses.
- `src/styles/base.css`: code blocks turn off ligatures; `demo-css.ts`: metadata text uses `--font-meta`.

**Questions asked**
- *Is there an issue with the font? Do we need to worry about size now?* (at
  Gate 1) Not then; it was measured here, before choosing. Inter turned out
  0.1 KB over the budget (100.1 KB for upright + italic).
- *Which font?* Geist + Geist Mono: designed as a pair, 60 KB for both text
  files, 84 KB with the code font. Chosen from six measured candidates. (F1a-D19)
- *Should metadata use monospace?* No: it would load the mono file on every
  page, making three files on pages with italics. It stays a one-line switch.
- *Are these variable (dynamic) fonts or static?* Variable. Verified in Chrome:
  one file rendered the same text at weights 100, 400, 550, 700 and 900 with five
  distinct widths (550 sits between 400 and 700; a static font would snap to the
  nearest weight it has). Static fonts need one file per weight and style, so
  regular, bold, italic and bold italic would be four files, twice the budget's
  two. `font-weight: 100 900` in the `@font-face` and `wght` in the file name
  mark the weight axis. Trade-off: the file carries weights we never use (the
  design uses only 400 and 700).

**Questions you might have**
- *Why self-host instead of Google Fonts?* No extra connection to another
  domain before text can render, no visitor data sent to a third party, and the
  files are cached with the rest of the site. (D4)
- *What does `font-display: swap` do?* Shows text immediately in the fallback
  font and swaps in Geist when it arrives, instead of hiding text while waiting.
- *Why would text jump, and how is that prevented?* Arial is about 2% narrower
  than Geist and sits differently on the line, so swapping could re-wrap lines
  and move everything below (layout shift). The fallback faces fix that:
  `size-adjust` scales Arial to Geist's width, and `ascent-override` /
  `descent-override` give it Geist's line metrics. Measured result: a paragraph
  is 92px tall in Geist, 92px in the tuned fallback, 84px in plain Arial.
  → [fundamentals §14](../fundamentals.md#14-fonts-when-they-download-and-why-text-doesnt-jump)
- *Why only one weight file per style?* They're variable fonts: one file holds
  every weight from 100 to 900, so regular and bold come from the same file.
- *Why preload only the upright file?* Every page uses it, so starting that
  download early helps first paint. Preloading the italic or mono file would
  force it onto pages that never use it.
- *What's the `unicode-range` for?* It tells the browser which characters the
  file covers (Latin). A character outside it, say Nepali script, falls through
  to a system font instead of rendering as a blank box.
- *Why turn off ligatures in code?* Some code fonts merge `=>` into one arrow
  glyph (JetBrains Mono did in the specimen; Geist Mono didn't). Code should show
  exactly what you'd type, and the rule keeps that true if the font changes.
- *What if I swap fonts later?* Edit `fonts.css`: the file URLs and the family
  name in `--font-sans`. Re-run `node scripts/font-metrics.ts` on the new file
  and re-measure the width ratio to update the fallback values.

### L5 — Raw-value check

**Essence.** R1 says every visual value must come from a token, but nothing
stopped someone from writing `margin: 16px` by hand instead of
`margin: var(--space-s)`. This layer adds a script that scans every hand-written
CSS file for raw lengths, colors and durations, and fails the build if it finds
one, naming the file, line, value and which kind of token to use instead. It
knows about the handful of legitimate exceptions the PRD lists (§7.2
breakpoints, hairline borders, `0`/`100%`/`1fr`/`65ch`) and nothing else.

**What changed**
- `scripts/check-raw-values.ts`: the scanner (`checkCss`, `checkRawValues`, `styleFiles`).
- `scripts/build.ts`: runs the check on `src/styles/` before writing `site.css`; any violation fails the build with the full list.

**Questions asked**
- None yet for this layer — I chose the scope (hand-written CSS only, not generated output) and ran the check against every real file before writing tests.

**Questions you might have**
- *Why not check the generated CSS (`tokens-css.ts`, `colors-css.ts`,
  `demo-css.ts`) too?* That code *is* the token source, or reads tokens
  exclusively by construction — `tokens-css.ts` literally writes
  `--text-xl: clamp(...)`, a raw value, because defining that value is its job.
  Checking its output would mean re-approving every token the moment after
  generating it.
- *Why does `fonts.css` get skipped (X14)?* `@font-face` descriptors like
  `size-adjust: 102.19%` and `font-weight: 100 900` describe a font file's own
  metrics, not a design decision like spacing or color. There's no token for
  "how much this specific font differs from Arial."
- *Why a hand-rolled scanner instead of a CSS parser or Stylelint?* The CSS
  here is small (about 10 files) and hand-written by us, so the shapes to
  handle are known and few; a real parser (or a dependency, D0) would be
  overkill for catching "a number followed by px outside a token."
- *What happens to a custom property's own value, like
  `--space-2xl: 80px` in the generated tokens?* Exempt — the point is to stop
  *consumers* of tokens from writing raw values (`margin: 80px`), not to police
  the token definitions themselves.
- *Does this run in development too?* Yes, currently the same in both: R10/D1's
  planned split (dev reports, doesn't block; production blocks) hasn't been
  built yet, since there's no dev server or "development mode" distinction
  before F1b. Tracked as X15.
- *What if the check has a false positive on legitimate CSS later (icons,
  gradients, etc.)?* Extend `ALLOWED_VALUES` or a new exemption function in
  `check-raw-values.ts`, with a test proving it doesn't also let real violations
  through (as D8 anticipated).

### Practical UI review (part of O22, before the F1a close-out)

**Essence.** Before calling F1a done, I ran the Practical UI checklist against
real screenshots and code, not from memory: the home page and `/design/` at
desktop and mobile widths, plus a squint-test shot. One apparent bug (text
seeming to overflow at 320px) turned out to be a screenshot-capture artifact,
not a real one — checked against the actual DOM (`scrollWidth === clientWidth`)
before reporting it, which is the discipline this workflow asks for: prove,
don't assert.

**What changed**
- `src/styles/base.css`: added a temporary `main { padding-inline: var(--space-s) }`
  rule (→ `var(--space-m)` at 768px), so every page has the gutter PRD §7.2
  requires. It's temporary: F1b's container/section primitives will replace it.

**Questions asked**
- None yet; this was a review I ran on my own initiative before the L5 commit,
  per PRD §8's F1a acceptance criteria and the workflow's Practical UI gate.

**Questions you might have**
- *Why didn't `/design/` have this bug too?* It did have padding, but from its
  own `.demo` class, not from anything the home page could reuse — the two
  pages had inconsistent, page-specific fixes instead of one shared rule.
- *Why is the fix in `base.css` and not a proper `.container` class?* PRD's
  project structure puts container/section/stack primitives in F1b (layout
  shell), which doesn't exist yet. A generic `main { padding-inline }` rule
  gets every page unstuck now without inventing F1b's system early.
- *How do I know `.demo`'s own padding still wins, instead of both padding
  rules adding up?* Cascade layers, not specificity: `components` (where
  `.demo` lives) comes after `base` (where the new `main` rule lives) in
  `stylesheet.ts`'s `LAYERS` order, so `.demo`'s padding replaces the generic
  rule rather than stacking with it. Confirmed by screenshot: `/design/` looks
  unchanged after the fix.
- *What about the button and status-icon findings (X17)?* Deferred on purpose:
  the demo page shows what tokens exist, not real components. Building
  hover/focus states for a `<span>` label, or icon markup for a status swatch,
  means building real buttons and status UI early — that's F1b/F4 and F6/F11's
  job, not a token-demo's.

### Preview server (closing X7)

**Essence.** Until now, seeing the site meant `npx serve dist` (a temporary
download each time) or my own throwaway screenshot server. `pnpm preview`
replaces both: a small script using only `node:http`, serving whatever
`pnpm build` last produced, with correct content types so `/site.css` and font
files resolve. It's not a dev server — it doesn't rebuild or reload; run
`pnpm build` again and refresh the browser. That part is F1b (D7).

**What changed**
- `scripts/preview.ts`: the static file server.
- `package.json`: `pnpm preview`.

**Questions asked**
- *Can you add a preview command?* Yes — done here, zero dependencies,
  `node:http` only, same as the rest of the build tooling.

**Questions you might have**
- *Why doesn't it rebuild or reload on save?* That's the dev server (F1b, D7):
  a file watcher plus a message telling the browser to reload. This script only
  serves files; it doesn't watch anything.
- *Is it safe to expose, even briefly?* It refuses any request whose resolved
  path lands outside `dist/` (a `../` escape), and only serves files that
  exist. It has no other features — no directory listing, no write endpoints —
  so there's little surface to worry about for a local preview.
- *What port, and can I change it?* 4173, an arbitrary unregistered port with
  no special meaning. It's a constant in `preview.ts`; there's no flag yet,
  since nothing has needed one.
- *A mutation test almost missed a real bug here — what happened?* See the
  learnings entry below; a naive path-traversal test used an attack string
  that Node's own `URL` parser had already neutralized before my code ran, so
  deleting the guard didn't fail the test. Caught by the mutation-testing
  discipline itself: prove the test would fail without the fix, not just that
  it passes with it.

### F1a close-out: accessibility passes (O22)

**Essence.** With all 5 layers built, the last open item was O22's manual
accessibility work: keyboard walkthrough, 200% zoom on the rendered page (not
just the token math), forced-colors mode, reduced motion, and a screen reader
pass. I ran everything that can be checked from code and headless Chrome, and
was explicit about the one thing that can't: a real screen reader needs a
person operating it.

**What changed**
- `src/pages/design.ts`: `aria-hidden="true"` added to the two decorative,
  empty elements (color swatches, spacing bars).
- `tests/src/pages/design.test.ts`: a test that every empty, purely visual
  element carries `aria-hidden`, mutation-tested to confirm it fails without
  the attribute.

**Questions asked**
- *Close out F1a properly, including the accessibility work?* Yes — done here,
  rather than deferring it into F1b as originally offered as an alternative.

**Questions you might have**
- *What did the keyboard walkthrough actually check, mechanically?* A headless
  script iterated every focusable element on `/` and `/design/`
  (`a[href], button, input, select, textarea, [tabindex]`), called `.focus()`
  on each, and confirmed `document.activeElement` matched — proving each one
  is really reachable, not just present in the DOM. It also read each
  element's accessible text, which is how X20 (indistinguishable link labels)
  was found; reachability alone wouldn't have caught that.
- *How was 200% zoom actually tested, beyond the L2 clamp math?* By rendering
  the page at the CSS-viewport width 200% zoom on a 1280px window produces
  (640px, since zooming shrinks the CSS viewport) and checking both a
  screenshot and `scrollWidth === clientWidth` on the real DOM — proving no
  actual overflow, not inferring it from the token formulas.
- *Can forced-colors mode really be tested headlessly?* Not fully — it's a
  Windows OS feature Chrome's headless mode can't emulate directly. What *can*
  be checked is the CSS itself: does anything rely on a background color alone
  for a boundary (forced-colors strips custom backgrounds), and is there any
  `forced-color-adjust: none` fighting the browser's own substitutions. Both
  came back clean; the mechanism this check depends on is the same
  outline-not-shadow approach already used for focus (§7.5), extended to
  borders here.
- *Why does reduced motion "pass" when nothing on the page moves yet?* Because
  there's genuinely nothing to check on the *rendered* pages yet — the
  `prefers-reduced-motion` mechanism itself was proven correct in L2 (every
  `--duration-*` becomes `0s`), but no CSS uses a duration in a transition or
  animation today. Recorded as X21: worth a real look once F3's theme toggle
  or another feature adds actual motion.
- *What's genuinely still open after this?* X20 (indistinguishable link
  labels) and X22 (a real NVDA pass), both deliberately deferred rather than
  rushed — see their entries for why.


## Problem statement
Lay the foundation every later feature builds on. That means a working TypeScript 7
setup, a minimal build that writes static pages, and the `html` escaping helper;
then all §7 design tokens as CSS custom properties, self-hosted fonts behind role
variables, base typography, and build checks for raw values and contrast, shown on
a token demo page. Done means every PRD F1a acceptance criterion is met and
verified by tests or by running the build.

### Assumptions
- A1. F1a ships no browser scripts; the first is the theme toggle (F3). D6 is proven here, not used. [assumption]
- A2. Hashed asset file names (D1 caching) wait for F1b/F12; F1a writes a plain `site.css`. [assumption]
- A3. Fonts (Q1) and accent hues (Q2) are chosen at the L4 and L3 gates, from options with a recommendation. [assumption]

## Business logic
- B1. Every visual value is defined once, in the token source. CSS elsewhere uses only `var(--…)`, allowlisted values (`0`, `%`, `1fr`, `65ch`, hairline `1px`), and breakpoint values inside `@media`/`@container` conditions (R1, D2).
- B2. Type sizes grow fluidly from their mobile value at 320 px to their desktop value at 1280 px, and still scale with the user's font size and zoom (WCAG 1.4.4).
- B3. Colors come in palettes (2 themes × 3–4 accents); neutrals are tinted by the accent. Every required pair meets its minimum: text 4.5:1; `border-strong`, `focus-ring` and non-text status 3:1. A failing pair fails the build.
- B4. A color outside the sRGB gamut fails the build, since the browser would map it to a different color and its computed contrast would be meaningless.
- B5. Font roles (`sans`, `heading`, `meta`, `code`) map to families in one file; changing a family or switching `meta` to mono is a one-line edit (G2).
- B6. Text put into templates is escaped unless explicitly marked trusted with `raw()` (D1a).
- B7. Each build starts from an empty `dist/`.

## Implementation plan

### Sub-problems
1. Project and TypeScript configuration
2. `html` escaping helper
3. Build script: page modules → static files
4. Token data and CSS generation
5. Color palettes, contrast and gamut math
6. Fonts
7. Raw-value check
8. Demo page

### Layers
Each layer is one PR, adds standalone value, and is approved before the next.
1. **L1 — Foundations:** TypeScript and tsconfigs, `html` helper, build script, scripts for build/typecheck/test.
2. **L2 — Non-color tokens and base typography:** `tokens.ts` → generated `tokens.css`, cascade layers, one concatenated `site.css`, base typography, demo page for these tokens.
3. **L3 — Color and contrast check:** OKLCH palettes per accent × theme, `light-dark()` + `data-accent`, contrast and gamut check, palettes on the demo page.
4. **L4 — Fonts:** measured `.woff2` files, `fonts.css` with role variables, metric-tuned fallbacks.
5. **L5 — Raw-value check:** CSS scanner with tests, wired into the build.

## Decision records

### F1a-D1: Tokens are authored in TypeScript; the build generates `tokens.css`
- **Decision:** `src/styles/tokens.ts` is the single source; CSS is generated from it at build time, straight into `dist/site.css` (no generated file is committed).
- **Why it fits:** the demo page must render every token and the contrast check must read every color; one data source means the demo can't miss a token and no check parses `light-dark()` strings. Clamp math is computed, not hand-typed. [verified: Node runs `.ts` directly]
- **Alternative:** hand-written `tokens.css`, parsed by the demo and checks — regex-fragile, and the demo can drift.
- **Would be wrong if:** reading generated CSS in DevTools gets confusing (mitigated by comments pointing to the source).
- **Confidence:** high
- **Spike:** none

### F1a-D2: Theme via `color-scheme` + `light-dark()`; accent via `[data-accent]` blocks
- **Decision:** each accent block redefines all semantic colors as `light-dark(light, dark)` values.
- **Why it fits:** theme is one property, and the demo can show both themes side by side without JavaScript. Supported in Chrome/Edge 123+, Firefox 120+, Safari 17.5+, covering "last 2 versions". [verified: caniuse, 2026-09-28]
- **Alternative:** `[data-theme]` blocks duplicating every color — twice the CSS, extra wiring for the OS preference.
- **Would be wrong if:** F3 needs theme state that `color-scheme` can't express.
- **Confidence:** high
- **Spike:** none

### F1a-D3: CSS files are concatenated in layer order into one `site.css`
- **Decision:** the build joins source CSS files after one `@layer` order declaration.
- **Why it fits:** one request on mobile networks; component CSS stays in separate source files.
- **Alternative:** `@import` or several `<link>` tags — extra requests.
- **Would be wrong if:** a page-specific stylesheet becomes large enough to matter for the CSS budget.
- **Confidence:** high
- **Spike:** none

### F1a-D4: Fluid type uses `clamp(<rem>, <rem> + <vw>, <rem>)`
- **Decision:** each size is a clamp whose preferred value mixes rem and vw.
- **Why it fits:** the rem part keeps text responsive to user font size and zoom; pure-`vw` sizes barely grow at 200% zoom and fail WCAG 1.4.4. [memory]
- **Alternative:** stepped sizes per breakpoint — jumps at breakpoints, more tokens.
- **Would be wrong if:** zoom testing at L2 shows text not scaling to 200%.
- **Confidence:** high
- **Spike:** none

### F1a-D5: Fonts are Latin-subset variable `.woff2` files downloaded once from Fontsource's CDN
- **Decision:** copy pre-subset, OFL-licensed files into `public/fonts`; no package, no subsetting tool.
- **Why it fits:** already subset and licensed; a one-time copy needs no dependency (D0, D4).
- **Alternative:** full files plus `fonttools` subsetting — a Python toolchain for a one-time job.
- **Would be wrong if:** file sizes break the budget (≤ 2 files, ≤ 100 KB per page). [assumption: unmeasured]
- **Confidence:** high (was low, accepted risk). Resolved in L4: measured six families; Inter is 100.1 KB for upright + italic (over), Geist 60.4 KB.
- **Spike:** S2 declined; sizes were measured at the start of L4, before choosing fonts.

### F1a-D6: Two TypeScript configs
- **Decision:** `tsconfig.json` type-checks everything Node runs, with no emit (`erasableSyntaxOnly`, `verbatimModuleSyntax`, `allowImportingTsExtensions`, `module: nodenext`, `types: ["node"]`). `tsconfig.client.json` emits `src/client` as ES modules (`rewriteRelativeImportExtensions`, DOM libs).
- **Why it fits:** Node runs build scripts directly; only browser code needs compiling, and the two environments need different `lib`/`types`. [verified: S1]
- **Alternative:** a single config — can't have both Node and DOM globals without letting each leak into the other.
- **Would be wrong if:** TS 7 changes these flags in a minor release.
- **Confidence:** high
- **Spike:** S1 (passed)

### F1a-D7: Contrast and gamut math is hand-written
- **Decision:** OKLCH → linear sRGB → WCAG 2 relative luminance, no color library.
- **Why it fits:** about 40 lines of published formulas, tested against reference values; WCAG 2 contrast (not APCA) because the target is WCAG 2.2 AA.
- **Alternative:** a library such as `culori` — a dependency for a few formulas (D0).
- **Would be wrong if:** results disagree with reference tools on known colors.
- **Confidence:** high
- **Spike:** none

### F1a-D8: The raw-value check uses regex over declarations, not a CSS parser
- **Decision:** strip comments, strings and `url()`, then match raw lengths, colors and durations.
- **Why it fits:** all CSS is ours and the rules are narrow; tests cover the traps (`--space-2xl`, `content: "1px"`, breakpoints in `@media`).
- **Alternative:** a tokenizer or PostCSS — more code, or a dependency.
- **Would be wrong if:** false positives pile up; then move to a small tokenizer.
- **Confidence:** high
- **Spike:** none

### F1a-D9: Page modules default-export a function returning a list of pages
- **Decision:** each file in `src/pages/` exports `() => Page[] | Promise<Page[]>`; the build validates paths and fails on duplicates.
- **Why it fits:** one module per URL pattern (PRD project structure) means a module must be able to produce many pages (one per post), possibly after loading content asynchronously.
- **Alternative:** one module per page with a fixed `path` export — can't express `/blog/<slug>/`.
- **Would be wrong if:** pages need shared data across modules in a way a per-module function makes awkward.
- **Confidence:** high
- **Spike:** none

### F1a-D10: Absolute imports through Node subpath imports (`#src/*`, `#scripts/*`)
- **Decision:** `package.json` `"imports"` maps `#src/*` → `./src/*` and `#scripts/*` → `./scripts/*`; all Node-side code imports through them.
- **Why it fits:** the owner asked for absolute imports. Subpath imports are resolved by Node itself at runtime and read by TypeScript with `module: nodenext`, so one mapping serves both, with no tool. [verified: probe with TS 7.0.2 and Node 24.15 — runtime import works, `tsc` passes, a wrong path fails with TS2307]
- **Alternative:** tsconfig `paths` (`@/…`) — only TypeScript reads it; Node would fail at runtime without a bundler or loader rewriting imports.
- **Would be wrong if:** browser code needs the same prefixes: browsers don't read `package.json` (X5).
- **Confidence:** high
- **Spike:** none (probe above)

### F1a-D11: Tests live in `tests/`, mirroring the app's folders
- **Decision:** the test for `<path>/x.ts` is `tests/<path>/x.test.ts`.
- **Why it fits:** the owner asked for one test folder that's easy to navigate; mirroring means the location of a test is predictable from its source file. `node --test` finds `**/*.test.ts` anywhere by default [verified: runs 22 tests from `tests/`], and `tsconfig.json` already includes all `.ts` files.
- **Alternative:** tests next to their source files — easier to spot a missing test, but mixes test files into `src/` (and into `src/pages/`, which the build scans).
- **Would be wrong if:** source and test trees drift apart after renames; keep them moved together.
- **Confidence:** high
- **Spike:** none

### F1a-D12: The token demo page is public at `/design/`, outside the navigation
- **Decision:** `src/pages/design.ts` builds `/design/` in production too; it isn't linked from the nav.
- **Why it fits:** chosen by the owner. A visible design system shows craft on a portfolio, and the page gives the build checks (metadata, headings, raw values, contrast) a real page to run against.
- **Alternative:** a development-only page, excluded from production and the sitemap — hides the work and needs a dev/prod split in the build this early.
- **Would be wrong if:** visitors who find it are confused, or it becomes a maintenance burden; then exclude it from production.
- **Confidence:** high
- **Spike:** none

### F1a-D13: The build writes `site.css` from a `src/styles/stylesheet.ts` module
- **Decision:** like a page module, the stylesheet is a module whose default export returns text; the build writes it to `dist/site.css` when the module exists.
- **Why it fits:** the build stays generic (it knows nothing about tokens or CSS files) and testable with fixture projects, while the styles module owns the layer order and the file list.
- **Alternative:** the build reads `src/styles/*.css` itself — it would have to know the layer order and about generated CSS.
- **Would be wrong if:** more generated files arrive (sitemap, RSS) and one general "output module" convention would be simpler than one per file type; revisit in F1b/F11.
- **Confidence:** high
- **Spike:** none

### F1a-D14: A minimal shared `document()` layout now, instead of in F1b
- **Decision:** `src/layout/document.ts` renders `<html>` and `<head>` (title, description, stylesheet link) and wraps the page body.
- **Why it fits:** with two pages needing the same stylesheet link, copying the `<head>` would already be duplication; F1b extends this function rather than creating it.
- **Alternative:** duplicate the `<head>` in each page until F1b — two copies to keep in sync.
- **Would be wrong if:** F1b's layout needs a different shape (e.g. slots for header and footer); it's small enough to reshape.
- **Confidence:** high
- **Spike:** none

### F1a-D15: Palettes are generated from hue + chroma, with fixed lightness per role
- **Decision:** an accent is `{ hue, chroma }`; each role has a fixed OKLCH lightness per theme (e.g. light `text` 0.24, `accent` 0.50; dark `bg` 0.18, `accent` 0.76), and neutrals take the accent hue at low chroma.
- **Why it fits:** OKLCH lightness tracks perceived brightness across hues, so a fixed lightness gives near-identical contrast for every accent. Adding or swapping an accent is one line, and the contrast check proves it. [verified: all 8 palettes pass, 35 pairs each]
- **Alternative:** hand-pick every color of every palette — 8 × 21 values to keep consistent by eye.
- **Would be wrong if:** a chosen hue needs per-role tweaks the formula can't express; then allow per-accent overrides.
- **Confidence:** high
- **Spike:** none

### F1a-D16: Chroma is fitted into the sRGB gamut by the generator; the gamut check stays as a guard
- **Decision:** an accent's chroma is a target; each generated color's chroma is lowered to 98% of the most an sRGB screen can show at its lightness and hue (binary search). `checkPalette` still fails any out-of-gamut color.
- **Why it fits:** at low lightness, blues and teals run out of displayable chroma fast (the first run flagged 19 colors, e.g. blue at L 0.44 / C 0.15 needs a slightly negative red channel). Fitting keeps accents simple to define and every color honest about what screens show.
- **Alternative:** hand-tune chroma per role and hue until the check passes — tedious, and brittle when an accent changes.
- **Would be wrong if:** fitted colors look noticeably duller than intended; then pick a hue with more room at that lightness.
- **Confidence:** high
- **Spike:** none

### F1a-D17: Fallback metrics come from measurement, not the font's average-width field
- **Decision:** `size-adjust` = rendered width of an English paragraph in Geist ÷ the same in the local fallback, measured in Chrome (Arial 102.19%, Arial Italic 99.94%, Courier New 99.98%); ascent/descent overrides = Geist's hhea metrics (read by `scripts/font-metrics.ts`) ÷ `size-adjust`.
- **Why it fits:** the OS/2 `xAvgCharWidth` field is a rough average over all glyphs, not over real text; measuring a paragraph matches what visitors see. [verified: tuned fallback matches Geist's box exactly — 92px vs 92px (plain Arial 84px), code 547.0 vs 547.2px wide]
- **Alternative:** a metrics package such as `@capsizecss/metrics` — a dependency for three numbers (D0); or `xAvgCharWidth` alone — less accurate.
- **Would be wrong if:** visitors' fallback isn't Arial (Android uses Roboto); there the fallback is untuned, the same as without overrides.
- **Confidence:** high
- **Spike:** none

### F1a-D18: Preload only the upright Geist file
- **Decision:** `document()` adds `<link rel="preload" as="font" type="font/woff2" crossorigin>` for `geist-latin-wght-normal.woff2`.
- **Why it fits:** every page uses it; preloading starts the download with the HTML instead of after the CSS is parsed, which helps first paint. [memory: preload fetches font files early; fonts need `crossorigin` even on the same origin]
- **Alternative:** preload all three — forces italic and mono onto pages that never use them, against the budget.
- **Would be wrong if:** measured first paint doesn't improve (check with Lighthouse in F11).
- **Confidence:** high
- **Spike:** none

### F1a-D19: Geist + Geist Mono (Q1)
- **Decision:** Geist for `sans` (and so `heading` and `meta`), Geist Mono for `code`.
- **Why it fits:** chosen by the owner from six measured candidates. Upright + italic 60.4 KB, with mono 83.5 KB — well within both budgets; designed as a pair; less ubiquitous than Inter. [verified: Fontsource API and CDN, 2026-09-30; OFL-1.1]
- **Alternative:** Inter + JetBrains Mono (PRD default) — 100.1 KB for text, over the 100 KB budget; Atkinson Hyperlegible Next — strongest legibility, 112 KB with code.
- **Would be wrong if:** Geist's look doesn't fit the brand once real content lands; swapping is a `fonts.css` edit.
- **Confidence:** high
- **Spike:** none

### F1a-D20: Raw-value check scope is hand-written `.css` under `src/styles/`, excluding `fonts.css`
- **Decision:** `styleFiles()` lists every `*.css` in `src/styles/` except `fonts.css`; generated CSS (from `.ts` modules) is never scanned, because it *is* the token source or reads tokens exclusively by construction.
- **Why it fits:** the goal (R1) is stopping a *consumer* of tokens from writing a raw value; the generator's job is to emit the actual numbers once, in one place. Scanning its output would fight the design instead of enforcing it.
- **Alternative:** scan everything, with an allowlist of generated files growing forever — brittle as more generated CSS modules are added (colors-css, demo-css already exist).
- **Would be wrong if:** a hand-written `.css` file starts importing raw values through a build-time templating trick that isn't a `.ts` module; not currently possible in this build.
- **Confidence:** high
- **Spike:** none

## Edge cases
- 200% zoom and larger user font size: rem-based clamps (D4). At 200% zoom the demo page reflows with no horizontal scrolling; body sizes double exactly, fluid headings reach 164–182% and double by 250–300% zoom (X6, accepted).
- Out-of-gamut color: build fails (B4).
- Font slow or blocked: `font-display: swap` and a tuned fallback; measured in Chrome, the fallback takes exactly Geist's space (F1a-D17). Safari doesn't support `ascent-override` ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/ascent-override)), so Safari may see a small vertical shift on swap; accepted as progressive enhancement.
- Italic missing: a real italic file ships, so browsers never fake a slanted version.
- Reduced motion: duration tokens become `0s` under `prefers-reduced-motion`, in one place.
- Forced colors: focus styles use `outline`, not `box-shadow`.
- `html` helper inputs: `null`/`undefined`/booleans render nothing; numbers, arrays and nested fragments render without double escaping; quotes escaped for attributes; objects throw.
- Build output: `dist/` emptied first; output directory must be inside the project root, so a misconfiguration can't delete the repo; a page colliding with a `public/` file fails the build.
- Windows development: paths built with `node:path`, never hard-coded separators.
- About 10% of global browsers lack `light-dark()`: old versions outside the support target; no fallback.

## Spikes

### S1: TypeScript 7 config (2026-09-28)
- **Question:** with TS 7.0.2, does a no-emit config type-check a `.ts` file importing `./x.ts`, while a client config emits a browser module whose import is rewritten to `./x.js`?
- **Pass if:** both commands exit 0, the emitted file imports `./x.js`, and it loads in Node as ESM.
- **Fail if:** any flag is rejected, or the emitted import still ends in `.ts`.
- **Result:** passed. Type-check exit 0; Node ran the script directly; the client build emitted `import { greet } from "./helper.js"`, which loaded as ESM. `erasableSyntaxOnly` rejected an `enum` (TS1294), and `verbatimModuleSyntax` caught a type imported without `type` (TS1484), which Node would otherwise crash on at runtime. Type-checking `node:fs` imports needed `@types/node`, because TS 7 defaults to `types: []`.
- **Verdict:** D6 stands, now high confidence, with `verbatimModuleSyntax` added. `@types/node` added as a dev dependency (X1).

### S2: Font file sizes vs budget
- **Declined** (2026-09-28); D5 is accepted risk. Sizes are measured at the start of L4.

## Original checklist
Frozen at approval. Never edited afterwards; only ticked.

**L1 — Foundations**
- [x] O1. `typescript@7` and `@types/node@24` added as dev dependencies; `engines` set to `>=24.12`; PRD D0, D6 and R-7 updated, with a change-log row.
- [ ] O2. `tsconfig.json` (no emit, all `.ts`) and `tsconfig.client.json` (browser emit) both pass `pnpm typecheck`.
- [x] O3. The `html` helper escapes `& < > " '` in interpolated values and renders `null`/`undefined`/`false` as nothing. It handles numbers, arrays and nested fragments without double escaping, and `raw()` bypasses escaping. All unit tested.
- [x] O4. `pnpm build` empties `dist/`, renders page modules to `dist/<path>/index.html` and copies `public/`.
- [x] O5. Feature doc `docs/features/F1a-design-tokens-and-fonts.md` created with this record.

**L2 — Non-color tokens and base typography**
- [x] O6. `tokens.ts` holds the type (size, leading, tracking), spacing, radius, shadow and motion tokens from §7; the build generates `tokens.css`, with comments pointing back to the source.
- [x] O7. Fluid type uses rem + vw `clamp()` between 320 px and 1280 px, with unit tests on both endpoints.
- [x] O8. Cascade layers are declared once, and CSS is concatenated into one `site.css` in layer order.
- [x] O9. Base typography: body leading 1.5, headings 1.2, weights 400/700 only, prose capped at 65ch, everything left-aligned.
- [x] O10. Durations become `0s` under `prefers-reduced-motion`; focus styles use `outline`, so they survive forced-colors mode.
- [x] O11. The demo page renders every non-color token, generated from the token data.

**L3 — Color and contrast check**
- [x] O12. OKLCH palettes for every accent × theme (hues chosen with the owner, Q2), with neutrals tinted by the accent and semantic token names as in §7.3.
- [x] O13. Theme switches via `color-scheme` + `light-dark()`, accent via `data-accent`.
- [x] O14. The contrast check requires every pair in every palette to meet 4.5:1 (text) or 3:1 (borders, focus, non-text). A failure names the palette, the pair and the ratio. The math is tested against known reference values.
- [x] O15. Any color outside the sRGB gamut fails the build.
- [x] O16. The demo page shows every palette side by side, with no JavaScript.

**L4 — Fonts**
- [x] O17. File sizes measured against the budget before choosing (Q1); the chosen Latin variable `.woff2` files are self-hosted with their licenses.
- [x] O18. `fonts.css` has `@font-face` rules with `font-display: swap` and role variables. Swapping a family and switching `meta` to mono are each a one-line edit, both demonstrated.
- [x] O19. Metric-tuned fallback fonts (`size-adjust`, and the override descriptors where supported).

**L5 — Raw-value check**
- [x] O20. The check flags raw lengths, colors and durations outside the token source. It allows the allowlist, and breakpoints only inside `@media`/`@container` conditions, and ignores comments, strings, `url()` and custom property names. Tests cover each case.
- [x] O21. The production build fails on any failed check (raw value, contrast, gamut).

**Close-out**
- [x] O22. All PRD F1a acceptance criteria met; Practical UI checklist and a keyboard / 200% zoom pass run on the demo page; learnings added.
  - Practical UI checklist: done (X16 fixed, X17 deferred).
  - Keyboard walkthrough: done. 9 focusable links on `/design/`, all reachable, tab order matches visual order, no positive `tabindex`; a real `:focus-visible` outline confirmed (not a browser default, not visible on mouse click) — but 8 of the 9 links share indistinguishable accessible text (X20, deferred).
  - 200% zoom: done, formally. Rendered `/design/` at the 200%-zoom-equivalent viewport: reflows to one column, no clipping or overlap, `scrollWidth === clientWidth` (no real horizontal overflow). (L2's earlier check was the token *math*; this is the *rendered page*.)
  - Forced-colors mode: done, by code inspection (can't fully emulate Windows' OS-level forced-colors headlessly). Every colored region (`demo-box`, `demo-button`, `demo-button-outline`, `demo-swatch`) has an explicit `border`, which forced-colors mode preserves once it overrides backgrounds; no `forced-color-adjust: none` anywhere, so the browser is free to apply its own substitutions everywhere (the recommended default).
  - Reduced motion: mechanism verified in L2 (durations zero out); nothing on the built pages actually transitions yet, so there's nothing to visibly re-check until a real animation exists (X21).
  - Screen reader: NVDA itself needs a person at the keyboard (X22, deferred). Found and fixed one real gap by inspecting markup directly: decorative elements (empty color swatches, spacing bars) had no `aria-hidden` (X19, fixed).
  - Learnings added.

## Discovered checklist
Anything unplanned. Never moved into the original checklist.
- [x] X1. `@types/node` needed to type-check build scripts — **Trigger:** S1: `tsc` couldn't resolve `node:fs` (TS 7 defaults to `types: []`) — **Blocking** (resolved: approved and added in L1)
- [ ] X2. `tsc -p tsconfig.client.json` fails with TS18003 ("No inputs were found") while `src/client/` is empty, so the client config can't run in `pnpm typecheck` until the first browser script exists (F3) — **Trigger:** L1 probe of TS 7 with an empty include — **Deferrable**
- [x] X3. Absolute imports via Node subpath imports (`#src/…`, `#scripts/…`) instead of relative paths — **Trigger:** owner request after L1 was built (F1a-D10) — **Deferrable** (done in L1)
- [x] X4. All tests moved to `tests/`, mirroring the app's folders; the build no longer needs to skip test files in `src/pages/` — **Trigger:** owner request after L1 was built (F1a-D11) — **Deferrable** (done in L1)
- [ ] X5. Browser scripts can't use `#src/…` (browsers don't read `package.json`, and `tsc` rewrites only relative `.ts` imports); choose relative imports or an import map when the first browser script lands — **Trigger:** X3 — **Deferrable** (F3)
- [x] X6. Fluid headings grow less than 2× at exactly 200% zoom on wide windows (`text-4xl`: 164% at a 1280px window), because zoom shrinks the CSS viewport and the vw part with it. They reach 200% by 250–300% zoom; body sizes (`sm`, `base`, `prose`) double exactly. Tests enforce that 200% is reachable within the browser's 500% zoom (max ≤ 2.5 × min) — **Trigger:** L2 zoom model check of D4 — **Deferrable** (accepted by the owner, 2026-09-30)
- [x] X7. Pages link `/site.css`, which doesn't load when `dist/*.html` is opened as a file; previewing needs a local server before the F1b dev server exists — **Trigger:** L2 screenshots needed a throwaway server — **Deferrable** (closed in L5: `pnpm preview`, a plain `node:http` static file server, no dependency, no rebuild/reload — F1b's dev server replaces it)
- [x] X8. Shared `document()` layout started early (F1a-D14) — **Trigger:** a second page needed the same `<head>` — **Deferrable** (done in L2)
- [x] X9. O9 says headings use line height 1.2; h3 (`text-xl`) uses 1.3 and h4 (`text-lg`) 1.4, because those sizes also set lead paragraphs and the PRD says line height shrinks as size grows. h1/h2 use 1.2, the hero 1.1 — **Trigger:** L2 self-check against the frozen checklist — **Deferrable** (kept by the owner, 2026-09-30; O9 ticked on that basis)
- [x] X10. The blue accent (hue 255) sits close to the `info` status color (hue 245); harmless because status always has a label, but if blue is chosen as default, `info` could move toward cyan — **Trigger:** L3 demo page screenshots — **Deferrable** (moot: violet is the default, 2026-09-30; still worth a look if blue is ever picked as default)
- [x] X11. Inherited `color` is resolved on the parent, so a panel that changes `color-scheme` or `data-accent` still inherits the page's text color; demo panels restate `color` and `background` — **Trigger:** L3 demo panels — **Deferrable** (done in L3; noted for F3 components)
- [x] X12. `scripts/font-metrics.ts` added to read vertical metrics from WOFF2 files (Brotli-decompressed table stream), needed to compute the fallback overrides without a metrics dependency — **Trigger:** L4 fallback tuning — **Deferrable** (done in L4)
- [x] X13. Code blocks set `font-variant-ligatures: none`, so `=>` isn't drawn as one arrow glyph — **Trigger:** L4 font specimen showed JetBrains Mono's ligatures — **Deferrable** (done in L4)
- [x] X14. The raw-value check (L5) must exempt `fonts.css`: `@font-face` descriptors (`size-adjust: 102.19%`, `font-weight: 100 900`) are font metadata, not design values — **Trigger:** L4 `fonts.css` — **Deferrable** (done in L5: `styleFiles()` excludes it by name)
- [ ] X15. The raw-value check fails the build the same way in development and production; the PRD's planned split (dev reports without blocking, production blocks) needs a dev-server "mode" that doesn't exist before F1b — **Trigger:** L5, writing `build.ts`'s check — **Deferrable** (F1b, alongside the dev server)
- [x] X16. Neither page had a page-edge gutter: `<main>` sat flush against the viewport edge with zero horizontal padding, failing PRD §7.2's own gutter rule (`s` mobile, `m` at `md`/768px) — **Trigger:** O22 Practical UI review (screenshot showed text touching the edge; confirmed in code, not just the screenshot) — **Blocking** (fixed in L5: a temporary `main { padding-inline }` rule in `base.css`, until F1b's container/section primitives replace it)
- [ ] X17. The `/design/` demo page's button samples (`<span class="demo-button">`) and status swatches show no interactive states and no icon, though PRD §7.4 (button states) and §7.3 (status = icon + text + color) call for both — **Trigger:** O22 Practical UI review — **Deferrable** (real buttons land in F1b/F4; status icons in F6/F11 — fixing properly now means building components this layer doesn't need yet)
- [x] X18. My first test for `pnpm preview`'s path-traversal guard used a literal `/../secret.txt`, which `URL`'s own constructor normalizes away before the server code ever runs — so the test passed even after I deleted the guard entirely, proving nothing. A percent-encoded `..%2f..%2f` survives URL parsing and is the real attack shape — **Trigger:** mutation-testing the guard (deleting it and expecting a test failure) found the false pass — **Blocking** (fixed: test rewritten to use the actual bypass vector, confirmed it now fails without the guard)
- [x] X19. The demo page's decorative-only elements (empty color swatches, empty spacing bars) had no `aria-hidden="true"`, though PRD R12 says decorative content is hidden from screen readers — **Trigger:** F1a close-out accessibility pass (checked markup, not just visuals) — **Blocking** (fixed: both given `aria-hidden="true"`, with a regression test)
- [ ] X20. 8 of the 9 links on `/design/` (one per accent × theme panel) share the exact same text, "an underlined link" — a screen reader's "list of links" navigation can't tell them apart, and PRD's own copywriting rule calls for descriptive link text — **Trigger:** F1a close-out keyboard walkthrough (inspected each focusable element's accessible name, not just that focus reached it) — **Deferrable**: fixing it well means giving each panel's link a distinguishing accessible name (e.g. `aria-label="Sample link, ${accent} ${theme}"`) without visually repeating the accent/theme text already shown right above it; worth doing when the demo page gets a next pass, not blocking F1a
- [ ] X21. No CSS anywhere currently uses `transition` or `animation`, so `prefers-reduced-motion`'s zeroing of `--duration-*` (tested in L2) has nothing to actually govern yet on the built pages — **Trigger:** F1a close-out reduced-motion check — **Deferrable**: re-verify once a real transition exists (F3's theme toggle is the likely first)
- [ ] X22. A full screen reader pass (e.g. NVDA on Windows, per PRD §6's Accessibility row) needs a person operating the screen reader; it can't be automated headlessly. Static ARIA/landmark/heading checks were verified instead (aria-labelledby present on every section, heading order correct, decorative content hidden) — **Trigger:** F1a close-out — **Deferrable**: run a real NVDA pass at a natural checkpoint (F1b close-out, or F11's full audit) rather than blocking F1a on it alone

## Layer log

| Layer | PR | Verified by | Checklist items ticked |
|---|---|---|---|
| L1 | #1 | `pnpm typecheck` exit 0; `pnpm test` 22/22 pass (after X3/X4); `pnpm build` writes `dist/index.html`; mutation check (escaping removed → 5 tests fail) | O1, O3, O4, O5, X1, X3, X4 |
| L2 | — | `pnpm typecheck` exit 0; `pnpm test` 48/48 pass (clamp math and endpoints, every token declared and shown, every block inside a declared layer, zoom reachability, heading order, no inline styles); `pnpm build` writes 2 pages + 8.3 KB `site.css`; headless Chrome screenshots at 320px, 375px, 1280px and 200% zoom (no horizontal scrolling; 4 spacing/visual fixes after the first round) | O6, O7, O8, O9, O10, O11, X6, X8, X9 |
| L3 | — | `pnpm typecheck` exit 0; `pnpm test` 69/69 pass (conversion against sRGB primaries and the #767676 = 4.54:1 WCAG reference; all 8 palettes pass 35 pairs each; failing and out-of-gamut palettes are reported; a failing check throws, stopping the build); `site.css` 19.8 KB raw, 4.1 KB gzip; headless Chrome: color section at 1280px and 375px, and the whole page with the OS preferring light vs dark (page flips, panels keep their own theme) | O13, O14, O15, O16, X11 (O12 pending Q2) |
| L4 | #4 | `pnpm typecheck` exit 0; `pnpm test` 76/76 pass (font files and budgets, license, only `fonts.css` names families, one-line meta switch, WOFF2 metrics read); sizes measured for six families before choosing; Chrome measurement: tuned fallback matches Geist's text box exactly (92 vs 92px; plain Arial 84px); Chrome network log: `/` downloads 1 font file (29.4 KB), `/design/` 2 (52.5 KB), italic never fetched when unused; both one-line switches demonstrated by temporary edit + rebuild; screenshot of the demo page in Geist | O17, O18, O19, X12, X13 |
| L3 follow-up | #5 | `pnpm typecheck` exit 0; `pnpm test` 76/76 pass; `pnpm build` writes `:root, [data-accent="violet"]` as the default block in `site.css` | O12, X10 |
| L5 | — | `pnpm typecheck` exit 0; `pnpm test` 96/96 pass (21 hand-probed cases for every exemption and trap: custom-property values, hairline borders, breakpoints in/out of `@media`, `color-mix()`, comments/strings/`url()`, real generated `:root, [data-accent]` shape); mutation check on each of the 3 exemptions (each removal fails 1–3 tests); end-to-end: injecting `color: #ff00ff` into `src/styles/base.css` fails `pnpm build` naming file, line, value and fix, reverting restores a clean build; the real `src/styles/*.css` passes with zero violations | O20, O21, X14 |
| Practical UI review | — | Walked the checklist against real screenshots and code (not memory): home page and `/design/` at 1280px and 320px, plus a squint-test screenshot; verified one apparent 320px overflow against the real DOM (`scrollWidth === clientWidth`, ruled out as a screenshot-capture artifact, not reported). Confirmed via cascade-layer order that `.demo`'s own padding still wins over the new generic `main` rule. Found and fixed X16 (no page-edge gutter); found and deferred X17 (demo interactive states / status icons) | X16 |
| Preview server | — | `pnpm typecheck` exit 0; `pnpm test` 103/103 pass (root/nested/CSS/font content types, 404, decoded paths, path-traversal guard against the real bypass vector); mutation check on the traversal guard: my first test used a literal `../` that `URL` itself normalizes away and passed even with the guard deleted (X18, caught and fixed — rewrote with a percent-encoded `..%2f..%2f` string, which now correctly fails without the guard); manual smoke test with `curl` against a real `pnpm build` output: `/`, `/design/`, `/site.css`, a font file, a missing path, and the encoded traversal all responded correctly | X7, X18 |
| F1a close-out (accessibility) | — | `pnpm typecheck` exit 0; `pnpm test` 104/104 pass; keyboard walkthrough script (real `.focus()` + `document.activeElement` check on every focusable element, both pages); 200% zoom on the rendered page (screenshot + `scrollWidth === clientWidth` measurement, not just token math); forced-colors readiness by code inspection (every colored region has an explicit border; no `forced-color-adjust: none` anywhere); decorative-element `aria-hidden` gap found and fixed, with a mutation-tested regression test | O22, X19 |

## How it works

### Build (L1)
`pnpm build` runs `scripts/build.ts` directly with Node; Node strips the types at
runtime, so there's no compile step.

1. **Clean.** The script deletes `dist/` and recreates it, so files from earlier
   builds can't linger. Before deleting, it checks that the output directory is
   inside the project root; a wrong setting can never delete the repo.
2. **Copy `public/`.** Fonts, images and favicons are copied into `dist/` unchanged.
3. **Load pages.** Every `.ts` file in `src/pages/` is imported,
   in alphabetical order so builds are repeatable. Each must default-export a
   function returning a list of `{ path, body }` objects (`src/lib/page.ts`).
   One module can return many pages, which is how `/blog/<slug>/` will work.
4. **Write pages.** `outputFile()` turns a URL path into a file (`/about/` →
   `about/index.html`) and rejects paths that break the URL scheme (uppercase,
   underscores, no trailing slash, `..`). Duplicate paths fail the build, naming
   both modules. Files are written with the `wx` flag, which refuses to overwrite,
   so a page that collides with a copied `public/` file also fails the build.

`build()` is exported so tests can run it against throwaway fixture projects in
the system temp folder (`tests/scripts/build.test.ts`).

### Imports and tests (L1)
- **Absolute imports.** `package.json` has an `"imports"` map: `#src/*` →
  `./src/*` and `#scripts/*` → `./scripts/*`. When Node sees
  `import … from "#src/lib/html.ts"`, it looks the prefix up in that map and
  loads `./src/lib/html.ts` from the project root. TypeScript reads the same map
  for type-checking, so a wrong path fails `pnpm typecheck`.
- **Tests.** Everything under `tests/` mirrors the app: `tests/src/lib/` tests
  `src/lib/`, `tests/scripts/` tests `scripts/`. `pnpm test` runs `node --test`,
  which finds every `*.test.ts` file by itself. The build tests create fixture
  projects in the temp folder; those fixtures sit outside this package, so they
  can't use `#src/…` and instead import `html.ts` by the file URL that
  `import.meta.resolve("#src/lib/html.ts")` returns.

### Templates (L1)
`src/lib/html.ts` provides `html`, a tagged template. The literal parts are
markup written in our source, so they're trusted. Every `${value}` is escaped
(`& < > " '` become entities), which stops text from content or config from
turning into HTML or scripts (XSS). The result is a `SafeHtml` object; putting a
`SafeHtml` inside another template inserts it as-is, so fragments compose without
double escaping. `raw()` wraps a string as `SafeHtml` on purpose, for trusted
HTML such as Markdown rendered from our own repo. `null`, `undefined` and
booleans render nothing, so `${isOpen && html`…`}` works; arrays are joined, so
`${items.map(…)}` works. Any other object throws instead of printing
`[object Object]`.

### TypeScript (L1)
Two configs, because Node code and browser code live in different worlds:
- `tsconfig.json` checks everything Node runs (build scripts, templates, tests)
  and never emits. `erasableSyntaxOnly` rejects syntax Node can't strip (`enum`,
  parameter properties); `verbatimModuleSyntax` forces `import type` for types,
  which Node would otherwise try to import at runtime and crash on.
- `tsconfig.client.json` compiles `src/client/` (browser scripts, from F3 on) to
  ES modules in `dist/client/`, rewriting `./x.ts` imports to `./x.js`.

### Stylesheet (L2)
`pnpm build` also writes `dist/site.css`, in four steps:

1. **Data.** `src/styles/tokens.ts` lists every token as plain objects, e.g.
   `{ name: "xl", mobile: 23, desktop: 28, leading: 1.3, … }`.
2. **Generate.** `tokens-css.ts` turns each entry into custom properties. A fixed
   size becomes rem (`16px` → `1rem`). A size that changes becomes a `clamp()`
   from `fluid.ts`, which finds the straight line through (320px, mobile size)
   and (1280px, desktop size) and writes it as `rem + vw`. A
   `prefers-reduced-motion` block sets every duration to `0s`.
3. **Assemble.** `stylesheet.ts` declares the layer order once
   (`@layer reset, tokens, base, layout, components, utilities;`) and joins, in
   order: `reset.css`, the generated tokens, `fonts.css` (font role variables),
   `base.css` (element defaults) and the demo page CSS. Each piece wraps itself in
   its `@layer`. A test fails if any CSS sits outside a declared layer, because
   unlayered CSS would beat every layer.
4. **Write.** The build imports `src/styles/stylesheet.ts`, calls its default
   export and writes the text to `dist/site.css`, refusing to overwrite a
   `public/` file of the same name.

Pages get the stylesheet through `src/layout/document.ts`, the shared HTML
document, which puts `<link rel="stylesheet" href="/site.css">` in every
`<head>`.

### Demo page (L2)
`src/pages/design.ts` builds `/design/` by looping over the token arrays: one
sample and one label per token. Its classes (`demo-text-xl`, `demo-space-m`, …)
are generated from the same arrays in `demo-css.ts`, so the page needs no inline
styles. Tests check that every token appears on the page and every class it uses
has a rule.

### Colors (L3)
1. **Palette.** `palette.ts` defines each accent as `{ hue, chroma }` and, per
   theme, a lightness for every role. `buildPalette(accent, theme)` returns 21
   OKLCH colors: neutrals at the accent hue with very low chroma, accent steps at
   the accent's chroma, status colors at fixed hues. Every accent step and status
   color goes through `fitToGamut()` (`color.ts`), which lowers chroma to what an
   sRGB screen can show at that lightness.
2. **Check.** `checkPalette()` converts each color to linear sRGB, rejects any
   channel outside 0–1 (out of gamut), then computes WCAG contrast
   (`(lighter + 0.05) / (darker + 0.05)` on relative luminance) for every pair in
   `REQUIREMENTS`. `checkPalettes()` runs it for all accents × both themes.
3. **CSS.** `colorsCss()` throws with the full list of failures if there are
   any; `stylesheet()` calls it, so a failure stops `pnpm build`. Otherwise it
   writes `:root { color-scheme: light dark; }` and one block per accent:
   `--color-text: light-dark(oklch(24% …), oklch(94% …));` and so on. The first
   accent's block also matches `:root`, making it the default.
4. **Use.** `base.css` sets `body` text and background, links and the focus
   ring from `--color-*`. Shadows read `--color-shadow`, transparent in dark.

Why the demo panels restate `color` and `background`: an inherited `color` is
already resolved on the parent, with the parent's theme and accent. A panel
that switches `color-scheme` or `data-accent` has to re-read the variables
itself, or it would show the page's text color on its own background.

### Fonts (L4)
1. **Files.** `public/fonts/` holds three WOFF2 files (Latin subset, variable
   weight) and the OFL license. The build copies `public/` to `dist/`, so they're
   served at `/fonts/…`.
2. **Declare.** `fonts.css` has one `@font-face` per file: family (`Geist` or
   `Geist Mono`), style (normal or italic), `font-weight: 100 900` (the variable
   range), `font-display: swap`, and the Latin `unicode-range`. Declaring a face
   downloads nothing; the browser fetches a file only when text on the page needs
   that family and style.
3. **Fallbacks.** Three more `@font-face` rules define `Geist Fallback` (from
   local Arial / Arial Italic) and `Geist Mono Fallback` (from Courier New),
   resized with `size-adjust` and given Geist's line metrics with
   `ascent-override` / `descent-override`. The numbers come from
   `scripts/font-metrics.ts` (Geist's hhea ascender 1.005em, descender 0.295em)
   and a width measurement in Chrome (F1a-D17).
4. **Roles.** `--font-sans: "Geist", "Geist Fallback", system-ui, sans-serif`,
   and `--font-code` likewise; `--font-heading` and `--font-meta` point at
   `--font-sans`. The browser walks the list: Geist if loaded, else the tuned
   fallback, else the system font.
5. **Preload.** `document()` puts a preload link for the upright file in every
   `<head>`, so that download starts alongside the CSS instead of after it.

`scripts/font-metrics.ts` reads a WOFF2 file without a font library: it parses
the table directory (tags and lengths, with WOFF2's variable-length integers),
Brotli-decompresses the table stream with `node:zlib`, and reads `unitsPerEm`
from `head`, ascender/descender/line gap from `hhea`, and average width from
`OS/2`. Those three tables are never transformed in WOFF2, so they can be read
directly.

### Raw-value check (L5)
1. **Clean.** `stripCommentsAndStrings()` blanks out `/* … */` comments and
   `"…"`/`'…'` string literals (keeping their length, so line numbers still
   line up), and `stripUrls()` blanks the inside of `url(...)`. This stops the
   check from flagging a fake unit inside `content: "1px"` or a length that
   happens to appear in a font file's name.
2. **Scan.** Five regexes look for the shapes that always mean a raw design
   value: a number with a length unit (`px`, `em`, `rem`, `vw`, …), a number
   with `ms`/`s`, a hex color, a color function (`rgb()`, `oklch()`, …), and
   `color-mix()`.
3. **Exempt.** Before reporting a match, the check asks four questions: is this
   inside a `--custom-property: value` declaration (that value *is* the token,
   defined once)? Is it in the property *name*, not the value? Is it exactly
   `0`, `100%`, `1fr` or `65ch` (never a design decision, D2)? Is it `1px` on a
   `border*` property (the one hairline exception), or a listed breakpoint
   width sitting inside an `@media`/`@container` condition (the other
   exception, §7.2)? Only what's left is a real violation.
4. **Report.** Each violation carries the file, line, the exact matched text,
   and which token category to use instead, e.g.
   `base.css:102 "#ff00ff" — raw hex color; use a var(--color-*) token`.
5. **Enforce.** `build.ts` calls `checkRawValues("src/styles")` right before
   writing `site.css`. Any violation throws with the full list, so `pnpm build`
   exits non-zero and writes nothing.

`styleFiles()` lists every `.css` file in `src/styles/` except `fonts.css`
(font metadata, not design values, X14); it never looks at the `.ts` files that
*generate* CSS, since those are the token source itself (F1a-D20).

### Preview server (closing X7)
`pnpm preview` runs `scripts/preview.ts`, an `http.createServer` with one
handler: turn the request URL into a file under `dist/`, read it, and send it
back with a content type guessed from its extension. A URL ending in `/`
serves that folder's `index.html`, matching how the build names files
(`outputFile()` in `page.ts`). A path that resolves outside `dist/` (an
encoded `../` escape) is refused before any file is read, and a missing file
becomes a plain 404. It has no other behavior: no rebuilding, no file
watching, no directory listing.

## Wrap-up

**Original checklist:** 21 of 22 items ticked. **O2 stays open**, not by
oversight: `tsconfig.client.json` has nothing to type-check until `src/client/`
gets its first file, which is F3 (the theme toggle). Running it now just
errors (TS18003, X2). It's re-attempted the moment F3 adds real browser code.

**Discovered checklist:** 22 items found, 15 resolved, 7 deferred with reasons:

| Deferred | Why, and when it's revisited |
|---|---|
| X2 | `tsconfig.client.json` has no files yet — F3 |
| X5 | Browser scripts can't use `#src/…` (browsers don't read `package.json`) — F3, when the first script needs an import strategy |
| X15 | The raw-value check doesn't yet distinguish dev from production — F1b, alongside the dev server |
| X17 | Demo button/status samples show no interactive states or icon — real components are F1b/F4 (buttons) and F6/F11 (status icons) |
| X20 | 8 of 9 demo links share identical text — worth a distinguishing `aria-label` next time the demo page is touched, not urgent enough to block F1a |
| X21 | Nothing on the built pages transitions yet, so reduced motion has nothing to visibly govern — re-check once F3 adds real motion |
| X22 | A real NVDA pass needs a person at the keyboard — do it at F1b's close-out or F11's full audit |

**Accepted risks:** none remain at high uncertainty. F1a-D5 (font sizes vs
budget) was resolved in L4 with real measurements; F1a-D17–D19 (fallback
metrics, preload scope, font choice) are all high confidence, verified against
rendered output, not just reasoned about.

**What F1a shipped:** a build that turns TypeScript into static HTML and one
CSS file; every design value as a token (type, spacing, radius, shadow,
motion, 4 accent × 2 theme color palettes); self-hosted fonts with no layout
shift on load; a build-time check that a raw value can't sneak past the token
system; a `/design/` page showing all of it; and `pnpm preview` to look at any
of it locally. Next: **F1b, the layout shell** (header, nav, footer, the
container/section primitives X16's temporary gutter fix anticipates, and the
dev server that closes X15).
