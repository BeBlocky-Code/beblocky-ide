import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSessionToken } from "./session-token.ts";

test("a percent-encoded session cookie is decoded", () => {
  assert.equal(normalizeSessionToken("abc%3D"), "abc=");
});

test("blank cookies are ignored", () => {
  assert.equal(normalizeSessionToken("  "), undefined);
  assert.equal(normalizeSessionToken(undefined), undefined);
  assert.equal(normalizeSessionToken(null), undefined);
});
