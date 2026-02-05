"use client";

import type React from "react";

import { createContext, useContext, useState, useEffect, useRef } from "react";

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

  useEffect(() => {
    // Load settings from localStorage on initial render
    const savedSettings = localStorage.getItem("ide-settings");
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch {
        // Silently fail if settings are corrupted
      }
    }
    // Mark initial load complete after a tick
    setTimeout(() => {
      isInitialLoadRef.current = false;
    }, 0);
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

  const openSettings = () => {
    // This would typically open a settings modal or panel
  };
  const closeSettings = () => {
    // This would typically close a settings modal or panel
  };

  return (
    <SettingsContext.Provider
      value={{ settings, updateSettings, openSettings, closeSettings }}
    >
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
