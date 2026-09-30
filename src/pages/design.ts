/**
 * Token demo page (/design/): renders every design token from the token data,
 * so a token added to tokens.ts appears here without editing this file.
 * Public but not in the navigation (F1a L2 decision).
 */
import { html } from "#src/lib/html.ts";
import type { Page } from "#src/lib/page.ts";
import { document } from "#src/layout/document.ts";
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

const SAMPLE = "The quick brown fox jumps over the lazy dog";

function typeSection() {
  return html`<section aria-labelledby="type">
        <h2 id="type">Type scale</h2>
        <p>Sizes that change grow smoothly between a 320px and a 1280px wide window. Resize the window to watch them.</p>
        <ul class="demo-list">
          ${typeScale.map(
            (t) => html`<li>
            <p class="demo-text-${t.name}">${SAMPLE}</p>
            <p class="demo-meta"><code>--text-${t.name}</code> · ${t.mobile === t.desktop ? `${t.mobile}px` : `${t.mobile}px → ${t.desktop}px`} · line height ${t.leading}${t.tracking ? ` · letter spacing ${t.tracking}em` : ""} · ${t.use}</p>
          </li>`,
          )}
        </ul>
      </section>`;
}

function weightSection() {
  return html`<section aria-labelledby="weights">
        <h2 id="weights">Weights</h2>
        <ul class="demo-list">
          ${weights.map(
            (w) => html`<li>
            <p class="demo-text-xl demo-weight-${w.name}">${SAMPLE}</p>
            <p class="demo-meta"><code>--weight-${w.name}</code> · ${w.value}</p>
          </li>`,
          )}
        </ul>
      </section>`;
}

function spacingSection() {
  return html`<section aria-labelledby="spacing">
        <h2 id="spacing">Spacing</h2>
        <p>The more related two things are, the less space between them.</p>
        <ul class="demo-list">
          ${spacing.map(
            (s) => html`<li>
            <div class="demo-bar demo-space-${s.name}"></div>
            <p class="demo-meta"><code>--space-${s.name}</code> · ${s.px}px · ${s.use}</p>
          </li>`,
          )}
        </ul>
      </section>`;
}

function radiusSection() {
  return html`<section aria-labelledby="radius">
        <h2 id="radius">Radius</h2>
        <ul class="demo-grid">
          ${radii.map(
            (r) => html`<li class="demo-box demo-radius-${r.name}">
            <p><code>--radius-${r.name}</code></p>
            <p class="demo-meta">${r.name === "full" ? "fully round" : `${r.px}px`} · ${r.use}</p>
          </li>`,
          )}
        </ul>
      </section>`;
}

function elevationSection() {
  return html`<section aria-labelledby="elevation">
        <h2 id="elevation">Elevation</h2>
        <ul class="demo-grid">
          ${shadows.map(
            (s) => html`<li class="demo-box demo-radius-lg demo-shadow-${s.name}">
            <p><code>--shadow-${s.name}</code></p>
            <p class="demo-meta">${s.use}</p>
          </li>`,
          )}
        </ul>
      </section>`;
}

function motionSection() {
  return html`<section aria-labelledby="motion">
        <h2 id="motion">Motion</h2>
        <p>Every duration becomes 0 seconds when the system asks for reduced motion.</p>
        <table class="demo-table">
          <thead>
            <tr><th scope="col">Token</th><th scope="col">Duration</th><th scope="col">Use</th></tr>
          </thead>
          <tbody>
            ${durations.map(
              (d) => html`<tr><td><code>--duration-${d.name}</code></td><td>${d.ms}ms</td><td>${d.use}</td></tr>`,
            )}
          </tbody>
        </table>
        <p class="demo-meta"><code>--ease</code> · <code>${ease}</code></p>
      </section>`;
}

function layoutSection() {
  const prose = measures.find((m) => m.name === "prose");
  return html`<section aria-labelledby="measure">
        <h2 id="measure">Line length and widths</h2>
        <div class="prose">
          <p>Long-form text is capped at about 65 characters per line (<code>--measure-prose</code>, ${prose?.value}), because lines much longer than that are tiring to read: the eye loses its place when jumping back to the start of the next line. This paragraph uses the prose text size and is capped at that measure.</p>
        </div>
        <table class="demo-table">
          <thead>
            <tr><th scope="col">Token</th><th scope="col">Width</th><th scope="col">Use</th></tr>
          </thead>
          <tbody>
            ${widths.map((w) => html`<tr><td><code>--width-${w.name}</code></td><td>${w.px}px</td><td>${w.use}</td></tr>`)}
          </tbody>
        </table>
      </section>`;
}

function focusSection() {
  return html`<section aria-labelledby="focus">
        <h2 id="focus">Focus</h2>
        <p>Press <kbd>Tab</kbd> to move to <a href="#type">this link back to the type scale</a> and see the focus outline: ${focus.widthPx}px wide, ${focus.offsetPx}px away from the element (<code>--focus-width</code>, <code>--focus-offset</code>). Its color arrives with the palette.</p>
      </section>`;
}

export default function pages(): Page[] {
  return [
    {
      path: "/design/",
      body: document({
        title: "Design system · Samir Shrestha",
        description: "Every design token on this site: type scale, spacing, radius, elevation and motion.",
        body: html`    <main class="demo">
      <header>
        <h1>Design system</h1>
        <p class="demo-lead">Every design token on this site, generated from the same data the stylesheet is built from. Colors and fonts arrive in later layers.</p>
      </header>
      ${typeSection()}
      ${weightSection()}
      ${spacingSection()}
      ${radiusSection()}
      ${elevationSection()}
      ${motionSection()}
      ${layoutSection()}
      ${focusSection()}
    </main>`,
      }),
    },
  ];
}
