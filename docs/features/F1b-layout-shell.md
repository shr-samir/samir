# F1b — Layout shell

| | |
|---|---|
| **PRD** | [§8 F1b](../PRD.md#8-feature-list) |
| **Status** | planned |
| **Checklist frozen** | 2026-09-30 |

Learnings from this feature go in [`docs/learnings.md`](../learnings.md), tagged `[F1b]`.

## Understanding
Plain-language summary for the owner, updated every layer. Platform concepts
that apply beyond this feature go in [`fundamentals.md`](../fundamentals.md);
this section covers what *this* feature is doing and why.

### TL;DR
F1b builds the shell every page sits inside: complete `<head>` metadata, a
header with navigation and a mobile menu, a footer, a skip link, button/link
styles at all three weights, real layout primitives (replacing F1a's
temporary padding fix), a static 404 page, and the dev server. By the end,
every page looks and behaves like part of one site, not a loose collection of
pages, and `pnpm dev` gives a live-reloading way to work on it.

| Layer | In one line | Status |
|---|---|---|
| L1 Layout primitives | Container/section/stack/grid; components size to their own container, not the screen | in review |
| L2 Head metadata | Every page's `<head>` is complete, unique, and build-checked | in review |
| L3 Header, nav, menu | Site nav and a no-JS mobile menu | planned |
| L4 Footer, buttons, 404 | Remaining chrome pieces and the 404 page | planned |
| L5 Dev server | `pnpm dev`: rebuild on change, reload the browser | planned |

### L1 — Layout primitives

**Essence.** Two related ideas. First, container/section/stack/grid as
tokens-only CSS primitives, replacing the temporary `main { padding-inline }`
rule F1a added as a stopgap. Second — and easy to miss — **components should
size against their own container, not the browser window.** `vw`/`vh` always
mean the full screen, however deeply an element is nested; if a component's
real parent is narrower than the screen (behind a sidebar, inside a capped
container), a `vw`-sized child inside it is still sized off the *screen*, not
its actual available space. Container queries (`container-type: inline-size`
on the wrapper, `@container` on the child) fix this: a component reacts to
"how much space do I actually have," which is what "responsive" should mean
for anything that isn't the page shell itself.

**What changed**
- `src/styles/layout.css`: container widths, section spacing, stack, grid —
  tokens only; the page shell (`body`/`main`/`header`/`footer` flex layout,
  `container-type: inline-size` on `main`).
- `src/styles/base.css`: F1a's temporary `main { padding-inline }` rule removed.
- `src/styles/stylesheet.ts`: `layout.css` wired in, after `base.css`.
- `src/pages/index.ts`: `<main>` now uses `class="container"`.
- `scripts/check-raw-values.ts`: `100vh` added to the D2 allowlist (a
  structural value — "the whole viewport" — not a design decision, the same
  idea as the existing `100%`).

**Questions asked**
- *What about shared components like header/footer — does the changeable
  middle section take the remaining space, and is "remaining space" its own
  viewport?* Nothing takes remaining space automatically; `vw`/`vh` never mean
  "what's left after the header." The shell uses flex or grid
  (`main { flex: 1 }`, or a grid `1fr` row) so the browser computes the
  leftover space itself — no hardcoded header height, no `calc(100vh - …)`.
- *Should children of `main` believe their parent is the viewport?* Yes, and
  that's what container queries are for (F1b-D4, below) — a component queries
  its own container's width, never the window's.

**Questions you might have**
- *Why not `calc(100vh - <header height>)`?* It hardcodes a number that
  breaks the moment the header wraps to two lines, or a token changes size —
  exactly the kind of raw value F1a's raw-value check (L5) would flag. Flex/
  grid never need the number; the browser measures the header every time.
- *Does every page need a fixed-height, non-scrolling middle section?*
  No — nothing in the PRD asks for an app-shell layout. Pages here are
  ordinary, taller-than-one-screen, scrolling content, like the reference
  site (jasoncameron.dev). The flex/grid shell just avoids hardcoded numbers;
  it isn't building a fixed-viewport app.
- *Is `@container` safe to use across browsers?* Yes — [verified: caniuse,
  2026-09-30] 94.87% global usage, full support in Chrome/Edge/Safari/
  Firefox's last 2 versions. This upgrades F1a's D2, which had flagged
  container queries as `[memory]`, to `[verified]`.
- *Why does `main` need an explicit `width: 100%` on top of `flex: 1`?* Found
  the hard way (below) — `container-type: inline-size` alone, on a `flex: 1`
  child of a column-direction flex parent, can let `main` collapse to almost
  nothing instead of filling the row.

**A real bug, and how it was actually found**

`main`'s content briefly rendered as one character per line — an extreme,
near-zero width — the first time all of L1's pieces were combined and
screenshotted. Several early theories (the flexbox min-width default, `@layer`
itself, undefined CSS variables, `text-wrap: balance` interacting with a fluid
`clamp()` font size) each seemed plausible and were tested individually, and
every one of them **passed** in isolation — none reproduced the bug. That was
the useful signal: a hand-typed "minimal reproduction" that doesn't reproduce
anything means the minimal case is missing the actual trigger, not that there
is no trigger.

The fix was to stop guessing and bisect the *real* generated `dist/site.css`
directly — extracting its exact top-level `@layer` blocks with the same
brace-tracking approach the raw-value checker uses, so every test file was
guaranteed syntactically identical to the real output, then removing pieces
one at a time until the smallest file that still reproduced the bug was found.
That file, diffed line-by-line against a hand-typed version that didn't
reproduce it, showed the one real difference every earlier attempt had missed:
**`container-type: inline-size` on `main`.** Removed from the known-bad file
alone, the bug disappeared completely; added back alone, it reappeared. That
two-way, single-variable test is what actually proved the cause, not any of
the earlier theories, however reasonable they sounded.

Root mechanism: `container-type: inline-size` makes `main` a size-containment
context — its own content can no longer influence its size. Combined with
`flex: 1` inside a `flex-direction: column` parent (which only governs
`main`'s *height*, not its width — that's ordinarily `align-items: stretch`'s
job) and `min-width: 0` (removing the one remaining content-based minimum),
nothing was left constraining `main`'s width at all. An explicit
`width: 100%` restores it directly, rather than relying on inherited stretch
behavior that turned out not to survive the combination.

### L2 — Head metadata

**Essence.** Every page now carries complete, unique SEO and link-preview
metadata (title, description, canonical URL, OG/Twitter tags, favicons,
`theme-color`), through one shared `document()` contract that makes a
missing field a type error, and a build check that catches a missing or
duplicated value in the *rendered* output — so a bug in `document()` itself
can't slip past the check either. A minimal `site.config.ts` was added a
layer earlier than planned (originally L3), since canonical URLs genuinely
can't be built without a site URL to anchor them to.

**What changed**
- `site.config.ts`: name, `url` (placeholder `https://example.com` per Q8;
  the production build failing on that placeholder is F12's job, not F1b's),
  description, nav links — moved up from L3, see below.
- `src/layout/document.ts`: rewritten. `DocumentOptions` now requires `path`
  and `lang` alongside title/description; generates canonical URL, OG tags,
  Twitter card tags, favicon links and a computed `theme-color`.
- `scripts/check-metadata.ts`: extracts title/description/canonical from
  rendered HTML and reports every missing or duplicated one, naming the page
  and (for duplicates) the earlier page using the same value.
- `scripts/build.ts`: runs the metadata check right after loading pages,
  before any file is written — the same "fail before touching disk" pattern
  as the raw-value check.
- `src/styles/color.ts`: added `toHex()`, since `theme-color` needs a hex
  value, not `oklch()` (below).
- `public/`: `og-default.png` (1200×630), `favicon.ico`, `favicon.svg`,
  `apple-touch-icon.png` — see `assets/src/README.md` for how they were made.
- `src/pages/index.ts`, `src/pages/design.ts`: updated to pass `path`/`lang`.

**Questions asked**
- *Where should `site.config.ts` live given L2 needs it but it was planned
  for L3?* Built now, minimally (name/url/description/nav); L3 only adds
  reading the nav for the header. (F1b-D5)
- *How should the OG image and favicons be generated, given rasterizing SVG
  to PNG needs a real dependency the PRD defers to F11?* Authored as SVG
  once, screenshotted with headless Chrome (already available on this
  machine), committed as static files — no dependency, no build step. See
  `assets/src/README.md`.

**Questions you might have**
- *Why does a bare HTML fragment (no `<title>`) skip the metadata check?*
  Nothing in this site ever ships a real page with no `<title>` — it's only
  low-level build tests that render a body with no document wrapper at all,
  to test file-writing in isolation. A page that *has* a title but is
  missing description or canonical is still a real, caught violation.
- *Why extract metadata from the rendered HTML instead of checking
  `document()`'s inputs directly?* It catches a bug in the template itself
  (e.g. a typo dropping the `<meta description>` tag), not just a missing
  argument at the call site — the check verifies what a visitor or crawler
  would actually receive.
- *Why is `theme-color` computed, not just a hex code I pick?* A typed-in
  guess (`#fbfbfd`, tried first) was subtly wrong — the real value is
  `#fcfbfe`. Computing it from the same palette generator the CSS itself
  reads (`buildPalette(accents[0], "light").bg`, converted to hex) means it
  can never drift from the actual background color, even if the default
  accent or its lightness changes later.
- *Why convert to hex instead of using the token's `oklch()` string
  directly?* `theme-color` itself has limited browser availability (not
  Baseline) and MDN's documented safe formats are hex/rgb/named colors, not
  the newer color functions — checked, not assumed. → [`toHex` in
  `color.ts`](../../src/styles/color.ts)
- *Are structured data (Person, BlogPosting JSON-LD) part of this layer?*
  No — the PRD puts that in F11, alongside real per-post OG images.

**`pnpm preview` follow-up.** Running `pnpm preview` twice crashed with a raw
`EADDRINUSE` stack trace instead of a clear message, and had no way to move
to a different port. Fixed: a `PORT` environment override, and a friendly
message naming the problem and how to retry, in both PowerShell and bash
syntax. Writing a test for the override caught a real bug before it shipped:
`Number(process.env.PORT) || 4173` silently ignores `PORT=0` (a legitimate
"give me any free port" request), since `0` is falsy in JavaScript — fixed
to `process.env.PORT ? Number(…) : 4173` (X5, X6).

## Problem statement
F1b builds the shared shell every page sits inside: the page `<head>` with
complete metadata, a header with navigation and a mobile menu, a footer, a
skip link, button/link styles at all three PRD weights, the container/
section/grid layout primitives F1a's temporary gutter fix stood in for, a
static 404 page, and the dev server (rebuild on file change, reload the
browser).

**Done** means: every page (currently `/` and `/design/`) renders inside this
shell with complete, build-checked metadata; the header/footer/skip link work
with no JavaScript; a 404 page exists and is prerendered; `pnpm dev` serves
the site with reload on change; F1a's temporary `main` padding is replaced by
real layout primitives.

### Assumptions
- A1. Nav links to Projects, Blog, About, Resume — pages that don't exist
  until F5, F7, F8. Resolved as F1b-D1 below. [assumption]
- A2. The OG image and favicons are a generated placeholder (name, violet
  accent, Geist), replaceable later without code changes. [decided with the
  owner, 2026-09-30]
- A3. `theme-color` reflects the default (light, violet) palette only;
  per-theme switching is F3's job (needs JS). [assumption]
- A4. The mobile menu must work with zero JavaScript, since F1b ships before
  any browser script exists (F3 is the first). [assumption]

## Business logic
- B1. Every page passes through one shared document/layout function; no page
  hand-writes its own `<head>` or chrome (extends F1a-D14).
- B2. Metadata is complete or the build fails (R9): title, description,
  canonical URL, `lang`, link-preview data — unique per page, no duplicates
  site-wide.
- B3. Disabled features drop out of the nav, sitemap, and RSS (R3) — F1b's
  nav must already be config-driven in shape, even though `site.config.ts`
  itself is F2's job to build out.
- B4. The header, footer, skip link, and mobile menu must work with zero
  JavaScript (R4); JS only enhances.
- B5. One `h1` per page, ordered headings, semantic landmarks (`header`,
  `nav`, `main`, `footer`) — build-checked (§6).
- B6. Every interactive element has all its states designed: default, hover,
  focus-visible, active (PRD §7.4).
- B7. The 404 page is real, prerendered HTML (a real 404 *status* is the
  host's job, D5/F12 — not F1b).
- B8. The dev server rebuilds on file change and reloads the browser; failed
  checks are reported but don't stop it (R4/D1); production still fails hard.
- B9. A component's internal layout adapts to its own available space, not
  the screen; only the page shell itself reads the real viewport.

## Implementation plan

### Sub-problems
1. Layout primitives (container, section, stack, grid; container queries)
2. The `<head>` metadata contract, and the build check that enforces it
3. Header, nav, skip link, mobile menu (no-JS disclosure pattern)
4. Footer
5. Button and link styles, all three weights, all states
6. Static 404 page
7. Placeholder OG image + favicons (generated from tokens)
8. Minimal `site.config.ts` (name, URL, description, nav) — just enough for
   the header to read from, not the full F2 schema
9. Dev server (`node:http` + `fs.watch`, debounced + reload)

### Layers
Each layer is one PR, adds standalone value, and is approved before the next.
1. **L1 — Layout primitives:** container/section/stack/grid CSS, container
   queries, replacing the temporary gutter.
2. **L2 — Head metadata + build check:** the metadata contract, canonical
   URLs, OG/favicon assets, the "missing/duplicate metadata fails the build"
   check.
3. **L3 — Header, nav, skip link, mobile menu:** no-JS disclosure, all
   states, config-driven nav shape.
4. **L4 — Footer, buttons/links, 404 page:** the remaining chrome pieces,
   sharing the same button/link token styles.
5. **L5 — Dev server:** `pnpm dev`, rebuild + reload, non-blocking checks in
   dev.

## Decision records

### F1b-D1: Nav links render even before their target page exists
- **Decision:** nav points at real future URLs (`/projects/`, `/blog/`,
  `/about/`, `/resume/`) now, even though those pages don't exist until
  F5/F7/F8.
- **Why it fits:** matches R3's config-driven mechanism; F5/F7/F8 add pages
  without touching header code (G8, self-contained features). F1b's own
  "header with nav" acceptance criterion can be verified with real links.
- **Alternative:** omit nav until targets exist — but then nothing proves the
  nav actually works, and F5/F7/F8 would each need to circle back to add it.
- **Would be wrong if:** a broken link looked like a shipped bug rather than
  a normal, temporary state during incremental construction — mitigated by
  the site not being deployed until F12, and by F1b's own 404 page (L4)
  making any dead link visible rather than silently broken.
- **Confidence:** high.
- **Spike:** none.

### F1b-D2: The mobile menu is a `<details>`/`<summary>` disclosure, snap open/close
- **Decision:** native `<details>`; no open/close animation.
- **Why it fits:** natively keyboard-operable (native focus handling, no
  ARIA needed), works with zero JS (R4).
- **Alternative:** a `<button>` + `aria-expanded` + CSS `:has()` — needs no
  JS either, but reinvents disclosure semantics `<details>` gives for free,
  plus manual ARIA wiring to match.
- **Would be wrong if:** the design needed a smooth height transition, which
  turned out to need a Chromium-only CSS feature — see S3.
- **Confidence:** high (was low; resolved by S3).
- **Spike:** S3 (passed; see below).

### F1b-D3: `pnpm dev` is `node:http` + `fs.watch`, debounced — no dependency
- **Decision:** a plain Node script; `fs.watch` triggers a rebuild, debounced
  (50ms, required — not optional), with a reload signal (SSE or similar) to
  the open browser.
- **Why it fits:** D7 already committed to this; F1b is where it's actually
  built. No bundler-style dev server needed, since there's no bundling (D0).
- **Alternative:** Vite's dev server alone, without its build step — still a
  dependency, against this project's whole premise.
- **Would be wrong if:** `fs.watch`'s known cross-platform quirks caused
  missed rebuilds on the actual dev machine (Windows) — checked in S4.
- **Confidence:** high (was low; resolved by S4). Debouncing is a required
  part of the design, not an optional nicety.
- **Spike:** S4 (passed with a required implementation detail; see below).

### F1b-D4: Components query their container, not the viewport
- **Decision:** the layout wrapper (`main`, and any component wrapper that
  holds independently-sized children) gets `container-type: inline-size`.
  Any component whose internal layout should change based on available
  space — not screen size — uses `@container (min-width: …)`, never
  `vw`/`vh`. A child never assumes its parent equals the browser viewport.
- **Why it fits:** `vw`/`vh` always mean the actual browser window, no
  matter how deep an element is nested — if `main` is narrowed by a sidebar
  or a max-width container, a `vw`-sized child inside it is still sized off
  the full screen, not its real available space. This makes explicit, as its
  own checklist item, what F1a's D2 already committed to ("components use
  container queries so they adapt to where they're placed").
- **Alternative:** `calc(100vw - <sidebar width>)` per component — brittle,
  breaks the moment the sidebar's width changes, and doesn't compose (a
  component nested two levels deep would need to know about every ancestor).
- **Would be wrong if:** container queries turned out unsupported in a
  target browser — checked, not the case.
- **Confidence:** high. [verified: caniuse, 2026-09-30 — 94.87% global
  usage; full support in Chrome/Edge/Safari/Firefox's last 2 versions]
- **Spike:** none (checked directly via caniuse).

### F1b-D5: A minimal `site.config.ts` is built in L2, not L3 as originally planned
- **Decision:** `name`, `url`, `description`, `nav` now; L3 only adds reading
  `nav` into the header (it doesn't need to create the file).
- **Why it fits:** canonical URLs and OG `og:url`/`og:site_name` need a base
  site URL to exist; there's no way to build real metadata without it. The
  PRD's own project structure lists `site.config.ts` as F1b-owned overall,
  just not pinned to a specific layer within it.
- **Alternative:** hardcode the placeholder URL directly in `document.ts`
  until L3 — creates a value duplicated across two places the moment
  `site.config.ts` is created, for no real benefit.
- **Would be wrong if:** L3's nav needs a config shape incompatible with
  what L2 already committed to — low risk, since `nav` here is already the
  exact `{ label, href }[]` shape a header needs.
- **Confidence:** high.
- **Spike:** none.

### F1b-D6: The placeholder OG image and favicons are authored once, not generated at build time
- **Decision:** hand-authored SVGs (tokens-based colors, Geist font),
  screenshotted once with headless Chrome at each target size, committed as
  static PNG/ICO/SVG files in `public/`. Sources kept in `assets/src/`
  (outside `public/`, so they aren't copied to `dist/`).
- **Why it fits:** OG image generation is explicitly an F11-decided
  dependency in the PRD's D0 — building a real SVG → PNG pipeline now would
  preempt that decision for a placeholder that F11 replaces anyway.
- **Alternative:** a build-time rasterizer (`sharp`, `resvg`) — a real
  dependency, decided too early; or ship SVG-only and skip PNG — breaks
  Apple's `apple-touch-icon` (no SVG fallback) and most social crawlers.
- **Would be wrong if:** the placeholder needs to change often enough that
  re-running the screenshot step by hand becomes a real burden — revisit at
  F11 regardless.
- **Confidence:** high.
- **Spike:** none.

## Edge cases
- A nav link to a not-yet-built page (F1b-D1): must not 404 silently during
  development; the 404 page itself (also F1b) makes this visible.
- The metadata check must catch a **duplicate** title/description/canonical
  across pages, not just a missing one (R9) — written generally, not
  special-cased for today's 2 pages.
- The mobile menu's open state naturally resets on navigation (fresh HTML
  per page, no JS yet) — worth stating since F3+ adds JS that could
  introduce a stale-open-state bug later.
- The skip link must be the very first focusable element and visually
  hidden until focused — `display: none` would also hide it from focus,
  which is the common mistake.
- The 404 page must itself pass the same metadata/heading checks as every
  other page — it's a real page, not an exception.
- Dev server: a failed check (e.g. a raw CSS value) must report in-terminal
  without blocking `pnpm dev` (closes F1a's X15), while `pnpm build` still
  fails hard.
- Windows-specific: `fs.watch` fires 2 `change` events per save (confirmed by
  S4) — must be debounced, not assumed away.

## Spikes

### S3: mobile menu disclosure pattern (2026-09-30)
- **Question:** does `<details>`/`<summary>` support a smooth open/close
  transition in current evergreen browsers, or does content just snap
  open/closed?
- **Pass if:** at least a snap open/close (no animation) works correctly and
  accessibly across the "last 2 versions" target; animation is a
  nice-to-have, not required.
- **Fail if:** `<details>` can't be styled to match the intended header
  layout at all (e.g. can't be positioned as an overlay), forcing a
  different pattern.
- **Result:** `<details>` works correctly — natively keyboard-operable
  (`tabIndex: 0`, native role, no ARIA needed), opens/closes via the native
  `open` attribute, positions correctly as an absolute overlay under
  `<summary>`. The only CSS technique to animate `height: auto`
  (`interpolate-size`) has **zero support in Firefox or Safari**
  [verified: caniuse, 2026-09-30 — 72.21% global usage, Chromium-only],
  disqualifying it against the PRD's "last 2 versions of evergreen browsers"
  target outright. Confirmed the fallback: without it, the menu's height
  change completes within one animation frame (measured 36px before and
  after one `requestAnimationFrame`, i.e. no gradual transition) — a clean
  snap, not a broken or janky one.
- **Verdict:** stands (F1b-D2). Snap open/close, no animation. An
  opacity-only fade (animatable everywhere) is a possible small enhancement
  later, not committed to now.

### S4: `fs.watch` reliability on Windows (2026-09-30)
- **Question:** does `fs.watch` on a `src/` tree reliably fire exactly once
  per file save on Windows, without missed or duplicate events, well enough
  to drive a rebuild?
- **Pass if:** 10 consecutive saves of a test file each trigger exactly one
  rebuild within ~1 second, no misses.
- **Fail if:** events are missed, duplicated in a way that breaks a naive
  rebuild-on-event implementation, or don't fire at all on this machine.
- **Result:** literal criterion failed, intent passed. 11 saves (1 initial +
  10 spaced 300ms apart) produced exactly 22 `change` events — a consistent
  2:1 ratio every time, not random flakiness. Undebounced, this means every
  save triggers 2 rebuilds. With a 50ms debounce, 11 saves produced exactly
  11 rebuilds, no misses, no extras.
- **Verdict:** stands (F1b-D3), with debouncing promoted from optional to
  **required**. The dev server design must debounce `fs.watch` callbacks;
  this is now O14 in the checklist, not an implementation detail to discover
  later.

## Original checklist
Frozen at approval (2026-09-30). Never edited afterwards; only ticked.

**L1 — Layout primitives**
- [ ] O1. Container widths (`content` ~680px, `wide` ~1120px), section
  spacing, a stack primitive (consistent vertical rhythm via `* + *`), and a
  grid primitive (4/8/12 columns per breakpoint), all tokens-only. Components
  size against their nearest wrapper, not the browser window: the layout
  wrapper(s) declare `container-type: inline-size`, and any component whose
  layout should adapt to where it's placed (cards, tiles) uses `@container`
  queries, never `vw`/`vh` (F1b-D4). Page-level layout (the shell itself)
  still uses ordinary `@media` breakpoints (D2).
- [ ] O2. F1a's temporary `main { padding-inline }` rule in `base.css` is
  removed, replaced by the real primitives; `/design/` and `/` both still
  render correctly (no regression).

**L2 — Head metadata + build check**
- [x] O3. Every page supplies: title, description, canonical URL, `lang`,
  OG title/description/image, Twitter card tags — via one shared contract,
  not hand-written per page.
- [x] O4. The build fails if any page is missing metadata, or if two pages
  share the same title, description, or canonical URL.
- [x] O5. A generated placeholder OG image (1200×630, tokens-based) and a
  generated favicon set exist in `public/`, wired into every page's `<head>`.
- [x] O6. `theme-color` reflects the default (violet, light) palette.

**L3 — Header, nav, skip link, mobile menu**
- [ ] O7. Header with site name (links home) and nav (Projects, Blog, About,
  Resume), reading from a small config list (not yet the full F2
  `site.config.ts`).
- [ ] O8. A skip link: first focusable element, visually hidden until
  focused, jumps to `main`.
- [ ] O9. Mobile menu: `<details>`/`<summary>` disclosure, snap open/close
  (no animation, per S3), fully keyboard-operable, all interactive states
  designed (default/hover/focus-visible/active).
- [ ] O10. Desktop nav and mobile menu both pass the raw-value check
  (F1a-D8) and use only semantic HTML landmarks.

**L4 — Footer, buttons/links, 404 page**
- [ ] O11. Footer: contact (email + social links, no form), site
  name/copyright-style line.
- [ ] O12. Button styles at all three PRD weights (primary/secondary/
  tertiary), same height/padding/radius, all states designed, ≥48×48px
  targets.
- [ ] O13. A static, prerendered 404 page, passing the same metadata/heading
  checks as every other page.

**L5 — Dev server**
- [ ] O14. `pnpm dev`: serves `dist/`, watches `src/`/`content/`/`public/`
  (recursive), rebuilds on change with a **50ms debounce** (S4 requirement,
  not optional), reloads the open browser (SSE or equivalent).
- [ ] O15. Failed checks (metadata, raw-value) report in the terminal and
  the page during `pnpm dev` but don't stop serving; `pnpm build` still
  fails hard. Closes F1a's X15.

**Close-out**
- [ ] O16. All PRD F1b acceptance criteria met (§8): all states shown, no
  raw values, works 320px→2560px and 200% zoom, keyboard reaches everything,
  mobile menu works or degrades without JS, build fails on missing
  metadata/duplicate title/no h1/skipped headings, Practical UI checklist
  passes.

## Discovered checklist
Anything unplanned. Never moved into the original checklist.
- [x] X1. `main` collapsed to a near-zero width (one character per line) once
  `flex: 1`, `min-width: 0` and `container-type: inline-size` were combined on
  a `flex-direction: column` parent — `container-type: inline-size` removes
  the content-based size signal that would otherwise have kept `main` full
  width — **Trigger:** L1's first real screenshot of the combined page shell —
  **Blocking** (fixed: `width: 100%` added to `body > main`, verified by
  removing and re-adding it on the exact reproducing file, and by a
  mutation-tested regression test)
- [x] X2. `100vh` isn't covered by the raw-value check's D2 allowlist (only
  `0`, `100%`, `1fr`, `65ch`) — flagged as a false-positive raw value even
  though it's a structural, non-design-decision value, the same category as
  the already-allowed `100%` — **Trigger:** first `pnpm test` run after adding
  `layout.css` — **Blocking** (fixed: `100vh` added to `ALLOWED_VALUES` in
  `check-raw-values.ts`, with a test for both the allowed case and that other
  viewport-unit values, e.g. `50vh`, are still correctly flagged)
- [x] X3. My first hardcoded `theme-color` guess (`#fbfbfd`) was subtly
  wrong — the real `--color-bg` value is `#fcfbfe` — **Trigger:** computed
  the real value from the palette generator to double-check the guess, per
  habit rather than because the guess looked wrong — **Blocking** (fixed:
  `theme-color` now computed from `buildPalette(accents[0], "light").bg` via
  a new `toHex()` helper, so it can never drift from the real token again)
- [ ] X4. `/design/`'s own `.demo` container class duplicates what L1's
  `.container-wide` now does — **Trigger:** L1 review, noted but not
  addressed (scope) — **Deferrable**: unify when `/design/` gets its next
  real pass, not blocking F1b
- [x] X5. `pnpm preview` crashed with a raw Node stack trace on `EADDRINUSE`
  instead of a clear message, and had no way to run on a different port when
  one instance was already running — **Trigger:** the owner hit exactly this
  running `pnpm preview` twice — **Blocking** (fixed: a `PORT` env override
  and a friendly "already in use" message with both PowerShell and bash
  syntax to retry on another port)
- [x] X6. The `PORT` override used `Number(process.env.PORT) || 4173`, which
  silently ignores `PORT=0` (a legitimate way to ask the OS for any free
  port) and falls back to the default instead, since `0` is falsy in
  JavaScript — **Trigger:** writing a test for the `PORT` override, before
  trusting that it worked — **Blocking** (fixed: `process.env.PORT ? Number(…) : 4173`;
  mutation-tested by reverting to the `||` form and confirming the new test
  catches it)

## Layer log

| Layer | PR | Verified by | Checklist items ticked |
|---|---|---|---|
| L1 | — | `pnpm typecheck` exit 0; `pnpm test` 113/113 pass (layout.css structure: shell sizing, container-type, container/container-wide use width tokens, section/stack/grid rules, plus the width:100% regression test, all mutation-tested); `pnpm build`; headless Chrome screenshots of `/` and `/design/` at 1280px and 375px confirm no regression and the width-collapse bug is fixed; a real bug (X1) was found, root-caused by bisecting the actual generated CSS (not hand-typed reconstructions) after several plausible theories failed to reproduce it, and fixed | O1, O2, X1, X2 |
| L2 | — | `pnpm typecheck` exit 0; `pnpm test` 136/136 pass (`check-metadata.ts` unit tests incl. mutation-tested title-exemption logic; `document.ts` tests for canonical URL, OG/Twitter tags, computed `theme-color`, escaping, favicon links; `build.ts` integration tests for missing/duplicate metadata, checked before any file is written; `toHex()` against known black/white/red/`#767676` references); end-to-end: injecting a real duplicate description into `src/pages/design.ts` failed `pnpm build` naming both pages, reverting restored a clean build; real screenshots of `/` and `/design/` confirm no visual regression | O3, O4, O5, O6, X3 |
| L2 follow-up (preview server) | — | `pnpm typecheck` exit 0; `pnpm test` 138/138 pass; reproduced the owner's exact `EADDRINUSE` crash and confirmed the new friendly message replaces it; confirmed `PORT=4174` actually serves on that port; a `PORT=0` test caught a real bug (`\|\|` silently ignoring a falsy `0`) before it shipped, mutation-tested by reverting the fix and confirming the test then fails | X5, X6 |

## How it works

### Layout primitives and the page shell (L1)
`layout.css` lives in the `layout` cascade layer, after `base` and before
`components` — so component CSS (like `/design/`'s `.demo`) can always
override a layout rule without a specificity fight, and layout rules always
beat base defaults.

1. **The shell.** `body { display: flex; flex-direction: column }` stacks
   `header`/`main`/`footer` vertically. `header`/`footer` get `flex: none`
   (size to their own content); `main` gets `flex: 1` (take whatever height
   is left). `main` also gets `width: 100%` — without it, combined with
   `container-type: inline-size` below, `main` can collapse to almost
   nothing (see X1). `container-type: inline-size` turns `main` into a size
   container, so anything nested inside it can use `@container` queries to
   react to *its own* available width, never `window.innerWidth`.
2. **Containers.** `.container` (≈680px) and `.container-wide` (≈1120px) cap
   line length and center content, with a responsive gutter
   (`--space-s` mobile, `--space-m` at 768px+) from the width tokens, never a
   hardcoded pixel value.
3. **Section, stack, grid.** `.section + .section` puts space only *between*
   sections, never around a single one. `.stack` uses flex `gap` (not
   margins, which would leak onto the group's outer edges) for consistent
   spacing between related children. `.grid` steps 4 → 8 → 12 columns at the
   `md`/`lg` breakpoints.

### Head metadata (L2)
1. **Contract.** `document({ path, title, description, lang, body })` is the
   only way any page builds its `<head>` — there's no optional field, so
   `tsc` catches a missing one before the build even runs.
2. **Canonical and OG URLs.** `canonicalUrl(path)` is just
   `siteConfig.url + path`; the same helper builds the OG image's absolute
   URL, since social crawlers need a full URL, not a root-relative path.
3. **`theme-color`.** Computed once, at module load, from the real palette:
   `buildPalette(accents[0], "light").bg` is the exact OKLCH color the CSS
   itself uses for the background; `toHex()` (new in `color.ts`) converts it
   through the same linear-sRGB math the contrast checker already uses, so
   the value can never quietly drift from the token.
4. **The metadata check.** `checkRawValues`-style: `check-metadata.ts` pulls
   `<title>`, `<meta name="description">` and `<link rel="canonical">` back
   out of each page's *rendered* HTML with three small regexes (not a full
   parser — this project's own HTML, not arbitrary input), then checks every
   page has all three and that no value repeats across pages. `build.ts`
   runs it right after loading pages and before writing any file, so a
   violation fails the build with nothing written — the same "check before
   touching disk" shape as the raw-value check (F1a-L5).
5. **The one exemption.** A page whose rendered HTML has no `<title>` tag at
   all is skipped by the check. That's not a loophole for real pages — every
   real page goes through `document()`, which always sets `<title>` — it
   only exempts the handful of low-level `build.test.ts` fixtures that
   render a bare body fragment on purpose, to test file-writing in isolation
   from `document()`.
6. **Placeholder images.** `og-default.png`, `favicon.ico`, `favicon.svg`,
   `apple-touch-icon.png` are static files in `public/`, authored once from
   SVG sources in `assets/src/` (see that folder's README for exactly how).
