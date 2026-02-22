"use client";

import { useState, useEffect } from "react";
import { useSettings } from "./context/settings-context";
import { useTheme } from "./context/theme-provider";
import { Card, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Monitor, Keyboard, Palette, LayoutGrid, Maximize, LayoutList, Settings, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function IdeSettingsPanel({
  isOpen,
  onClose,
  currentLayout,
  onChangeLayout,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentLayout?: string;
  onChangeLayout?: (layout: string) => void;
}) {
  const { settings, updateSettings } = useSettings();
  const { theme, setTheme } = useTheme();
  const accentColor = theme === "dark" ? "#892FFF" : "#FF932C";
  const [activeTab, setActiveTab] = useState("appearance");

  // Clone settings for local state
  const [localSettings, setLocalSettings] = useState({ ...settings });

  // Update local settings when the settings context changes
  useEffect(() => {
    // Force a re-render when isOpen changes
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    setLocalSettings({ ...settings });
  }, [settings]);

  const handleSave = () => {
    updateSettings(localSettings);
    onClose();
  };

  const handleCancel = () => {
    setLocalSettings({ ...settings });
    onClose();
  };

  if (!isOpen) return null;

  const editorThemes = [
    { value: "dracula", label: "Dracula" },
    { value: "monokai", label: "Monokai" },
    { value: "github", label: "GitHub" },
    { value: "tomorrow", label: "Tomorrow" },
    { value: "twilight", label: "Twilight" },
    { value: "xcode", label: "XCode" },
    { value: "chrome", label: "Chrome" },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <Card className="w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col rounded-[2rem] border-border/40 shadow-2xl bg-background/95 backdrop-blur-md">
        <CardHeader className="border-b border-border/40 p-6 bg-muted/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-muted/20" style={{ color: accentColor }}>
                <Settings size={22} className="animate-[spin_10s_linear_infinite]" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold tracking-tight">Settings</CardTitle>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-0.5">Customize your experience</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleCancel} className="rounded-full hover:bg-muted/50 transition-colors">
              <X size={20} />
            </Button>
          </div>
        </CardHeader>

        <div className="flex-1 overflow-auto p-2">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full h-full flex flex-col"
          >
            <div className="px-4 py-2">
              <TabsList className="w-full bg-muted/30 p-1.5 rounded-full border border-border/40 gap-1">
                <TabsTrigger
                  value="appearance"
                  className="flex-1 flex items-center justify-center gap-2 rounded-full py-2.5 data-[state=active]:text-white transition-all duration-300"
                  style={{ backgroundColor: activeTab === "appearance" ? accentColor : "transparent" }}
                >
                  <Palette size={16} />
                  <span className="text-xs font-bold uppercase tracking-tight">Appearance</span>
                </TabsTrigger>
                <TabsTrigger
                  value="editor"
                  className="flex-1 flex items-center justify-center gap-2 rounded-full py-2.5 data-[state=active]:text-white transition-all duration-300"
                  style={{ backgroundColor: activeTab === "editor" ? accentColor : "transparent" }}
                >
                  <Monitor size={16} />
                  <span className="text-xs font-bold uppercase tracking-tight">Editor</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1">
              <TabsContent value="appearance" className="px-6 py-4 space-y-8 animate-in slide-in-from-right-2 fade-in duration-300 mt-0">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-4 rounded-full" style={{ backgroundColor: accentColor }} />
                    <Label className="text-sm font-bold uppercase tracking-widest text-muted-foreground">App Theme</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className={cn(
                        "h-24 flex-col gap-3 rounded-2xl transition-all border-2",
                        theme === "light" ? "border-primary bg-primary/5" : "border-border/40 hover:border-border/60"
                      )}
                      style={{ borderColor: theme === "light" ? accentColor : undefined }}
                      onClick={() => setTheme("light")}
                    >
                      <div className="w-12 h-12 rounded-xl bg-white border shadow-sm flex items-center justify-center">
                        <Sun size={24} className="text-orange-500" />
                      </div>
                      <span className="font-bold text-sm">Light Mode</span>
                    </Button>
                    <Button
                      variant="outline"
                      className={cn(
                        "h-24 flex-col gap-3 rounded-2xl transition-all border-2",
                        theme === "dark" ? "border-primary bg-primary/5" : "border-border/40 hover:border-border/60"
                      )}
                      style={{ borderColor: theme === "dark" ? accentColor : undefined }}
                      onClick={() => setTheme("dark")}
                    >
                      <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 shadow-sm flex items-center justify-center">
                        <Moon size={24} className="text-indigo-400" />
                      </div>
                      <span className="font-bold text-sm">Dark Mode</span>
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-4 rounded-full" style={{ backgroundColor: accentColor }} />
                    <Label className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Code Syntax</Label>
                  </div>
                  <Select
                    value={localSettings.editorTheme}
                    onValueChange={(value) =>
                      setLocalSettings({ ...localSettings, editorTheme: value })
                    }
                  >
                    <SelectTrigger className="h-12 rounded-xl border-border/40 bg-muted/20 px-4 font-semibold">
                      <SelectValue placeholder="Select a theme" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/40">
                      {editorThemes.map((theme) => (
                        <SelectItem key={theme.value} value={theme.value} className="rounded-lg focus:bg-muted/50 cursor-pointer">
                          {theme.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {onChangeLayout && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1 h-4 rounded-full" style={{ backgroundColor: accentColor }} />
                      <Label className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Default Layout</Label>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "standard", icon: LayoutGrid, label: "Standard" },
                        { id: "focus", icon: Maximize, label: "Focus" },
                        { id: "split", icon: LayoutList, label: "Split" }
                      ].map((layout) => (
                        <Button
                          key={layout.id}
                          variant="outline"
                          className={cn(
                            "flex-col gap-2 h-16 rounded-xl border-2 transition-all",
                            currentLayout === layout.id ? "bg-primary/5" : "border-border/40"
                          )}
                          style={{ borderColor: currentLayout === layout.id ? accentColor : undefined }}
                          onClick={() => onChangeLayout(layout.id)}
                        >
                          <layout.icon size={16} style={{ color: currentLayout === layout.id ? accentColor : "gray" }} />
                          <span className="text-[10px] font-bold uppercase tracking-tight">{layout.label}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="editor" className="px-6 py-4 space-y-8 animate-in slide-in-from-left-2 fade-in duration-300 mt-0">
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-4 rounded-full" style={{ backgroundColor: accentColor }} />
                        <Label className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Font Size</Label>
                      </div>
                      <span className="px-2 py-1 bg-muted/40 rounded-lg text-xs font-bold tabular-nums">
                        {localSettings.fontSize}px
                      </span>
                    </div>
                    <Slider
                      id="fontSize"
                      min={12}
                      max={24}
                      step={1}
                      value={[localSettings.fontSize]}
                      onValueChange={(value) =>
                        setLocalSettings({ ...localSettings, fontSize: value[0] })
                      }
                      className="py-4"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-muted/10 rounded-2xl border border-border/40 hover:bg-muted/20 transition-colors">
                      <div className="space-y-0.5">
                        <Label htmlFor="autoSave" className="text-sm font-bold">Auto Save</Label>
                        <p className="text-[10px] text-muted-foreground font-medium">Save changes as you type</p>
                      </div>
                      <Switch
                        id="autoSave"
                        checked={localSettings.autoSave}
                        onCheckedChange={(checked) =>
                          setLocalSettings({ ...localSettings, autoSave: checked })
                        }
                        style={{ "--switch-bg": accentColor } as any}
                        className="data-[state=checked]:bg-[var(--switch-bg)]"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-muted/10 rounded-2xl border border-border/40 hover:bg-muted/20 transition-colors">
                      <div className="space-y-0.5">
                        <Label htmlFor="wordWrap" className="text-sm font-bold">Word Wrap</Label>
                        <p className="text-[10px] text-muted-foreground font-medium">Wrap long code lines</p>
                      </div>
                      <Switch
                        id="wordWrap"
                        checked={localSettings.wordWrap}
                        onCheckedChange={(checked) =>
                          setLocalSettings({ ...localSettings, wordWrap: checked })
                        }
                        style={{ "--switch-bg": accentColor } as any}
                        className="data-[state=checked]:bg-[var(--switch-bg)]"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <CardFooter className="border-t border-border/40 p-6 flex justify-end gap-3 bg-muted/10">
          <Button variant="ghost" onClick={handleCancel} className="rounded-full px-6 font-bold hover:bg-muted/50">
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            className="rounded-full px-8 font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.03] active:scale-[0.98] border-none"
            style={{ backgroundColor: accentColor }}
          >
            Apply Changes
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
