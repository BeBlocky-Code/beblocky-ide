"use client";

import { useState, useEffect, useRef } from "react";
import { useSettings } from "./context/settings-context";
import { useTheme } from "./context/theme-provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2, Code, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { activeAceTheme } from "@/lib/ace-packs";
import {
  AceRuntimeProvider,
  useAceRuntime,
  useAceRuntimeValue,
} from "./use-ace-runtime";

interface CodeState {
  htmlCode: string;
  cssCode: string;
  jsCode: string;
  pythonCode: string;
}

export default function IdeEditor({
  setMainCode,
  startingCode = "",
  defaultValue = "",
  externalCode,
  courseLanguage = "web",
  onLoadMyCode,
  isLoadingSavedCode,
}: {
  setMainCode: (code: string) => void;
  startingCode?: string;
  defaultValue?: string;
  externalCode?: string | null;
  courseLanguage?: string;
  onLoadMyCode?: () => void;
  isLoadingSavedCode?: boolean;
}) {
  const { settings } = useSettings();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState("html");
  const [isVerticalLayout, setIsVerticalLayout] = useState(false);
  const [code, setCode] = useState<CodeState>({
    htmlCode: "",
    cssCode: "",
    jsCode: "",
    pythonCode: "",
  });
  const initializedRef = useRef(false);

  const normalizedCourseLanguage = (courseLanguage || "web").toLowerCase();
  const isPythonCourse = normalizedCourseLanguage === "python";

  // Initialize with starting code or defaultValue if provided
  useEffect(() => {
    if (!initializedRef.current) {
      const initialValue = defaultValue || startingCode;
      if (initialValue) {
        try {
          setCode(
            isPythonCourse
              ? extractPythonCode(initialValue)
              : extractCodeSections(initialValue)
          );
          initializedRef.current = true;
        } catch (error) {
          console.error("Error parsing initial code:", error);
        }
      }
    }
  }, [startingCode, defaultValue, isPythonCourse]);

  // Load external code when provided (e.g., "Load My Code" action)
  useEffect(() => {
    if (!externalCode) return;

    try {
      setCode(
        isPythonCourse
          ? extractPythonCode(externalCode)
          : extractCodeSections(externalCode)
      );
    } catch (error) {
      console.error("Error parsing external code:", error);
    }
  }, [externalCode, isPythonCourse]);

  // Debounce syncing code to parent to avoid re-rendering whole tree on every keystroke
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingMainRef = useRef<string>("");
  const DEBOUNCE_MS = 400;

  useEffect(() => {
    const nextMain =
      isPythonCourse ? code.pythonCode || "" : generateHtmlTemplate(code);
    pendingMainRef.current = nextMain;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      setMainCode(nextMain);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
        setMainCode(pendingMainRef.current);
      }
    };
  }, [code, setMainCode, isPythonCourse]);

  const handleCodeChange = (value: string, language: keyof CodeState) => {
    setCode((prev) => ({
      ...prev,
      [language]: value,
    }));
  };

  const toggleLayout = () => {
    setIsVerticalLayout(!isVerticalLayout);
  };

  // Determine the editor theme based on system theme and settings
  const editorRef = useRef<HTMLDivElement>(null);
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    if (!editorRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setIsNarrow(entry.contentRect.width < 500);
      }
    });

    observer.observe(editorRef.current);
    return () => observer.disconnect();
  }, []);

  const editorTheme =
    settings.editorTheme || (theme === "dark" ? "dracula" : "chrome");
  const ace = useAceRuntime(normalizedCourseLanguage, editorTheme);
  const requestedTheme = activeAceTheme(editorTheme);
  const resolvedTheme = ace.readyThemes.has(requestedTheme)
    ? requestedTheme
    : (ace.readyThemes.values().next().value ?? "dracula");

  const accentColor = theme === "dark" ? "#892FFF" : "#FF932C";

  return (
    <AceRuntimeProvider
      value={{
        Editor: ace.Editor,
        readyModes: ace.readyModes,
        theme: resolvedTheme,
        toolsReady: ace.toolsReady,
        fontSize: settings.fontSize || 14,
      }}
    >
    <div ref={editorRef} className="h-full flex flex-col bg-background border rounded-xl overflow-hidden shadow-sm transition-all duration-300 ease-in-out">
      <div className="border-b flex items-center justify-between px-2 md:px-3 py-1.5 bg-muted/20 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Code size={16} style={{ color: accentColor }} />
          <h3 className={cn("text-sm font-semibold tracking-tight", isNarrow ? "hidden" : "hidden sm:block")}>Code Editor</h3>
        </div>

        <div className="flex items-center gap-1.5 md:gap-3">
          {onLoadMyCode && (
            <Button
              variant="outline"
              size="sm"
              onClick={onLoadMyCode}
              disabled={isLoadingSavedCode}
              style={{ borderColor: `${accentColor}4d`, color: accentColor }}
              className="h-7 px-2 md:px-3 text-[10px] uppercase tracking-wider font-bold rounded-full transition-all hover:bg-muted/10"
            >
              {isLoadingSavedCode ? (
                <Loader2 className="h-3 w-3 animate-spin md:mr-1.5" />
              ) : (
                <RefreshCw className="h-3 w-3 md:mr-1.5" />
              )}
              <span className={isNarrow ? "hidden" : "hidden md:inline"}>Load My Code</span>
            </Button>
          )}

          {!isVerticalLayout && !isPythonCourse && (
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-auto"
            >
              <TabsList className="h-7 md:h-8 bg-background/50 border rounded-full p-0.5 md:p-1 gap-0.5 md:gap-1">
                <TabsTrigger 
                  value="html" 
                  className={cn("text-[10px] md:text-xs px-2.5 md:px-4 rounded-full data-[state=active]:text-white transition-all h-full", isNarrow && "px-1.5")}
                  style={{ backgroundColor: activeTab === "html" ? accentColor : "transparent" }}
                >
                  {isNarrow ? "H" : "HTML"}
                </TabsTrigger>
                <TabsTrigger 
                  value="css" 
                  className={cn("text-[10px] md:text-xs px-2.5 md:px-4 rounded-full data-[state=active]:text-white transition-all h-full", isNarrow && "px-1.5")}
                  style={{ backgroundColor: activeTab === "css" ? accentColor : "transparent" }}
                >
                  {isNarrow ? "C" : "CSS"}
                </TabsTrigger>
                <TabsTrigger 
                  value="js" 
                  className={cn("text-[10px] md:text-xs px-2.5 md:px-4 rounded-full data-[state=active]:text-white transition-all h-full", isNarrow && "px-1.5")}
                  style={{ backgroundColor: activeTab === "js" ? accentColor : "transparent" }}
                >
                  {isNarrow ? "J" : "JS"}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleLayout}
            className="h-7 w-7 md:h-8 md:w-8 rounded-full hover:bg-muted/50 hidden sm:flex"
          >
            {isVerticalLayout ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </Button>
        </div>
      </div>

      <div
        className={`flex-1 overflow-hidden ${
          isVerticalLayout ? "flex flex-col" : ""
        }`}
      >
        {isPythonCourse ? (
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="bg-[#1e1e1e] text-white text-xs px-3 py-1">
              main.py
            </div>
            <div className="flex-1 min-h-0">
              <BoundAce
                mode="python"
                onChange={(value) => handleCodeChange(value, "pythonCode")}
                value={code.pythonCode}
                name="python-editor"
                height="100%"
                tabSize={4}
              />
            </div>
          </div>
        ) : isVerticalLayout ? (
          // Vertical layout - all editors stacked
          <>
            <div className="flex-1 min-h-[33%] border-b">
              <div className="bg-[#1e1e1e] text-white text-xs px-3 py-1">
                index.html
              </div>
              <BoundAce
                mode="html"
                onChange={(value) => handleCodeChange(value, "htmlCode")}
                value={code.htmlCode}
                name="html-editor"
                height="calc(100% - 24px)"
                tabSize={2}
              />
            </div>

            <div className="flex-1 min-h-[33%] border-b">
              <div className="bg-[#1e1e1e] text-white text-xs px-3 py-1">
                style.css
              </div>
              <BoundAce
                mode="css"
                onChange={(value) => handleCodeChange(value, "cssCode")}
                value={code.cssCode}
                name="css-editor"
                height="calc(100% - 24px)"
                tabSize={2}
              />
            </div>

            <div className="flex-1 min-h-[33%]">
              <div className="bg-[#1e1e1e] text-white text-xs px-3 py-1">
                script.js
              </div>
              <BoundAce
                mode="javascript"
                onChange={(value) => handleCodeChange(value, "jsCode")}
                value={code.jsCode}
                name="js-editor"
                height="calc(100% - 24px)"
                tabSize={2}
              />
            </div>
          </>
        ) : (
          // Tabbed layout
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="h-full"
          >
            <TabsContent
              value="html"
              className="h-full m-0 p-0 data-[state=active]:flex-1"
            >
              <div className="bg-[#1e1e1e] text-white text-xs px-3 py-1">
                index.html
              </div>
              <BoundAce
                mode="html"
                onChange={(value) => handleCodeChange(value, "htmlCode")}
                value={code.htmlCode}
                name="html-editor"
                height="calc(100% - 24px)"
                tabSize={2}
              />
            </TabsContent>

            <TabsContent
              value="css"
              className="h-full m-0 p-0 data-[state=active]:flex-1"
            >
              <div className="bg-[#1e1e1e] text-white text-xs px-3 py-1">
                style.css
              </div>
              <BoundAce
                mode="css"
                onChange={(value) => handleCodeChange(value, "cssCode")}
                value={code.cssCode}
                name="css-editor"
                height="calc(100% - 24px)"
                tabSize={2}
              />
            </TabsContent>

            <TabsContent
              value="js"
              className="h-full m-0 p-0 data-[state=active]:flex-1"
            >
              <div className="bg-[#1e1e1e] text-white text-xs px-3 py-1">
                script.js
              </div>
              <BoundAce
                mode="javascript"
                onChange={(value) => handleCodeChange(value, "jsCode")}
                value={code.jsCode}
                name="js-editor"
                height="calc(100% - 24px)"
                tabSize={2}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
    </AceRuntimeProvider>
  );
}

function BoundAce({
  mode,
  value,
  onChange,
  name,
  height,
  tabSize,
}: {
  mode: "html" | "css" | "javascript" | "python";
  value: string;
  onChange: (value: string) => void;
  name: string;
  height: string;
  tabSize: number;
}) {
  const ace = useAceRuntimeValue();
  if (!ace?.Editor || !ace.readyModes.has(mode)) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ width: "100%", height }}
        role="status"
      >
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="sr-only">Loading editor</span>
      </div>
    );
  }

  const Editor = ace.Editor;
  return (
    <Editor
      mode={mode}
      theme={ace.theme}
      onChange={onChange}
      value={value}
      name={name}
      width="100%"
      height={height}
      fontSize={ace.fontSize}
      showPrintMargin={false}
      showGutter={true}
      highlightActiveLine={true}
      setOptions={{
        enableBasicAutocompletion: ace.toolsReady,
        enableLiveAutocompletion: ace.toolsReady,
        enableSnippets: ace.toolsReady,
        showLineNumbers: true,
        tabSize,
        useWorker: false,
      }}
    />
  );
}

// Generate the HTML template from the code sections
function generateHtmlTemplate({
  htmlCode,
  cssCode,
  jsCode,
}: CodeState): string {
  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      ${cssCode || ""}
    </style>
  </head>
  <body>
    ${htmlCode || ""}
    <script>
      ${jsCode || ""}
    </script>
  </body>
</html>
  `.trim();
}

function extractCodeSections(source: string): CodeState {
  // Use non-greedy match for body content to avoid capturing outside body
  const htmlMatch = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(source);
  const cssMatch = /<style[^>]*>([\s\S]*?)<\/style>/i.exec(source);
  const jsMatch = /<script[^>]*>([\s\S]*?)<\/script>/i.exec(source);

  // When extracting HTML, we want to strip the specific script/style tags we might have injected
  let htmlContent = htmlMatch ? htmlMatch[1].trim() : "";
  
  // Actually, the issue is that our generateHtmlTemplate puts <script> INSIDE <body>
  // and <style> inside <head>.
  // extractCodeSections regex for jsMatch will find the <script> inside the <body>.
  // But our htmlMatch will also find that <script> inside the body.
  // We need to remove the <script> tag from the htmlContent if it exists.
  
  if (htmlContent) {
    htmlContent = htmlContent.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "").trim();
  }

  return {
    htmlCode: htmlContent,
    cssCode: cssMatch ? cssMatch[1].trim() : "",
    jsCode: jsMatch ? jsMatch[1].trim() : "",
    pythonCode: "",
  };
}

function extractPythonCode(source: string): CodeState {
  // Preserve whatever we receive as raw python; keep web sections empty.
  return {
    htmlCode: "",
    cssCode: "",
    jsCode: "",
    pythonCode: source || "",
  };
}
