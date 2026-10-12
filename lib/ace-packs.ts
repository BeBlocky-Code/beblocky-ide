export const ACE_MODES = ["html", "css", "javascript", "python"] as const;
export type AceMode = (typeof ACE_MODES)[number];

export const ACE_THEMES = [
  "dracula",
  "chrome",
  "github",
  "monokai",
  "tomorrow",
  "twilight",
  "xcode",
] as const;
export type AceTheme = (typeof ACE_THEMES)[number];

const MODE_SPECIFIER: Record<AceMode, string> = {
  html: "ace-builds/src-noconflict/mode-html",
  css: "ace-builds/src-noconflict/mode-css",
  javascript: "ace-builds/src-noconflict/mode-javascript",
  python: "ace-builds/src-noconflict/mode-python",
};

const THEME_SPECIFIER: Record<AceTheme, string> = {
  dracula: "ace-builds/src-noconflict/theme-dracula",
  chrome: "ace-builds/src-noconflict/theme-chrome",
  github: "ace-builds/src-noconflict/theme-github",
  monokai: "ace-builds/src-noconflict/theme-monokai",
  tomorrow: "ace-builds/src-noconflict/theme-tomorrow",
  twilight: "ace-builds/src-noconflict/theme-twilight",
  xcode: "ace-builds/src-noconflict/theme-xcode",
};

const SNIPPET_SPECIFIER: Record<AceMode, string> = {
  html: "ace-builds/src-noconflict/snippets/html",
  css: "ace-builds/src-noconflict/snippets/css",
  javascript: "ace-builds/src-noconflict/snippets/javascript",
  python: "ace-builds/src-noconflict/snippets/python",
};

export type AceLoadPlan = {
  mode: AceMode;
  theme: AceTheme;
  core: string;
  /** Loaded together after Ace core, before the editor mounts. */
  withEditor: string[];
  deferredModes: string[];
  deferredThemes: string[];
  /** Bundled snippet modules. Imported before language tools so Ace never fetches snippets/*.js. */
  deferredSnippets: string[];
  languageTools: string;
};

export function activeAceMode(courseLanguage: string): AceMode {
  return courseLanguage.toLowerCase() === "python" ? "python" : "html";
}

export function activeAceTheme(editorTheme: string): AceTheme {
  return (ACE_THEMES as readonly string[]).includes(editorTheme)
    ? (editorTheme as AceTheme)
    : "dracula";
}

export function aceLoadPlan(input: {
  courseLanguage: string;
  editorTheme: string;
}): AceLoadPlan {
  const mode = activeAceMode(input.courseLanguage);
  const theme = activeAceTheme(input.editorTheme);

  return {
    mode,
    theme,
    core: "ace-builds/src-noconflict/ace",
    withEditor: [MODE_SPECIFIER[mode], THEME_SPECIFIER[theme], "react-ace"],
    deferredModes: ACE_MODES.filter((item) => item !== mode).map((item) => MODE_SPECIFIER[item]),
    deferredThemes: ACE_THEMES.filter((item) => item !== theme).map((item) => THEME_SPECIFIER[item]),
    deferredSnippets: ACE_MODES.map((item) => SNIPPET_SPECIFIER[item]),
    languageTools: "ace-builds/src-noconflict/ext-language_tools",
  };
}
