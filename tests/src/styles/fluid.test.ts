import { test } from "node:test";
import assert from "node:assert/strict";
import { fluid, renderedPx, rem } from "#src/styles/fluid.ts";

test("equal min and max gives a plain rem value", () => {
  assert.equal(fluid(16, 16).css, "1rem");
  assert.equal(fluid(14, 14).css, "0.875rem");
});

test("builds the clamp from the line through both endpoints", () => {
  // 40px at 320px, 55px at 1280px: slope 15/960 = 1.5625vw, intercept 40 − 5 = 35px.
  assert.equal(fluid(40, 55).css, "clamp(2.5rem, 2.1875rem + 1.5625vw, 3.4375rem)");
});

test("hits its min at 320px and max at 1280px, and clamps outside", () => {
  const size = fluid(23, 28);
  assert.equal(renderedPx(size, 320), 23);
  assert.equal(renderedPx(size, 1280), 28);
  assert.equal(renderedPx(size, 800), 25.5);
  assert.equal(renderedPx(size, 200), 23);
  assert.equal(renderedPx(size, 2560), 28);
});

test("the CSS string and the model agree at the midpoint", () => {
  // At 800px: 2.1875rem + 1.5625vw = 35 + 12.5 = 47.5px; the model says 40 + 0.5 × 15.
  assert.equal(renderedPx(fluid(40, 55), 800), 47.5);
});

test("rejects min larger than max", () => {
  assert.throws(() => fluid(20, 10), /larger than max/);
});

test("rem rounds to 4 decimals", () => {
  assert.equal(rem(1), "0.0625rem");
  assert.equal(rem(10), "0.625rem");
  assert.equal(rem(1 / 3), "0.0208rem");
});
