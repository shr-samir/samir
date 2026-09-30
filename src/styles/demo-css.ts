/**
 * Styles for the token demo page (/design/). One class per token, generated
 * from the token data so the page can show every token without inline styles.
 */
import { radii, shadows, spacing, typeScale, weights } from "#src/styles/tokens.ts";

export function demoCss(): string {
  const rules = [
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
    border: 1px solid currentColor;
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
    border-block-end: 1px solid currentColor;
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
