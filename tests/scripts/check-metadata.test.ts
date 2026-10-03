import { test } from "node:test";
import assert from "node:assert/strict";
import { checkMetadata, extractMetadata, type PageMetadata } from "#scripts/check-metadata.ts";

const REAL_PAGE = `<!doctype html>
<html lang="en">
  <head>
    <title>Samir Shrestha</title>
    <meta name="description" content="Personal site.">
    <link rel="canonical" href="https://example.com/">
  </head>
  <body></body>
</html>`;

test("extracts title, description and canonical from real page HTML", () => {
  const meta = extractMetadata("/", REAL_PAGE);
  assert.deepEqual(meta, {
    path: "/",
    title: "Samir Shrestha",
    description: "Personal site.",
    canonical: "https://example.com/",
  });
});

test("returns null for each tag that's missing", () => {
  assert.deepEqual(extractMetadata("/x/", "<html><head></head><body></body></html>"), {
    path: "/x/",
    title: null,
    description: null,
    canonical: null,
  });
});

test("a page with no <title> at all is exempt (not a real document)", () => {
  assert.deepEqual(checkMetadata([extractMetadata("/", "<p>fragment only</p>")]), []);
});

function page(overrides: Partial<PageMetadata> & { path: string }): PageMetadata {
  return { title: `Title ${overrides.path}`, description: `Desc ${overrides.path}`, canonical: `https://example.com${overrides.path}`, ...overrides };
}

test("reports every missing field by name, once each page has a title", () => {
  const violations = checkMetadata([page({ path: "/", description: null, canonical: null })]);
  assert.deepEqual(
    violations.map((v) => v.message).sort(),
    ["missing canonical", "missing description"],
  );
});

test("reports a duplicate title, description, or canonical, naming the earlier page", () => {
  const violations = checkMetadata([page({ path: "/a/", title: "Same" }), page({ path: "/b/", title: "Same" })]);
  assert.equal(violations.length, 1);
  assert.equal(violations[0]!.path, "/b/");
  assert.match(violations[0]!.message, /duplicate title "Same", also used by \/a\//);
});

test("does not flag a duplicate for a field that's already reported missing", () => {
  // Two pages both missing canonical: that's 2 "missing" violations, not also a false "duplicate null" report.
  const violations = checkMetadata([page({ path: "/a/", canonical: null }), page({ path: "/b/", canonical: null })]);
  assert.equal(violations.filter((v) => v.message.includes("canonical")).length, 2);
  assert.ok(violations.every((v) => v.message.startsWith("missing")));
});

test("three pages with all-unique metadata produce no violations", () => {
  const violations = checkMetadata([page({ path: "/" }), page({ path: "/about/" }), page({ path: "/blog/" })]);
  assert.deepEqual(violations, []);
});

test("catches a duplicate across three pages, not just adjacent pairs", () => {
  const violations = checkMetadata([
    page({ path: "/a/", canonical: "https://example.com/x" }),
    page({ path: "/b/" }),
    page({ path: "/c/", canonical: "https://example.com/x" }),
  ]);
  assert.equal(violations.length, 1);
  assert.match(violations[0]!.message, /duplicate canonical .*also used by \/a\//);
});
