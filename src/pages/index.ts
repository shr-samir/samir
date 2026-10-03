import { html } from "#src/lib/html.ts";
import type { Page } from "#src/lib/page.ts";
import { document } from "#src/layout/document.ts";

// Placeholder until the layout shell (F1b) and hero (F4) replace it.
export default function pages(): Page[] {
  return [
    {
      path: "/",
      body: document({
        path: "/",
        title: "Samir Shrestha",
        description: "Personal site of Samir Shrestha. Under construction.",
        lang: "en",
        body: html`    <main class="container">
      <h1>Samir Shrestha</h1>
      <p>This site is under construction.</p>
    </main>`,
      }),
    },
  ];
}
