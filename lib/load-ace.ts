import {
  ACE_CORE,
  ACE_MODES,
  ACE_MODE_PACKS,
  ACE_SNIPPET_PACKS,
  ACE_THEMES,
  ACE_THEME_PACKS,
  REACT_ACE,
  aceLoadPlan,
  loadAcePack,
  type AceLesson,
} from "./ace-packs";

type AceEditorComponent = typeof import("react-ace").default;

type AceNamespace = {
  config: {
    setModuleLoader: (moduleName: string, loader: () => Promise<unknown>) => void;
  };
  require: (moduleName: string) => unknown;
};

let corePromise: Promise<AceNamespace> | null = null;
let reactAcePromise: Promise<AceEditorComponent> | null = null;
let deferredPromise: Promise<void> | null = null;

function asAce(mod: unknown): AceNamespace {
  const record = mod as { default?: AceNamespace } & Partial<AceNamespace>;
  const ace = record.default?.config
    ? record.default
    : record.config
      ? (record as AceNamespace)
      : undefined;
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
      ACE_MODE_PACKS[mode].load().then(() => ace.require(modeId)),
    );
    ace.config.setModuleLoader(snippetId, () =>
      ACE_SNIPPET_PACKS[mode].load().then(() => ace.require(snippetId)),
    );
  }
  for (const theme of ACE_THEMES) {
    const themeId = `ace/theme/${theme}`;
    ace.config.setModuleLoader(themeId, () =>
      ACE_THEME_PACKS[theme].load().then(() => ace.require(themeId)),
    );
  }
}

function loadAce(): Promise<AceNamespace> {
  if (!corePromise) {
    corePromise = ACE_CORE.load().then((mod) => {
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
export function prepareAceEditor(lesson: AceLesson): Promise<AceEditorComponent> {
  const plan = aceLoadPlan(lesson);
  return loadAce().then(() =>
    Promise.all([
      ...plan.withEditor
        .filter((specifier) => specifier !== REACT_ACE)
        .map((specifier) => loadAcePack(specifier)),
      loadReactAce(),
    ]).then((loaded) => loaded.at(-1) as AceEditorComponent),
  );
}

/**
 * Remaining modes, themes, and snippet modules. Snippets are bundled imports,
 * registered before language tools, so Ace never script-loads snippets/*.js.
 */
export function loadDeferredAcePacks(lesson: AceLesson): Promise<void> {
  if (!deferredPromise) {
    const plan = aceLoadPlan(lesson);
    deferredPromise = loadAce().then(() =>
      Promise.all([
        ...plan.deferredModes.map((specifier) => loadAcePack(specifier)),
        ...plan.deferredThemes.map((specifier) => loadAcePack(specifier)),
        ...plan.deferredSnippets.map((specifier) => loadAcePack(specifier)),
      ]).then(() => loadAcePack(plan.languageTools).then(() => undefined)),
    );
  }
  return deferredPromise;
}
