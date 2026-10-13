"use client";

import { useEffect, useRef, useState } from "react";

/** Layout, IDE/AI mode and settings-panel state. */
export function useLayoutMode() {
  const [currentLayout, setCurrentLayout] = useState("standard");
  const [ideMode, setIdeMode] = useState<"ide" | "ai">("ide");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const layoutTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLayoutTimeout = () => {
    if (layoutTimeoutRef.current) {
      clearTimeout(layoutTimeoutRef.current);
      layoutTimeoutRef.current = null;
    }
  };

  useEffect(() => clearLayoutTimeout, []);

  const handleLayoutChange = (layout: string) => {
    setCurrentLayout(layout);
    clearLayoutTimeout();
    const workspace = document.querySelector('[data-ide-workspace="true"]');
    if (workspace) {
      workspace.classList.add("layout-change");
      layoutTimeoutRef.current = setTimeout(() => {
        layoutTimeoutRef.current = null;
        workspace.classList.remove("layout-change");
      }, 10);
    }
  };

  return {
    currentLayout,
    ideMode,
    setIdeMode,
    isSettingsOpen,
    setIsSettingsOpen,
    handleLayoutChange,
  };
}
