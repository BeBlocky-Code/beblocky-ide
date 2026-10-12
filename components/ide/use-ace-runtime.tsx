"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { ACE_MODES, ACE_THEMES, aceLoadPlan } from "@/lib/ace-packs";
import { loadDeferredAcePacks, prepareAceEditor } from "@/lib/load-ace";

type AceEditorComponent = typeof import("react-ace").default;

export type AceRuntimeState = {
  Editor: AceEditorComponent | null;
  readyModes: ReadonlySet<string>;
  readyThemes: ReadonlySet<string>;
  toolsReady: boolean;
};

export type AceRuntimeValue = {
  Editor: AceEditorComponent | null;
  readyModes: ReadonlySet<string>;
  theme: string;
  toolsReady: boolean;
  fontSize: number;
};

const AceRuntimeContext = createContext<AceRuntimeValue | null>(null);

export function AceRuntimeProvider({
  value,
  children,
}: {
  value: AceRuntimeValue;
  children: React.ReactNode;
}) {
  return <AceRuntimeContext.Provider value={value}>{children}</AceRuntimeContext.Provider>;
}

export function useAceRuntimeValue(): AceRuntimeValue | null {
  return useContext(AceRuntimeContext);
}

export function useAceRuntime(courseLanguage: string, editorTheme: string): AceRuntimeState {
  const [Editor, setEditor] = useState<AceEditorComponent | null>(null);
  const [readyModes, setReadyModes] = useState<ReadonlySet<string>>(() => new Set());
  const [readyThemes, setReadyThemes] = useState<ReadonlySet<string>>(() => new Set());
  const [toolsReady, setToolsReady] = useState(false);

  useEffect(() => {
    let cancel = false;
    const plan = aceLoadPlan({ courseLanguage, editorTheme });
    void prepareAceEditor({ courseLanguage, editorTheme }).then((Loaded) => {
      if (cancel) return;
      setEditor(() => Loaded);
      setReadyModes((prev) => new Set(prev).add(plan.mode));
      setReadyThemes((prev) => new Set(prev).add(plan.theme));
      // The active editor can paint now. Other packs must not compete with that download.
      void loadDeferredAcePacks({ courseLanguage, editorTheme }).then(() => {
        if (cancel) return;
        setReadyModes(new Set(ACE_MODES));
        setReadyThemes(new Set(ACE_THEMES));
        setToolsReady(true);
      });
    });
    return () => {
      cancel = true;
    };
  }, [courseLanguage, editorTheme]);

  return { Editor, readyModes, readyThemes, toolsReady };
}
