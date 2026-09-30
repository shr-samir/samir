import { html, type SafeHtml } from "#src/lib/html.ts";

export interface DocumentOptions {
  title: string;
  description: string;
  body: SafeHtml;
}

/**
 * The HTML document around every page. Minimal until the layout shell (F1b)
 * adds the header, footer, canonical URL and link-preview metadata.
 */
export function document({ title, description, body }: DocumentOptions): SafeHtml {
  return html`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    <meta name="description" content="${description}">
    <link rel="preload" href="/fonts/geist-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="stylesheet" href="/site.css">
  </head>
  <body>
${body}
  </body>
</html>
`;
}
