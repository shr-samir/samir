# Portfolio — Product Requirements Document

| | |
|---|---|
| **Owner** | Samir Shrestha |
| **Status** | Draft v0.18 |
| **Last updated** | 2026-09-30 |
| **Reference** | [jasoncameron.dev](https://jasoncameron.dev/) — a more refined take on it |

This is a living document. Features get added, removed, or reordered through the
[Change log](#12-change-log); nothing is deleted silently.

Claim labels: **[verified]** checked against current docs or by running code ·
**[memory]** from prior knowledge, may be outdated · **[assumption]** needs
confirmation. Decision confidence is **high** or **low** only; a decision resting
on an unverified [memory] or [assumption] claim is low until checked.

### How features are built
This PRD defines the whole project; each feature is then built with the
*first-principles* workflow:
1. **Understand:** problem, rules, plan, and edge cases for that feature.
2. **Resolve uncertainty:** spikes offered for low-confidence decisions.
3. **Original checklist:** approved by me, then **frozen** for that feature.
4. **Layers:** built one at a time, each approved before the next.
5. **Discovered items:** anything unplanned goes in a separate discovered checklist, never into the frozen one.

The PRD itself stays editable: adding, removing, or reordering features is
recorded in the [Change log](#12-change-log).

### Documentation and commits
- **PRD** (`docs/PRD.md`): project scope only; changes only when scope changes, and each change gets a change-log row.
- **Docs map** (`docs/README.md`): which doc answers which question.
- **Feature docs** (`docs/features/<ID>-<slug>.md`, from `_template.md`): one per feature, holding an "Understanding" section (TL;DR, the essence of each layer, questions asked and likely questions, with answers), its first-principles record, and a plain-language "How it works" walkthrough.
- **Fundamentals** (`docs/fundamentals.md`): how the site works on the bare platform (browser, HTTP, HTML, CSS, modules, Node), compared with what frameworks like React and Vite hide. Concepts only; a section is added in the same PR as the first code that relies on it.
- **Learnings** (`docs/learnings.md`): one shared file; one- or two-line entries tagged by feature ID, linking to the feature doc for detail.
- **PRs:** one per layer, each adding standalone value. The feature doc and learnings are updated in the same PR as the code, never afterwards.
- **Commits:** Conventional Commits with the feature ID as scope, e.g. `feat(F1a): add spacing tokens`, `docs(prd): …`. Other scopes: `prd`, `docs`, `repo`, `deps`. PRs are squash-merged, so the PR title becomes the commit on `main` and must follow this format; F12 checks it in CI.

---

## 1. Problem statement

A personal site: a place for **my work** and **my writing**. People land here
from a link or a search, often on a phone, and should quickly get who I am,
what I've built, and how to reach me. Posts should be easy to find through
search and look right when shared.

To do that, the site must be:

1. **Responsive.** It works and looks deliberate on every screen from a 320 px
   phone to a wide desktop monitor, with touch, mouse, or keyboard, and at 200%
   zoom. Built mobile first.
2. **Scalable.** It grows without rework in three directions: *content* (the
   50th post or project is just another file, and list pages stay usable),
   *features* (a new section is added or removed without touching others), and
   *traffic* (a spike, e.g. a post shared widely, is served from a CDN at no
   extra cost).
3. **Search-optimized.** Every page is static HTML with semantic markup, unique
   metadata, clean URLs, structured data, and link previews, and is fast enough
   that page-speed signals help rather than hurt ranking.
4. **Designed with care.** It follows UI/UX and design principles (*Practical
   UI*): one design system for typography, spacing, and color; clear hierarchy;
   consistent everywhere.
5. **Accessible.** Everyone can use it, including people using a keyboard only,
   a screen reader, screen magnification, high-contrast modes, or reduced
   motion. It meets WCAG 2.2 AA, and accessibility is built in from the first
   feature, not audited at the end.
6. **Performance-focused.** Performance is a budget checked on every build, not
   a final audit: fast first paint on a mid-range phone, no layout shift, and
   very little JavaScript.

**Done** means: deployed on free hosting; every page served as static HTML; all
content editable from content/config files without touching templates; and the
site meets every target in [§6](#6-non-functional-requirements), with the
measurable ones enforced automatically by the build.

### Assumptions
- A1. Visitors are mostly developers and people I've shared a link with, on desktop and mobile. [assumption]
- A2. Content (bio, projects, experience, posts) will be written by me; placeholder content is fine during build. [assumption]
- A3. Traffic is low (hundreds to low thousands of visits/month), so free tiers are sufficient. [assumption]
- A4. English only; no i18n. [assumption]
- A5. Many visitors arrive on phones, often on mobile networks, so mobile performance is the design target. [assumption]
- A6. "Scalable" means content, features, and traffic as defined above, not a multi-author or multi-site platform. [assumption]

## 2. Goals and non-goals

**Goals**
- G1. One design system (tokens) drives all typography, spacing, color, radius, and motion.
- G2. Fonts are swappable by editing one file.
- G3. Content and features are config-driven: turn sections on/off in `site.config.ts` without editing templates or feature code.
- G4. Every public route is prerendered static HTML with per-page metadata.
- G5. $0/month hosting.
- G6. Minimal dependencies: native platform features first; every dependency justified by a decision record (D0).
- G7. Responsive by construction: fluid type and spacing, layouts that adapt to their container, and responsive images, all from shared tokens and primitives.
- G8. Scalable content and features: collections of any size, and features that are self-contained modules switched by flags (R3).
- G9. SEO built in: every page ships complete metadata, and the build fails if any is missing.
- G10. Performance budgets enforced by the build: a page over budget fails the build (R10).
- G11. Accessible by default: WCAG 2.2 AA, with the machine-checkable parts enforced by the build and the rest (keyboard and screen reader behavior) tested at every feature gate (R12).

**Non-goals**
- A CMS or admin UI (content lives in the repo).
- User accounts, comments, or newsletters (may revisit).
- Pixel-matching the reference site; we take its structure and personality, not its code.

## 3. Reference analysis (jasoncameron.dev)

Observed from the live site's HTML/CSS on 2026-09-27 [verified]:

| Aspect | Reference | Our direction |
|---|---|---|
| Framework | SvelteKit + Tailwind | Native HTML, CSS, TypeScript; a small build script |
| Typography | JetBrains Mono everywhere | One sans serif for everything; mono for code only (optionally metadata), swappable |
| Theme | Catppuccin, 4 flavors × 14 accents | Own refined palette: light/dark + 3–4 curated accents |
| Layout | Single column, `max-w-6xl` | Single column, tokenized container widths |
| Sections | Hero, projects, bento grid (theme, connect, location, click counter, commits, languages), blog | Same set, each behind a feature flag |
| Extras | Page-view counter, view transitions | Same, in later features |

What we refine: fewer, deliberate theme choices; a strict type and spacing scale;
better readability for long-form posts; stronger accessibility; near-zero
JavaScript with enforced performance budgets; metadata and structured data on
every page.

**Design guideline:** all UI follows the *Practical UI* skill
(`~/.claude/skills/practical-ui`). Its review checklist is run at the end of every
feature, and deviations from it are recorded as decisions with a reason.

## 4. Business logic (stack-independent rules)

- R1. **Single source of truth.** Every visual value (font, size, spacing, color, radius, shadow, duration) comes from a token. Components never use raw values.
- R2. **Content is data.** Profile, links, projects, experience, and posts are files validated against a schema. Invalid content fails the build rather than rendering broken.
- R3. **Feature flags.** Each content feature (F4–F10) has a flag in site config. Disabled features render nothing and are excluded from navigation, the sitemap, and RSS. Foundations (F1a, F1b, F2, F3, F11, F12) are always on.
- R4. **Static first.** Pages must be fully readable with JavaScript disabled. JavaScript only enhances (theme toggle, counters, live refresh).
- R5. **Dynamic data degrades gracefully.** Any live widget (GitHub, counters) has a loading, error, and stale/fallback state and never blocks the page.
- R6. **Theme preference** resolves in order: user's saved choice → OS preference → light. It must apply before first paint (no flash).
- R7. **Drafts** (posts/projects marked draft) are visible in development and excluded from production builds, the sitemap, and RSS.
- R8. **Collections scale.** Any list (posts, projects, tags) stays usable at any size: newest first, grouped or paginated past a set number of items, and never requiring edits to templates when items are added.
- R9. **Complete metadata.** Every page has a unique title, description, canonical URL, language, and link-preview data; the build fails if any is missing or duplicated.
- R10. **Performance budgets.** Each page has limits on HTML, CSS, JavaScript, font, and image weight; the build fails if a page exceeds them.
- R11. **Images are well-formed.** Every image has alt text (or is explicitly marked decorative) and known dimensions so it can't shift the layout; large images are served in sizes that fit the screen.
- R12. **Accessible by default.** Every page uses semantic landmarks (header, nav, main, footer) and native interactive elements (links, buttons, form controls) before custom ones. Every interactive element is reachable and operable by keyboard, has a visible focus indicator, and has an accessible name. Content order in the markup matches the visual order. Anything that changes without a page load (theme, counters) is announced to screen readers when it matters. Motion respects `prefers-reduced-motion`, and colors adapt to forced-colors (high-contrast) modes.

## 5. Tech stack and decisions

**Stack:** native HTML, CSS, and TypeScript · a small TypeScript build script run
directly by Node (≥ 24.12, the current LTS line, where type stripping is stable) ·
TypeScript and Node's type definitions (the only dependencies, both dev-only) ·
hosting TBD (free, static).

### D0: Dependency policy — native first
- **Rule:** the platform (HTML, CSS, browser APIs, Node's standard library) is the default. A dependency is added only when it solves a genuine problem that native code can't solve reasonably, and it gets a decision record naming that problem and why native isn't enough. Unnecessary dependencies are a liability: upgrades, security issues, and code no one on the project understands.
- **Current dependencies** (dev-only; nothing ships to the browser):
  - `typescript`: type-checking, and compiling browser scripts (D6).
  - `@types/node`: type definitions for Node's standard library, so build scripts can be type-checked. TypeScript 7 includes no ambient types by default (`types: []`), so without it `import … from "node:fs"` fails type-checking [verified: F1a spike S1]. It contains types only, no runtime code; the alternative, leaving build scripts unchecked, would give up strict TypeScript (§6).
- **Candidates, decided when their feature starts:** a Markdown parser (F5), image resizing for responsive images (F5; alternative: export sizes by hand), syntax highlighting (F8), OG image generation (F11), Cloudflare tooling for counters (F10).
- **Trade-off accepted:** we write and maintain the build script, the dev server, and the checks ourselves.

### Project structure (proposed, finalized in F1a)
```
content/            posts/*.md, projects/*.md, experience and profile data
public/             fonts, images, favicons; copied to the output as-is
src/
  layout/           page shell: <head>, header, footer
  features/<ID>-*/  one folder per feature: template, CSS, browser script, content loader
  pages/            one module per URL pattern, composing layout and features
  styles/           tokens.css, fonts.css, reset, base, layout layers
  client/           browser scripts (compiled by TypeScript, D6)
  lib/              html helper, content validation, Markdown, checks
scripts/            build.ts, dev.ts, check scripts
tests/              all tests, mirroring the folders above (tests/src/lib/html.test.ts tests src/lib/html.ts)
site.config.ts      site identity, navigation, feature flags
dist/               build output (git-ignored)
```
Node-side code imports by absolute path through Node's subpath imports in
`package.json` (`#src/…`, `#scripts/…`), never relative paths (F1a-D10).

A feature is self-contained in its folder and registers itself with the build;
removing the folder and its flag removes the feature (G8, R3).

### Information architecture (decided in Q7)
| Page | Contents | Feature |
|---|---|---|
| Home `/` | Hero, featured projects, bento grid, recent posts | F4, F5, F6, F8 |
| Projects `/projects/` | All projects, plus a page per project | F5 |
| Blog `/blog/` | Posts, tag pages, a page per post | F8 |
| About `/about/` | Longer bio, experience timeline, link to the resume | F4, F7 |
| Resume `/resume/` | HTML resume generated from the experience data; prints to a clean PDF | F7 |

- **Navigation:** Projects, Blog, About, Resume. The site name links home. Disabled features drop out of the navigation (R3).
- **Contact:** an email link plus social links; no form and no backend (Q13).

### URL scheme (proposed)
- Pages: `/`, `/projects/`, `/projects/<slug>/`, `/blog/`, `/blog/page/<n>/`, `/blog/tags/<tag>/`, `/blog/<slug>/`, `/about/`, `/resume/`. Files: `/rss.xml`, `/sitemap.xml`, `/robots.txt`, `/404.html`.
- Every page is a folder with `index.html`, so every URL ends with a slash; the canonical URL always uses that form.
- Slugs come from file names (lowercase, hyphens). Duplicate slugs fail the build.
- URLs are permanent: renaming a slug requires a redirect entry (the host's redirects file), and the build fails if an old slug disappears without one.

### D1: Build — custom static site generator in TypeScript
- **Why it fits:** G4 needs every page as static HTML; a build script that renders page templates to files, copies assets, and writes `sitemap.xml`, `robots.txt`, and RSS covers it. Node 24 runs `.ts` files directly with no compile step [verified: ran a `.ts` file on Node v24.15.0]. Folders map to URLs, so no router is needed. Pages ship close to zero JavaScript (R4).
- **Caching:** CSS, JavaScript, font, and image files get a content hash in their file name (e.g. `site.3f9a1c.css`, using `node:crypto`), so the host can cache them for a year; HTML is cached briefly and always revalidated. A change to a file changes its name, so visitors never get stale assets.
- **Dev vs production:** in development, failed checks are reported in the terminal and in the page but don't stop the dev server; the production build fails on any failed check.
- **Traces to:** problem statement 1–2 (search, link previews), G4, R2 (content validated at build), R4, G6.
- **Alternatives:** Eleventy — a mature static site generator in one dependency, but it pulls in its own dependency tree [memory] and hides the pipeline we want to understand. TanStack Start + React — a framework, router, and hydration for a site with almost no interactivity. Astro — same objection.
- **Would be wrong if:** the build script grows past a few hundred lines of hard-to-follow code, or development without hot reload becomes painful.
- **Confidence:** low until F1a/F1b build and render real pages.

### D1a: Templates — TypeScript functions returning HTML, escaped by default
- **Why it fits:** page and component templates are plain functions using a tagged template (`html\`…\``) that escapes interpolated text automatically, with an explicit `raw()` for trusted HTML (e.g. rendered Markdown). This keeps markup readable and type-checked without JSX.
- **Security:** escaping by default prevents injected text (titles, content) from becoming HTML/script (XSS). Tests cover it.
- **Alternative:** plain string concatenation — no escaping, easy to get wrong. JSX via a small runtime — a dependency for convenience only.
- **Confidence:** high (standard language features); the helper gets unit tests.

### D2: Styling — native CSS with design tokens
- **Why it fits:** CSS custom properties hold every token (R1). Native features cover the rest: cascade layers (`@layer reset, tokens, base, layout, components, utilities`), nesting, `light-dark()` for themes, `color-mix()` for state overlays, OKLCH colors, `clamp()` for fluid type, container queries [verified: 94.87% global usage, full support in Chrome/Edge/Safari/Firefox's last 2 versions, caniuse — F1b Gate 1, 2026-09-30]. Component styles live in their own `.css` files, keeping markup free of style noise.
- **Enforcing R1 without a framework:** a small TypeScript check script fails the build if CSS outside the token file uses raw values (e.g. `px` sizes, hex/OKLCH colors, raw durations) instead of `var(--…)`. A short allowlist covers values that aren't design decisions (`0`, `100%`, `1fr`, `65ch`, hairline `1px` borders), finalized in F1a.
- **Breakpoints are the one exception to R1:** CSS custom properties can't be used inside `@media` or `@container` conditions [memory: long-standing CSS limitation]. So breakpoint values live in one list (§7.2) and may appear only in query conditions; the check script allows exactly those values there. Page-level layout uses media queries; components use container queries so they adapt to where they're placed.
- **Alternative:** Tailwind — several extra packages, plus a class-merging pitfall found in a spike (see `docs/learnings.md`), to solve problems native CSS no longer has.
- **Would be wrong if:** a needed CSS feature lacks support in a target browser; mitigate with progressive enhancement.
- **Confidence:** high for custom properties, layers, and container queries (all verified — the last in F1b Gate 1); `light-dark()` was verified in F1a L3.

### D3: Content — Markdown files with frontmatter, validated by hand-written TypeScript
- **Why it fits:** R2 needs validated content. The schemas are small (a project or post has about 8 fields), so plain TypeScript validators with clear error messages are enough; no schema library.
- **Open point:** Markdown → HTML needs a parser. Writing one is a real liability, so a parser is the likeliest first new dependency. Alternative: write project and post bodies as HTML fragments (zero dependencies, less pleasant). Decided at the start of F5.
- **Confidence:** low until F5.

### D4: Fonts — self-hosted `.woff2` files with native `@font-face`
- **Why it fits:** download each font's `.woff2` files once from its official source (checking the license, e.g. SIL Open Font License), serve them from our own domain, and declare them with `@font-face` and `font-display: swap`. Prefer variable fonts (one file covers regular and bold) and Latin-only subsets to keep files small. Body text needs a real italic file for emphasis in posts; the code font downloads only on pages that contain code, because browsers fetch a font only when text uses it [memory]. One `fonts.css` file maps roles (`sans`, `heading`, `meta`, `code`) to families, and all other CSS reads only the role variables, so swapping a font is a one-file change (G2). Fallback fonts are tuned with native metric overrides (`size-adjust`, `ascent-override`) to limit layout shift [memory].
- **Alternative:** Fontsource packages — a dependency to copy files we can copy once. Google Fonts CDN — an extra origin and a privacy cost.
- **Confidence:** high for `@font-face`; metric overrides are [memory], checked in F1a.

### D5: Hosting — undecided (free static hosting)
- **Now possible:** any static host, since the site is plain files: Cloudflare Pages, GitHub Pages, Netlify.
- **Requirements from the rest of this PRD:** custom response headers (security headers and cache rules, §6), a redirects file (URL scheme), a real 404 status for `404.html`, and builds from the Git repository so no deploy tool is needed locally. GitHub Pages can't set custom headers [memory], which likely rules it out.
- **Counters (F10):** a separate small backend (e.g. a Cloudflare Worker) decided at F10; it doesn't constrain the static host.
- **Decide by:** before F12.

### D6: Browser scripts — TypeScript compiled to native ES modules, no bundler
- **Why it fits:** each interactive feature (theme toggle, clock, counters) is a small script, progressively enhancing HTML that already works without it (R4). TypeScript compiles them to ES modules that the browser loads directly; at this size, bundling adds nothing.
- **Setup** [verified: F1a spike S1 with TypeScript 7.0.2, the Go-based compiler]: `tsconfig.json` type-checks everything Node runs, with no emit (`erasableSyntaxOnly`, `verbatimModuleSyntax`, `allowImportingTsExtensions`); `tsconfig.client.json` emits `src/client` as ES modules, rewriting `./x.ts` imports to `./x.js` (`rewriteRelativeImportExtensions`). The emitted modules load as native ESM. Details in the [F1a feature doc](features/F1a-design-tokens-and-fonts.md).
- **Confidence:** high.

### D7: Development and testing tools — Node's standard library
- **Dev server:** `node:http` serving the build output, `fs.watch` to rebuild on changes, and a small script that reloads the page when a rebuild finishes (server-sent events).
- **Tests:** the built-in `node:test` runner and `node:assert`, for helpers, validators, and check scripts.
- **What each kind of check covers:** unit tests for code; build checks for the rules marked **(build)** in §6; manual checks at feature gates for keyboard, screen reader, and visual design; Lighthouse in Chrome DevTools (mobile preset, which emulates a mid-range phone on a slow connection [memory]) for Core Web Vitals at gates and in F11.
- **Confidence:** high for tests (`node:test` runs `.ts` files directly [verified]); the dev server is built in F1b.

### License
MIT for the whole repository, including content, so others may reuse code and
posts with attribution. Revisit if content needs stricter terms (e.g. a separate
license for `content/`).

## 6. Non-functional requirements

Targets marked **(build)** are checked automatically and fail the build; the
rest are checked at feature gates and in F11. All numbers are starting targets
[assumption] and can be tuned.

| Quality | Target |
|---|---|
| Responsive | Works 320 px → 2560 px, portrait and landscape; usable at 200% zoom with no horizontal scrolling; touch targets ≥ 48×48 px; fluid type and spacing from tokens; long content wraps without breaking layout |
| Scalable | Adding a post or project is adding one file (R2, R8); build time under 10 s for 200 pages; features are self-contained and switched by flags (R3); served entirely as static files from a CDN |
| SEO | Unique title, description, canonical, `lang`, and link-preview tags on every page **(build)**; semantic HTML with one `h1` and ordered headings **(build)**; `sitemap.xml`, `robots.txt`, RSS; structured data (Person, BlogPosting); clean, stable URLs; a real 404 page; Lighthouse SEO = 100 |
| Performance | Budgets per page, compressed: HTML ≤ 30 KB, CSS ≤ 25 KB, JavaScript ≤ 20 KB, fonts ≤ 2 files and ≤ 100 KB (≤ 3 files and ≤ 150 KB on pages with code), images sized to their display **(build)**; hashed asset names with long-term caching (D1); LCP < 2.0 s, CLS < 0.05, INP < 200 ms measured with Lighthouse's mobile preset; Lighthouse Performance ≥ 95 on mobile |
| Security | HTTPS only; security headers set by the host: Content-Security-Policy (no inline scripts except the theme script, allowed by its hash), HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`; no third-party scripts; all template text escaped (D1a); secrets (e.g. a GitHub token for F9) only in the host's build environment, never in the repo or the browser |
| Privacy | No cookies and no third-party trackers, so no consent banner is needed [assumption: not legal advice]; the theme choice is stored in `localStorage` only; counters store counts, not personal data, and use IP addresses only transiently for rate limiting |
| UI/UX and design | Passes the Practical UI checklist at every feature gate; one design system (§7); no raw design values outside the token file **(build)** |
| Accessibility | WCAG 2.2 AA. **Build-checked:** contrast for every text/background token pair in both themes; `lang` on every page; alt text on every image; an accessible name on every link and button; one `h1` and ordered headings; a skip link and a `main` landmark; no positive `tabindex`. **Checked at every feature gate:** keyboard-only walkthrough (everything reachable, visible focus, no focus traps, logical order); screen reader pass (NVDA on Windows [assumption: tool]); 200% zoom and 400% reflow at 320 px wide; forced-colors mode; `prefers-reduced-motion`; never color-only meaning. Lighthouse Accessibility = 100, which catches only part of WCAG, so it never replaces the manual checks |
| Browser support | Last 2 versions of evergreen browsers; all content readable without JavaScript |
| Maintainability | Strict TypeScript; every dependency has a decision record (D0) |
| Cost | $0/month |

## 7. Design system specification

The design system is the foundation of F1a and F1b. Everything below becomes tokens, and
components use tokens only: no magic numbers. Rules follow *Practical UI*.

**Token naming (CSS custom properties):** `--text-*` (font sizes, each with a
paired `--leading-*` line height), `--space-*`, `--color-*` (semantic roles
only), `--font-*` (roles), `--radius-*`, `--shadow-*`, `--duration-*`, and
`--ease`. The names in the tables below map directly, e.g. `text-prose` →
`--text-prose`, spacing `m` → `--space-m`.

### 7.1 Typography
- **Font roles** (set in one `fonts` config file; CSS reads only the role variables):

  | Role | Used for | Default |
  |---|---|---|
  | `sans` | All UI and body text | Geist (chosen in F1a; Inter measured 100.1 KB for upright + italic, over budget) |
  | `heading` | Headings | Same as `sans`; can point to a second, more characterful face |
  | `meta` | Small metadata: dates, tags, tech stacks | Same as `sans`; can be switched to `code` for a monospace look |
  | `code` | Code blocks and inline code | Geist Mono (chosen in F1a) |

  At most 2 font families are active at once: `sans` plus either a `heading` face or the `code` face used for `meta`.
- **Weights:** regular (400) and bold (700) only, site-wide. No light or thin weights.
- **Scale:** ratio 1.25 on desktop and 1.2 on mobile, sizes from the scale only. Each size scales fluidly with `clamp()` between its mobile value (at 320 px wide) and its desktop value (at 1280 px wide), so headings don't get huge on phones. Mobile values are a starting point [assumption], tuned in F1a.

  | Token | Mobile | Desktop | Use |
  |---|---|---|---|
  | `text-sm` | 14 px | 14 px | Captions, metadata only |
  | `text-base` | 16 px | 16 px | UI text, cards, nav |
  | `text-prose` | 18 px | 18 px | Long reading: blog posts, project write-ups |
  | `text-lg` | 19 px | 22 px | Lead paragraphs, h4 |
  | `text-xl` | 23 px | 28 px | h3, card titles in features |
  | `text-2xl` | 28 px | 35 px | h2, section titles |
  | `text-3xl` | 33 px | 44 px | h1, page titles |
  | `text-4xl` | 40 px | 55 px | Hero only |

- **Line height:** body and prose 1.5 minimum; headings 1.2; hero 1.1. Line height shrinks as size grows.
- **Letter spacing:** −0.01em to −0.02em for sizes ≥ 28 px; default elsewhere.
- **Line length:** prose containers capped at about 65 characters (`max-width: 65ch`), on the text container, not the whole layout.
- **Alignment:** left-aligned everywhere, including the hero.
- **Hierarchy:** change only 1–2 properties per level (size, weight, or color), not all at once.

### 7.2 Spacing and layout
- **Scale** (multiples of 8; 4 only for tight spots like icon-to-label gaps):

  | Token | Value |
  |---|---|
  | `2xs` | 4 px (tight UI only) |
  | `xs` | 8 px |
  | `s` | 16 px |
  | `m` | 24 px |
  | `l` | 32 px |
  | `xl` | 48 px |
  | `2xl` | 80 px |

- **Relatedness rule:** the more related two things are, the less space between them. Label to value `xs`; items within a group `s`–`m`; blocks within a section `l`–`xl`; section to section `2xl` (`xl` on mobile). Padding inside a group is never larger than the space around it.
- **Grouping:** use spacing first, then similarity, then containers. No boxes inside boxes (this matters most for the bento grid).
- **Containers:** `content` (~ 680 px, reading) and `wide` (~ 1120 px, grids). Horizontal gutters `s` on mobile, `m` on tablet and up.
- **Grid:** 4 columns on mobile, 8 on tablet, 12 on desktop, gutters from the spacing scale.
- **Breakpoints:** `sm` 640, `md` 768, `lg` 1024, `xl` 1280. Built mobile first.
- **Hierarchy check:** every page passes the squint test: blurred, the focal point and groups are still clear.

### 7.3 Color
- **Semantic tokens only** in components, mapped to raw palette values:

  | Group | Tokens |
  |---|---|
  | Text | `text` (dark tinted neutral, never pure black/white), `text-secondary` (still ≥ 4.5:1) |
  | Backgrounds | `bg`, `bg-subtle`, `surface-raised` |
  | Borders | `border-strong` (≥ 3:1, for interactive controls), `border-subtle` (decorative dividers only) |
  | Accent | 5 steps: `accent-strongest`, `accent-hover`, `accent`, `accent-light`, `accent-lightest`; plus `on-accent` for text on accent |
  | State overlays | `overlay-hover` (≈ 8%), `overlay-press` (≈ 16%) layered on any surface instead of new colors per component |
  | Status | `success`, `warning`, `danger`, `info`: status only, never decorative |
  | Focus | `focus-ring` (≥ 3:1 against adjacent colors) |

- **Neutrals** are tinted slightly toward the active accent hue so grays feel cohesive.
- **Accent usage:** mainly for interactive elements (links, primary buttons, selected states, focus). Not sprinkled decoratively, so users can tell what's clickable.
- **Accent choices:** 3–4 curated accents, user-selectable (a deliberate exception to "one brand color", for interactivity). Only one is active at a time. Because neutrals are tinted by the active accent, every accent × theme combination is effectively its own palette, and the contrast check covers all of them: text on every background, `on-accent` on `accent`, links on backgrounds, `border-strong` and `focus-ring` against their surroundings.
- **Themes:** light and a dedicated dark palette (not an inversion): dark gray background, off-white text, slightly desaturated accents, raised surfaces lighter. Colors authored in OKLCH and contrast verified. [memory]
- **Never color alone:** links in running text are underlined; status uses icon + text + color.

### 7.4 Components: buttons and links
- **Three button weights:** primary (solid accent), secondary (outlined, `border-strong`), tertiary (text only). Same height, padding, radius, and type; only visual weight differs.
- **One primary per view** (e.g. the hero has one primary action; others are secondary or tertiary).
- **Labels** are verb + noun ("Download resume", "Email me"), sentence case.
- **Target size** ≥ 48×48 px hit area, with space between adjacent targets.
- **States:** every interactive element designs default, hover, focus-visible, pressed, selected (where relevant), and loading (where relevant). Focus is never removed without a replacement. Avoid disabled buttons.
- **Links:** underlined in running text; nav, cards, and footer lists may drop the underline.

### 7.5 Shape, elevation, motion
- **Radius:** `sm`, `md`, `lg`, `full`.
- **Elevation:** at most 2 levels (soft, two-layer shadows, light from above); dark theme uses lighter surfaces instead of shadows.
- **Motion:** duration tokens (`fast` 120 ms, `base` 200 ms, `slow` 320 ms) and one easing curve; everything disabled under `prefers-reduced-motion`.

### 7.6 Copywriting rules
- Sentence case for headings, buttons, labels, and nav. Minimal UPPERCASE (short labels only, with slight letter spacing).
- Concise, plain language; front-load the important words; inverted pyramid in bios and post intros.
- Descriptive link text; never "click here" or "read more" alone.
- Numerals for numbers ("3 projects"). No full stops in headings, labels, or buttons.
- No "my" in navigation ("Projects", not "My projects").
- One term per concept, used everywhere.

## 8. Feature list

Priority: **P0** launch-blocking · **P1** launch-desirable · **P2** post-launch.
Status: `planned` · `in progress` · `done` · `dropped`.
IDs are stable; the **Order** column is the build sequence.

| Order | ID | Feature | Priority | Status |
|---|---|---|---|---|
| 1 | F1a | Design tokens and fonts | P0 | done |
| 2 | F1b | Layout shell | P0 | in progress |
| 3 | F12 | Deploy pipeline and performance budgets | P0 | planned |
| 4 | F2 | Site config and feature flags | P0 | planned |
| 5 | F3 | Theme switcher | P0 | planned |
| 6 | F4 | Hero / about | P0 | planned |
| 7 | F5 | Projects (list + detail pages) | P0 | planned |
| 8 | F6 | Bento grid | P1 | planned |
| 9 | F7 | Experience timeline and resume | P1 | planned |
| 10 | F8 | Blog | P0 | planned |
| 11 | F9 | GitHub widgets | P2 | planned |
| 12 | F10 | Counters (page views, global clicks) | P2 | planned |
| 13 | F11 | SEO and polish | P0 | planned |

### F1a — Design tokens and fonts
Project foundations first: TypeScript 7 check for build and browser scripts (D6),
a minimal build script producing one page (D1), and the `html` escaping helper
(D1a). Then tokens from §7 as CSS custom properties in one token file (type,
spacing, color for light and dark, radius, elevation, motion) inside cascade
layers; `fonts.css` with self-hosted `.woff2` files and role variables (D4); base
typography styles; the raw-value check script (D2); a token demo page.
**Acceptance:** the demo page renders every token; swapping a font family in one
file changes it site-wide; switching `meta` to monospace is a one-line change;
the check script fails on a raw value outside the token file; every
text/background pair in every accent × theme combination passes AA contrast
(build-checked, §7.3); the `html` helper escapes interpolated text (tested).

### F1b — Layout shell
Layout templates and CSS (container, section, stack, grid); header with nav
(desktop + mobile menu), footer, skip link; button and link styles with all three
weights; a static 404 page; the page `<head>` template with all metadata (R9),
a site-wide default link-preview image (1200×630), favicons, and `theme-color`;
a minimal `site.config.ts` (site name, URL, description, navigation) that F2
later extends; the dev server with reload on change (D7).
**Acceptance:** every interactive element shows all its states; no raw design
values outside the token file; layout works 320 px → 2560 px and at 200% zoom
with no horizontal scrolling; keyboard navigation reaches everything with visible
focus; the mobile menu works without JavaScript or degrades to a visible link
list; the build fails when a page is missing metadata, has a duplicate title, or
has no `h1` or skipped heading levels; passes the Practical UI checklist.

### F12 — Deploy pipeline and performance budgets
The host builds and deploys the site from the main branch on every push, with
preview deploys for other branches if the host supports them. The build runs all
checks (tokens, metadata, headings, and the per-page performance budgets from
§6, R10) before deploying.
**Acceptance:** the F1b shell is live on a public URL as static HTML (content
visible in View Source); a broken build or a failed check does not replace the
live site; the production build fails while the site URL is still the
placeholder `https://example.com` (Q8); a page over budget fails the build with a message naming the page,
the asset type, and the amount over; a PR whose title doesn't follow the commit
format fails CI.

### F2 — Site config and feature flags
Extends the minimal `site.config.ts` from F1b: name, role, bio, location and
time zone (IANA name, e.g. `Asia/Kathmandu`), email, socials, resume (Q9),
navigation, feature flags (R3), font choices; with validation.
**Acceptance:** invalid config fails type-check/build; disabling a feature removes
its section, nav link, and sitemap entry.

### F3 — Theme switcher
Light / dark / system, plus a picker for 3–4 curated accents; persisted locally; applied before first paint. The control lives in the header so it's reachable from every page; the bento grid (F6) may show a second copy.
**Acceptance:** no theme flash on hard reload; works without JS (falls back to OS preference); every accent passes AA contrast in both themes; picker options are labeled, not color-only.

### F4 — Hero / about
Name, headline, short bio, calls to action: one primary (resume or email, Q5), others secondary/tertiary. The About page's longer bio also comes from this feature.
**Acceptance:** above the fold on mobile; left-aligned; one primary action; content sourced entirely from config.

### F5 — Projects
Project collection (title, summary, tech tags, links, image, featured, draft); list
on home (featured) and `/projects`; detail page per project.
**Acceptance:** adding a Markdown file adds a static project page; a missing or invalid field fails the build with a message naming the file and field; the list stays usable with 50+ projects (R8); every image has alt text and dimensions, is served in sizes that fit the screen, and lazy-loads below the fold (R11).
**Decisions at start:** Markdown parser dependency vs HTML fragments (D3); image resizing dependency vs sizes exported by hand (D0).

### F6 — Bento grid
Tiles: connect/socials, location + local time, currently working on, theme picker,
optional live tiles (F9, F10). Each tile toggleable.
**Acceptance:** grid reflows cleanly at every breakpoint; tiles never overlap or leave awkward gaps; no cards nested inside tiles; the local-time tile renders a stable placeholder in the static HTML and fills in after load without shifting the layout.

### F7 — Experience timeline and resume
Roles with company, title, dates, highlights, tech; shown as a timeline on the
About page and as an HTML resume at `/resume/` generated from the same data
(one source of truth, Q9), with print styles that produce a clean PDF.
**Acceptance:** ongoing roles show "Present"; dates sorted newest first; the
resume page prints to A4 and US Letter without cut-off content, links show their
URLs in print, and it reads cleanly as plain text (for applicant-tracking
systems).

### F8 — Blog
Markdown posts with frontmatter (title, description, date, tags, draft, cover);
index, tag filtering, post page with table of contents, code blocks, reading
time, RSS.
**Acceptance:** each post is a static page with correct metadata, structured data (BlogPosting), and a link-preview image (the site default from F1b until F11 adds per-post images); drafts excluded from production; the index and tag pages stay usable with 200 posts (paginated or grouped by year, R8); long code lines scroll inside their block, not the page.
**Decision at start:** syntax highlighting (a dependency at build time) vs styled, uncolored code blocks.

### F9 — GitHub widgets
Recent commits and language breakdown. Fetched at build time; refreshed by a scheduled rebuild (e.g. a daily GitHub Actions job that triggers the host's deploy hook) or an optional client refresh.
**Acceptance:** renders a fallback when the API is rate-limited or down; a GitHub failure at build time never fails the build; data shows when it was last updated and is refreshed on a schedule (scheduled rebuild or client refresh); no token exposed to the client.

### F10 — Counters
Page views and a global click counter via a small separate backend on a free tier (e.g. a Cloudflare Worker), called from a small browser script.
**To define at start:** what counts as a page view (every load, or once per visitor per day; whether known bots are excluded).
**Acceptance:** counts survive restarts; concurrent clicks never lose increments (atomic increment, not read-add-write); abuse-limited (rate limit per client); widget degrades to hidden on failure.
**Open risk:** free-tier write limits vary by storage product (e.g. KV writes are much tighter than reads) [memory] — verify before choosing storage.

### F11 — SEO and polish
Per-post link-preview images (approach decided at start: static images, SVG
templates, or a generator dependency), structured data (Person, BlogPosting),
sitemap and robots, print styles, native cross-page view transitions as an
enhancement, and a full Lighthouse and accessibility audit.
**Acceptance:** targets in §6 met on production URL.

## 9. Edge cases (cross-cutting)

- Empty collections (no posts/projects yet): section hides or shows a tasteful empty state, never a blank block.
- Large collections (200 posts, 50 projects): lists paginate or group; build time stays within target (R8, §6).
- Oversized or missing images: the build flags images far larger than their display size and images without alt text or dimensions (R11).
- Slow or unreliable networks: text renders with fallback fonts first; nothing essential waits on JavaScript or third-party requests.
- Extreme viewports: very narrow (320 px), very wide (2560 px), landscape phones, and 200% zoom, with no horizontal scrolling and text never wider than its reading measure.
- Keyboard-only use: the mobile menu, theme picker, and any disclosure can be opened, used, and closed with the keyboard, and focus returns to where it was.
- Screen readers: decorative icons are hidden from them; icon-only controls have text labels; live widgets (counters, clock) don't announce every tick.
- Forced-colors (Windows high-contrast) mode: borders, focus rings, and icons stay visible because they don't rely on background colors or shadows alone.
- User text-size and spacing overrides (WCAG text spacing): layouts don't clip or overlap when users increase line height, letter spacing, or font size.
- Very long names, titles, or unbroken strings (URLs): wrap or truncate without breaking layout.
- JavaScript disabled or failed: all content readable; interactive widgets hidden, not broken.
- Web fonts slow or blocked: metric-matched fallbacks, `font-display: swap`, no large layout shift.
- Third-party API failure or rate limit (GitHub, counters): cached/fallback values, never a crash.
- Reduced motion and high-contrast/forced-colors modes respected.
- Printing the page (the resume especially): readable print styles, built in F11.
- Unknown routes: styled 404 page, also prerendered.
- **Theme vs static HTML:** static HTML can't know a visitor's saved theme, so a small inline script in `<head>` sets it before first paint (R-4).
- **Untrusted text in templates:** any text from content or config is escaped by the `html` helper; only explicitly trusted HTML (rendered Markdown from our own repo) bypasses it (D1a).
- **Time-dependent content** (local-time tile, "3 days ago" dates): anything computed at build time goes stale, so it renders a stable value in HTML and updates after load.
- **Concurrent writes** (click counter): simultaneous clicks from many visitors must not overwrite each other.
- **Build-time data goes stale** (GitHub widgets): show when it was last updated and refresh on a schedule.

## 10. Open questions and risks

| # | Item | Resolve by |
|---|---|---|
| Q2 | The 3–4 accent hues | During F1a/F3 |
| Q3 | Hosting platform (D5) | Before F12 |
| Q5 | Which hero action is primary: resume or email? | Before F4 |
| Q6 | Markdown parser dependency vs HTML fragments (D3) | Start of F5 |
| Q8 | The real domain (one I own), and whether the site lives at its root or a subdomain. Until then, `site.config.ts` uses `https://example.com`, which is reserved for examples | Before F12 |
| R-3 | Counter storage free-tier limits (F10) — **verify** | Before F10 |
| R-4 | Saved theme applied before first paint on static pages (inline script in `<head>`) | During F1a/F3 |
| R-6 | The custom build script and dev server become hard to maintain (D1, D7) | Watch from F1a |

Resolved questions and closed risks are removed from this table; their answers
live in the relevant sections and the change log records when they were decided.

## 11. Future enhancements

Good ideas deliberately left out of the current scope. Each gets a feature ID
and a row in §8 when promoted; dependencies still follow D0.

| # | Enhancement | Why it's valuable | Notes |
|---|---|---|---|
| **Work** | | | |
| FE1 | Case-study format for projects: problem, approach, my role, result with numbers | Tells the story behind a project, not just its name | A write-up template for F5 content |
| FE3 | Testimonials / recommendations | Social proof from managers and peers | Content from LinkedIn recommendations, with permission |
| FE4 | Talks, writing elsewhere, and open-source contributions page | Shows reach beyond personal projects | Could reuse F9 data |
| **Content** | | | |
| FE5 | Public "Today I learned" notes, grown from `docs/learnings.md` | Low-effort, frequent content that also helps search | Same format as learnings |
| FE6 | Post series with previous/next navigation, and related posts | Keeps readers on the site; groups long topics | Build-time only |
| FE7 | `/now` and `/uses` pages | Common personal-site pages that show personality | Static pages |
| FE8 | Footnotes / sidenotes and a reading-progress indicator in posts | Better long-form reading | CSS-first |
| FE9 | Scheduled posts (publish on a future date) | Write ahead, release on a schedule | Needs the scheduled rebuild from F9 |
| **Discovery and navigation** | | | |
| FE10 | Site search over posts and projects | Useful once content grows (R8) | Build-time JSON index + a small script, no service |
| FE11 | Command palette (Ctrl/⌘ + K) and keyboard shortcuts | Fast navigation; a nod to the reference site | Must stay fully accessible |
| FE12 | Filter projects by technology | Visitors can jump to the stack they care about | Build-time tag pages, no JavaScript needed |
| **Interaction and fun** | | | |
| FE13 | "Now playing" or "currently reading" tile in the bento grid | Personality, like the reference's live tiles | Third-party API; same fallback rules as R5 |
| FE14 | Guestbook | Memorable and interactive | Needs a backend, moderation, and spam protection |
| FE15 | Contact form | Easier than email for some visitors | Depends on Q13; spam protection |
| **Quality and operations** | | | |
| FE16 | Real-user performance monitoring (Core Web Vitals from real visits) | Lab scores (Lighthouse) don't show real devices | A tiny script sending to the counters backend (F10) |
| FE17 | Automated accessibility and visual regression tests in CI | Catches regressions between manual checks | Likely a dependency; decide by D0 |
| FE18 | Offline reading of visited posts (service worker) | Posts stay readable on bad connections | Native service worker |
| FE19 | Site changelog page generated from commit history | Shows how the site evolved; reuses the commit convention | Build-time `git log` |
| FE20 | Accessibility statement page | States the WCAG target and how to report issues | Static page |
| FE21 | Nepali translation | Reaches a local audience | Revisits A4; needs `hreflang` and per-language URLs |
| FE22 | Measurement: Google Search Console and Bing Webmaster Tools, plus cookie-free analytics (e.g. Cloudflare Web Analytics) | Shows whether posts are being found and what people read | Search console registration is free and needs only a DNS record; analytics must keep the Privacy target (§6) |

## 12. Change log

| Date | Change |
|---|---|
| 2026-09-27 | v0.1–v0.6 — First drafts on TanStack Start, React, and Tailwind: Practical UI rules adopted, first-principles workflow, F1 split into F1a/F1b, deploy moved early (F12), documentation model. |
| 2026-09-27 | v0.7 — Native-first stack (D0–D7): the framework, Tailwind and its helpers, content-collections, Fontsource, and commitlint were all dropped in favor of HTML, CSS, TypeScript, and Node's standard library. |
| 2026-09-27 | v0.8–v0.9 — Problem statement built on six qualities (responsive, scalable, search-optimized, designed with care, accessible, performance-focused); goals G7–G11, rules R8–R12, build-enforced targets in §6. |
| 2026-09-27 | v0.10–v0.12 — Gap review: project structure, information architecture, URL scheme, token naming, caching, security and privacy, test strategy; future enhancements (§11); decisions on pages, resume, contact, GitHub, MIT license, and placeholder domain. |
| 2026-09-28 | v0.13 — Cleanup: removed resolved questions, closed risks, superseded decisions, and version asides; condensed the change log. Removed the local commit-message hook: PRs are squash-merged, so F12 checks PR titles in CI instead. Problem statement reworded to a plain, casual tone. |
| 2026-09-28 | v0.14 — F1a spike S1: TypeScript 7 setup verified (D6 now high confidence, R-7 closed). Added `@types/node` as a second dev-only dependency (D0). Node requirement tightened to ≥ 24.12, where type stripping is stable. Absolute imports via Node subpath imports; tests moved to a mirrored `tests/` folder. Docs layered: `docs/README.md` map, `docs/fundamentals.md`, and an Understanding section in every feature doc. |
| 2026-09-30 | v0.15 — Q1 resolved in F1a L4: Geist + Geist Mono, self-hosted (Inter measured 100.1 KB for upright + italic, over the 100 KB budget); `meta` stays on the sans font so the mono file loads only on pages with code. |
| 2026-09-30 | v0.16 — F1a done (all 5 layers: tokens, color, fonts, raw-value check, plus a `pnpm preview` server and an accessibility close-out). Q2 resolved: violet default accent, all 4 selectable. Next: F1b (layout shell). |
| 2026-09-30 | v0.17 — F1b (layout shell) started: Phase 1 approved at Gate 1, checklist frozen. Container queries (D2) upgraded from `[memory]` to `[verified]` — 94.87% global usage, full support across Chrome/Edge/Safari/Firefox's last 2 versions. Two spikes resolved: mobile menu disclosure snaps open/closed (no cross-browser way to animate it); `fs.watch` on Windows fires 2 events per save, requires debouncing. |
| 2026-10-01 | v0.18 — F1b L1 (layout primitives, page shell, container queries) and L2 (head metadata, build check, `site.config.ts`, placeholder favicons/OG image, computed `theme-color`) done. `site.config.ts` created a layer earlier than planned (L2, not L3), since canonical URLs need a site URL to exist. |
