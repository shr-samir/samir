import { html } from "#src/lib/html.ts";
import type { Page } from "#src/lib/page.ts";

// Placeholder until the layout shell (F1b) and hero (F4) replace it.
export default function pages(): Page[] {
  return [
    {
      path: "/",
      body: html`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Samir Shrestha</title>
    <meta name="description" content="Personal site of Samir Shrestha. Under construction.">
  </head>
  <body>
    <main>
      <h1>Samir Shrestha</h1>
      <p>This site is under construction.</p>
    </main>
  </body>
</html>
`,
    },
  ];
}
