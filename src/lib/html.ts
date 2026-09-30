/**
 * HTML templating with escaping by default (D1a).
 *
 * `html` is a tagged template: literal parts are trusted markup written in the
 * source; every interpolated value is escaped unless it is already `SafeHtml`
 * (another `html` fragment, or text explicitly marked trusted with `raw()`).
 */

/** Markup that is safe to insert without escaping. */
export class SafeHtml {
  readonly value: string;

  constructor(value: string) {
    this.value = value;
  }

  toString(): string {
    return this.value;
  }
}

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escapes text for use in element content and quoted attribute values. */
export function escape(text: string): string {
  return text.replace(/[&<>"']/g, (char) => ESCAPES[char] ?? char);
}

/** Marks trusted HTML (e.g. rendered Markdown from this repo) to skip escaping. */
export function raw(markup: string): SafeHtml {
  return new SafeHtml(markup);
}

/**
 * Values allowed inside `${}`. Booleans, `null` and `undefined` render nothing,
 * so conditionals like `${isOpen && html`…`}` work.
 */
export type HtmlValue =
  | SafeHtml
  | string
  | number
  | bigint
  | boolean
  | null
  | undefined
  | readonly HtmlValue[];

function renderValue(value: HtmlValue): string {
  if (value instanceof SafeHtml) return value.value;
  if (value === null || value === undefined || typeof value === "boolean") return "";
  if (Array.isArray(value)) return value.map(renderValue).join("");
  if (typeof value === "string") return escape(value);
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  // Reachable only by bypassing the types; fail loudly rather than print "[object Object]".
  throw new TypeError(`Cannot render ${typeof value} in html template`);
}

export function html(strings: TemplateStringsArray, ...values: HtmlValue[]): SafeHtml {
  let out = strings[0] ?? "";
  for (let i = 0; i < values.length; i++) {
    out += renderValue(values[i]) + (strings[i + 1] ?? "");
  }
  return new SafeHtml(out);
}
