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

/** The lesson facts that decide which Ace pack paints first. */
export type AceLesson = {
  courseLanguage: string;
  editorTheme: string;
};

export type AcePack = {
  specifier: string;
  load: () => Promise<unknown>;
};

function pack(specifier: string, load: () => Promise<unknown>): AcePack {
  return { specifier, load };
}

export const REACT_ACE = "react-ace";

export const ACE_CORE = pack("ace-builds/src-noconflict/ace", () =>
  import("ace-builds/src-noconflict/ace"),
);

export const ACE_LANGUAGE_TOOLS = pack(
  "ace-builds/src-noconflict/ext-language_tools",
  () => import("ace-builds/src-noconflict/ext-language_tools"),
);

export const ACE_MODE_PACKS: Record<AceMode, AcePack> = {
  html: pack("ace-builds/src-noconflict/mode-html", () =>
    import("ace-builds/src-noconflict/mode-html"),
  ),
  css: pack("ace-builds/src-noconflict/mode-css", () =>
    import("ace-builds/src-noconflict/mode-css"),
  ),
  javascript: pack("ace-builds/src-noconflict/mode-javascript", () =>
    import("ace-builds/src-noconflict/mode-javascript"),
  ),
  python: pack("ace-builds/src-noconflict/mode-python", () =>
    import("ace-builds/src-noconflict/mode-python"),
  ),
};

export const ACE_THEME_PACKS: Record<AceTheme, AcePack> = {
  dracula: pack("ace-builds/src-noconflict/theme-dracula", () =>
    import("ace-builds/src-noconflict/theme-dracula"),
  ),
  chrome: pack("ace-builds/src-noconflict/theme-chrome", () =>
    import("ace-builds/src-noconflict/theme-chrome"),
  ),
  github: pack("ace-builds/src-noconflict/theme-github", () =>
    import("ace-builds/src-noconflict/theme-github"),
  ),
  monokai: pack("ace-builds/src-noconflict/theme-monokai", () =>
    import("ace-builds/src-noconflict/theme-monokai"),
  ),
  tomorrow: pack("ace-builds/src-noconflict/theme-tomorrow", () =>
    import("ace-builds/src-noconflict/theme-tomorrow"),
  ),
  twilight: pack("ace-builds/src-noconflict/theme-twilight", () =>
    import("ace-builds/src-noconflict/theme-twilight"),
  ),
  xcode: pack("ace-builds/src-noconflict/theme-xcode", () =>
    import("ace-builds/src-noconflict/theme-xcode"),
  ),
};

export const ACE_SNIPPET_PACKS: Record<AceMode, AcePack> = {
  html: pack("ace-builds/src-noconflict/snippets/html", () =>
    import("ace-builds/src-noconflict/snippets/html"),
  ),
  css: pack("ace-builds/src-noconflict/snippets/css", () =>
    import("ace-builds/src-noconflict/snippets/css"),
  ),
  javascript: pack("ace-builds/src-noconflict/snippets/javascript", () =>
    import("ace-builds/src-noconflict/snippets/javascript"),
  ),
  python: pack("ace-builds/src-noconflict/snippets/python", () =>
    import("ace-builds/src-noconflict/snippets/python"),
  ),
};

const packsBySpecifier = new Map<string, AcePack>(
  [
    ACE_CORE,
    ACE_LANGUAGE_TOOLS,
    ...Object.values(ACE_MODE_PACKS),
    ...Object.values(ACE_THEME_PACKS),
    ...Object.values(ACE_SNIPPET_PACKS),
  ].map((item) => [item.specifier, item]),
);

export function loadAcePack(specifier: string): Promise<unknown> {
  const found = packsBySpecifier.get(specifier);
  if (!found) {
    throw new Error(`Unknown Ace pack: ${specifier}`);
  }
  return found.load();
}

export function isKnownAcePack(specifier: string): boolean {
  return packsBySpecifier.has(specifier);
}

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

export function aceLoadPlan(lesson: AceLesson): AceLoadPlan {
  const mode = activeAceMode(lesson.courseLanguage);
  const theme = activeAceTheme(lesson.editorTheme);

  return {
    mode,
    theme,
    core: ACE_CORE.specifier,
    withEditor: [ACE_MODE_PACKS[mode].specifier, ACE_THEME_PACKS[theme].specifier, REACT_ACE],
    deferredModes: ACE_MODES.filter((item) => item !== mode).map(
      (item) => ACE_MODE_PACKS[item].specifier,
    ),
    deferredThemes: ACE_THEMES.filter((item) => item !== theme).map(
      (item) => ACE_THEME_PACKS[item].specifier,
    ),
    deferredSnippets: ACE_MODES.map((item) => ACE_SNIPPET_PACKS[item].specifier),
    languageTools: ACE_LANGUAGE_TOOLS.specifier,
  };
}
