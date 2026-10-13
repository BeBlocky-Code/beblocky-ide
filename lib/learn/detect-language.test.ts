import assert from "node:assert/strict";
import test from "node:test";
import { detectLanguage } from "./detect-language.ts";

test("detects each supported language", () => {
  assert.equal(detectLanguage("import os\ndef f():\n  pass"), "python");
  assert.equal(detectLanguage("public class A {}"), "java");
  assert.equal(detectLanguage("#include <stdio.h>"), "cpp");
  assert.equal(detectLanguage("<div>hi</div>"), "html");
  assert.equal(detectLanguage("body { color: red; }"), "css");
});

test("falls back to javascript", () => {
  assert.equal(detectLanguage("console.log(1)"), "javascript");
  assert.equal(detectLanguage(""), "javascript");
});
