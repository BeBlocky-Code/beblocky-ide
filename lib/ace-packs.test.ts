import assert from "node:assert/strict";
import test from "node:test";
import { aceLoadPlan, isKnownAcePack } from "./ace-packs.ts";

test("an HTML lesson paints with Ace core, the HTML mode, and one theme", () => {
  const plan = aceLoadPlan({ courseLanguage: "web", editorTheme: "dracula" });

  assert.equal(plan.core, "ace-builds/src-noconflict/ace");
  assert.deepEqual(plan.withEditor, [
    "ace-builds/src-noconflict/mode-html",
    "ace-builds/src-noconflict/theme-dracula",
    "react-ace",
  ]);
  assert.equal(plan.withEditor.includes("ace-builds/src-noconflict/mode-css"), false);
  assert.equal(plan.withEditor.includes("ace-builds/src-noconflict/ext-language_tools"), false);
  assert.equal(plan.withEditor.includes("ace-builds/src-noconflict/snippets/html"), false);
});

test("a Python lesson paints with the Python mode instead of HTML", () => {
  const plan = aceLoadPlan({ courseLanguage: "Python", editorTheme: "chrome" });

  assert.equal(plan.mode, "python");
  assert.ok(plan.withEditor.includes("ace-builds/src-noconflict/mode-python"));
  assert.equal(plan.withEditor.includes("ace-builds/src-noconflict/mode-html"), false);
  assert.ok(plan.withEditor.includes("ace-builds/src-noconflict/theme-chrome"));
});

test("an unknown theme falls back to dracula for the first paint", () => {
  const plan = aceLoadPlan({ courseLanguage: "html", editorTheme: "not-a-theme" });

  assert.equal(plan.theme, "dracula");
  assert.ok(plan.withEditor.includes("ace-builds/src-noconflict/theme-dracula"));
});

test("other modes, themes, and snippets wait until after the editor can paint", () => {
  const plan = aceLoadPlan({ courseLanguage: "web", editorTheme: "dracula" });

  assert.deepEqual(plan.deferredModes, [
    "ace-builds/src-noconflict/mode-css",
    "ace-builds/src-noconflict/mode-javascript",
    "ace-builds/src-noconflict/mode-python",
  ]);
  assert.equal(plan.deferredThemes.includes("ace-builds/src-noconflict/theme-dracula"), false);
  assert.ok(plan.deferredThemes.includes("ace-builds/src-noconflict/theme-chrome"));
  assert.deepEqual(plan.deferredSnippets, [
    "ace-builds/src-noconflict/snippets/html",
    "ace-builds/src-noconflict/snippets/css",
    "ace-builds/src-noconflict/snippets/javascript",
    "ace-builds/src-noconflict/snippets/python",
  ]);
  assert.equal(plan.languageTools, "ace-builds/src-noconflict/ext-language_tools");
});

test("the loader imports the same packs the plan names", () => {
  const plan = aceLoadPlan({ courseLanguage: "web", editorTheme: "dracula" });
  const named = [
    plan.core,
    ...plan.withEditor,
    ...plan.deferredModes,
    ...plan.deferredThemes,
    ...plan.deferredSnippets,
    plan.languageTools,
  ];

  for (const specifier of named) {
    if (specifier === "react-ace") continue;
    assert.equal(isKnownAcePack(specifier), true, specifier);
  }
});
