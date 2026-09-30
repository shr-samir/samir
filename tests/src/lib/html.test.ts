import { test } from "node:test";
import assert from "node:assert/strict";
import { html, raw, escape, SafeHtml, type HtmlValue } from "#src/lib/html.ts";

test("escapes the five HTML-significant characters", () => {
  assert.equal(escape(`<a href="x">Tom & 'Jerry'</a>`), "&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/a&gt;");
});

test("escapes interpolated text but keeps literal markup", () => {
  const title = "<script>alert(1)</script>";
  assert.equal(html`<h1>${title}</h1>`.value, "<h1>&lt;script&gt;alert(1)&lt;/script&gt;</h1>");
});

test("escapes quotes so values can't break out of attributes", () => {
  const attr = `" onmouseover="alert(1)`;
  assert.equal(html`<a title="${attr}">x</a>`.value, `<a title="&quot; onmouseover=&quot;alert(1)">x</a>`);
  assert.equal(html`<a title='${"' x='y"}'>x</a>`.value, `<a title='&#39; x=&#39;y'>x</a>`);
});

test("renders null, undefined and booleans as nothing", () => {
  assert.equal(html`[${null}${undefined}${false}${true}]`.value, "[]");
});

test("supports conditionals with &&", () => {
  const isOpen: boolean = false;
  assert.equal(html`<p>${isOpen && html`<b>open</b>`}</p>`.value, "<p></p>");
});

test("renders numbers and bigints", () => {
  assert.equal(html`${0} ${3.5} ${10n}`.value, "0 3.5 10");
});

test("joins arrays and escapes each item", () => {
  const items = ["a&b", "<c>"];
  assert.equal(html`<ul>${items.map((item) => html`<li>${item}</li>`)}</ul>`.value, "<ul><li>a&amp;b</li><li>&lt;c&gt;</li></ul>");
  assert.equal(html`${["<", [">", null]]}`.value, "&lt;&gt;");
});

test("does not double-escape nested fragments", () => {
  const inner = html`<em>${"&"}</em>`;
  assert.equal(html`<p>${inner}</p>`.value, "<p><em>&amp;</em></p>");
});

test("raw() bypasses escaping", () => {
  assert.equal(html`<div>${raw("<b>trusted</b>")}</div>`.value, "<div><b>trusted</b></div>");
});

test("returns SafeHtml whose string form is the markup", () => {
  const fragment = html`<p>${"hi"}</p>`;
  assert.ok(fragment instanceof SafeHtml);
  assert.equal(`${fragment}`, "<p>hi</p>");
});

test("handles templates with no interpolations", () => {
  assert.equal(html`<br>`.value, "<br>");
  assert.equal(html``.value, "");
});

test("throws on objects smuggled past the types", () => {
  assert.throws(() => html`${{ a: 1 } as unknown as HtmlValue}`, TypeError);
});
