import {
  ACE_MODES,
  ACE_THEMES,
  aceLoadPlan,
  type AceMode,
  type AceTheme,
} from "./ace-packs";

type AceEditorComponent = typeof import("react-ace").default;

type AceNamespace = {
  config: {
    setModuleLoader: (moduleName: string, loader: () => Promise<unknown>) => void;
  };
  require: (moduleName: string) => unknown;
};

const modeImporters: Record<AceMode, () => Promise<unknown>> = {
  html: () => import("ace-builds/src-noconflict/mode-html"),
  css: () => import("ace-builds/src-noconflict/mode-css"),
  javascript: () => import("ace-builds/src-noconflict/mode-javascript"),
  python: () => import("ace-builds/src-noconflict/mode-python"),
};

const themeImporters: Record<AceTheme, () => Promise<unknown>> = {
  dracula: () => import("ace-builds/src-noconflict/theme-dracula"),
  chrome: () => import("ace-builds/src-noconflict/theme-chrome"),
  github: () => import("ace-builds/src-noconflict/theme-github"),
  monokai: () => import("ace-builds/src-noconflict/theme-monokai"),
  tomorrow: () => import("ace-builds/src-noconflict/theme-tomorrow"),
  twilight: () => import("ace-builds/src-noconflict/theme-twilight"),
  xcode: () => import("ace-builds/src-noconflict/theme-xcode"),
};

const snippetImporters: Record<AceMode, () => Promise<unknown>> = {
  html: () => import("ace-builds/src-noconflict/snippets/html"),
  css: () => import("ace-builds/src-noconflict/snippets/css"),
  javascript: () => import("ace-builds/src-noconflict/snippets/javascript"),
  python: () => import("ace-builds/src-noconflict/snippets/python"),
};

let corePromise: Promise<AceNamespace> | null = null;
let reactAcePromise: Promise<AceEditorComponent> | null = null;
let deferredPromise: Promise<void> | null = null;

function asAce(mod: unknown): AceNamespace {
  const record = mod as { default?: AceNamespace } & Partial<AceNamespace>;
  const ace = record.default?.config ? record.default : record.config ? (record as AceNamespace) : undefined;
  if (!ace?.config?.setModuleLoader || typeof ace.require !== "function") {
    throw new Error("Ace core did not load");
  }
  return ace;
}

function registerPackLoaders(ace: AceNamespace) {
  for (const mode of ACE_MODES) {
    const modeId = `ace/mode/${mode}`;
    const snippetId = `ace/snippets/${mode}`;
    ace.config.setModuleLoader(modeId, () =>
      modeImporters[mode]().then(() => ace.require(modeId)),
    );
    ace.config.setModuleLoader(snippetId, () =>
      snippetImporters[mode]().then(() => ace.require(snippetId)),
    );
  }
  for (const theme of ACE_THEMES) {
    const themeId = `ace/theme/${theme}`;
    ace.config.setModuleLoader(themeId, () =>
      themeImporters[theme]().then(() => ace.require(themeId)),
    );
  }
}

function loadAce(): Promise<AceNamespace> {
  if (!corePromise) {
    corePromise = import("ace-builds/src-noconflict/ace").then((mod) => {
      const ace = asAce(mod);
      registerPackLoaders(ace);
      return ace;
    });
  }
  return corePromise;
}

function loadReactAce(): Promise<AceEditorComponent> {
  if (!reactAcePromise) {
    reactAcePromise = import("react-ace").then((mod) => mod.default);
  }
  return reactAcePromise;
}

/** Ace core, the active mode, one theme, and react-ace. Enough to type with highlighting. */
export function prepareAceEditor(input: {
  courseLanguage: string;
  editorTheme: string;
}): Promise<AceEditorComponent> {
  const plan = aceLoadPlan(input);
  return loadAce().then(() =>
    Promise.all([
      modeImporters[plan.mode](),
      themeImporters[plan.theme](),
      loadReactAce(),
    ]).then(([, , Editor]) => Editor),
  );
}

/**
 * Remaining modes, themes, and snippet modules. Snippets are bundled imports,
 * registered before language tools, so Ace never script-loads snippets/*.js.
 */
export function loadDeferredAcePacks(input: {
  courseLanguage: string;
  editorTheme: string;
}): Promise<void> {
  if (!deferredPromise) {
    const plan = aceLoadPlan(input);
    deferredPromise = loadAce().then(() =>
      Promise.all([
        ...ACE_MODES.filter((mode) => mode !== plan.mode).map((mode) => modeImporters[mode]()),
        ...ACE_THEMES.filter((theme) => theme !== plan.theme).map((theme) =>
          themeImporters[theme](),
        ),
        ...ACE_MODES.map((mode) => snippetImporters[mode]()),
      ]).then(() => import("ace-builds/src-noconflict/ext-language_tools").then(() => undefined)),
    );
  }
  return deferredPromise;
}
