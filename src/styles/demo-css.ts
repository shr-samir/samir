/**
 * Styles for the token demo page (/design/). One class per token, generated
 * from the token data so the page can show every token without inline styles.
 */
import { radii, shadows, spacing, typeScale, weights } from "#src/styles/tokens.ts";
import { ROLES } from "#src/styles/palette.ts";

const STATUS_ROLES = ["success", "warning", "danger", "info"] as const;

export function demoCss(): string {
  const rules = [
    ...ROLES.map((role) => `.demo-swatch-${role} { background: var(--color-${role}); }`),
    ...STATUS_ROLES.map((role) => `.demo-status-${role} { color: var(--color-${role}); }`),
    ...typeScale.map(
      (t) =>
        `.demo-text-${t.name} { font-size: var(--text-${t.name}); line-height: var(--leading-${t.name}); letter-spacing: var(--tracking-${t.name}); }`,
    ),
    ...weights.map((w) => `.demo-weight-${w.name} { font-weight: var(--weight-${w.name}); }`),
    ...spacing.map((s) => `.demo-space-${s.name} { inline-size: var(--space-${s.name}); }`),
    ...radii.map((r) => `.demo-radius-${r.name} { border-radius: var(--radius-${r.name}); }`),
    ...shadows.map((s) => `.demo-shadow-${s.name} { box-shadow: var(--shadow-${s.name}); }`),
  ];

  return `/* Token demo page. Per-token classes are generated from src/styles/tokens.ts. */
@layer components {
  .demo {
    max-inline-size: var(--width-wide);
    margin-inline: auto;
    padding: var(--space-xl) var(--space-s);
  }

  .demo > * + * {
    margin-block-start: var(--space-xl);
  }

  .demo section > * + * {
    margin-block-start: var(--space-m);
  }

  .demo header > * + * {
    margin-block-start: var(--space-xs);
  }

  .demo section > p {
    max-inline-size: var(--measure-prose);
  }

  .demo-lead {
    font-size: var(--text-lg);
    line-height: var(--leading-lg);
    max-inline-size: var(--measure-prose);
  }

  .demo-list {
    list-style: none;
    padding: 0;
    display: grid;
    gap: var(--space-l);
  }

  .demo-meta {
    font-size: var(--text-sm);
    line-height: var(--leading-sm);
    margin-block-start: var(--space-xs);
    color: var(--color-text-secondary);
  }

  .demo-bar {
    block-size: var(--space-s);
    background: currentColor;
  }

  .demo-grid {
    list-style: none;
    padding: 0;
    display: grid;
    gap: var(--space-l);
    grid-template-columns: repeat(auto-fill, minmax(calc(var(--space-2xl) * 2), 1fr));
  }

  .demo-box {
    aspect-ratio: 1;
    border: 1px solid var(--color-border-strong);
    background: var(--color-surface-raised);
    display: grid;
    place-content: center;
    text-align: center;
    padding: var(--space-s);
  }

  /* No border on elevation samples: the shadow alone should show the level. */
  .demo-box:is(${shadows.map((s) => `.demo-shadow-${s.name}`).join(", ")}) {
    border: 0;
  }

  .demo-table {
    border-collapse: collapse;
  }

  .demo-table :is(th, td) {
    text-align: start;
    padding: var(--space-xs) var(--space-m) var(--space-xs) 0;
    border-block-end: 1px solid var(--color-border-subtle);
  }

  /* Color: one panel per accent × theme. Each panel sets its own color-scheme and
     data-accent, and restates color and background so they resolve inside it. */
  .demo-palettes {
    list-style: none;
    padding: 0;
    display: grid;
    gap: var(--space-m);
    grid-template-columns: repeat(auto-fill, minmax(min(100%, calc(var(--space-2xl) * 4)), 1fr));
  }

  .demo-palette {
    color: var(--color-text);
    background: var(--color-bg);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-lg);
    padding: var(--space-m);
  }

  .demo-palette > * + * {
    margin-block-start: var(--space-s);
  }

  .demo-theme-light {
    color-scheme: light;
  }

  .demo-theme-dark {
    color-scheme: dark;
  }

  .demo-secondary {
    color: var(--color-text-secondary);
  }

  .demo-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
  }

  .demo-button {
    padding: var(--space-xs) var(--space-s);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-accent);
    background: var(--color-accent);
    color: var(--color-on-accent);
    font-weight: var(--weight-bold);
  }

  .demo-button-outline {
    padding: var(--space-xs) var(--space-s);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border-strong);
    color: var(--color-text);
    font-weight: var(--weight-bold);
  }

  .demo-swatches {
    list-style: none;
    padding: 0;
    display: grid;
    gap: var(--space-xs);
    grid-template-columns: repeat(auto-fill, minmax(calc(var(--space-2xl) + var(--space-l)), 1fr));
    font-size: var(--text-sm);
    line-height: var(--leading-sm);
  }

  .demo-swatches code {
    overflow-wrap: anywhere;
  }

  .demo-swatch {
    display: block;
    block-size: var(--space-l);
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border-subtle);
  }

  @media (min-width: 768px) {
    .demo {
      padding-inline: var(--space-m);
    }

    .demo > * + * {
      margin-block-start: var(--space-2xl);
    }
  }

${rules.map((rule) => `  ${rule}`).join("\n")}
}
`;
}
