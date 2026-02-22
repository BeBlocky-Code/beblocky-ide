"use client";

import type React from "react";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useMemo,
} from "react";

type Settings = {
  fontSize: number;
  editorTheme: string;
  keyboardShortcuts: boolean;
  autoSave: boolean;
  wordWrap: boolean;
};

type SettingsContextType = {
  settings: Settings;
  updateSettings: (settings: Partial<Settings>) => void;
  openSettings: () => void;
  closeSettings: () => void;
};

const defaultSettings: Settings = {
  fontSize: 14,
  editorTheme: "dracula",
  keyboardShortcuts: true,
  autoSave: true,
  wordWrap: false,
};

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoadRef = useRef(true);
  const initialLoadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  useEffect(() => {
    const savedSettings = localStorage.getItem("ide-settings");
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch {
        // Silently fail if settings are corrupted
      }
    }
    initialLoadTimeoutRef.current = setTimeout(() => {
      initialLoadTimeoutRef.current = null;
      isInitialLoadRef.current = false;
    }, 0);
    return () => {
      if (initialLoadTimeoutRef.current) {
        clearTimeout(initialLoadTimeoutRef.current);
        initialLoadTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // Skip saving during initial load to prevent unnecessary writes
    if (isInitialLoadRef.current) return;

    // Debounce localStorage writes by 1 second to reduce disk I/O
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      localStorage.setItem("ide-settings", JSON.stringify(settings));
      saveTimeoutRef.current = null;
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [settings]);

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const openSettings = () => {};
  const closeSettings = () => {};

  const contextValue = useMemo(
    () => ({ settings, updateSettings, openSettings, closeSettings }),
    [settings]
  );

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);

  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }

  return context;
};
