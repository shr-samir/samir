import { test } from "node:test";
import assert from "node:assert/strict";
import { outputFile } from "#src/lib/page.ts";

test("maps URL paths to index.html files", () => {
  assert.equal(outputFile("/"), "index.html");
  assert.equal(outputFile("/about/"), "about/index.html");
  assert.equal(outputFile("/blog/page/2/"), "blog/page/2/index.html");
  assert.equal(outputFile("/blog/my-first-post/"), "blog/my-first-post/index.html");
});

test("rejects paths that break the URL scheme", () => {
  for (const path of ["", "about/", "/about", "/About/", "/a_b/", "/a--b/", "/-a/", "/a-/", "//", "/../", "/a/../b/", "/a b/", "/a.html"]) {
    assert.throws(() => outputFile(path), /Invalid page path/, `expected "${path}" to be rejected`);
  }
});
