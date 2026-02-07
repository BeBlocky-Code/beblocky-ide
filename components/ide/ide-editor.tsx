"use client";

import { useState, useEffect, useRef } from "react";
import { useSettings } from "./context/settings-context";
import { useTheme } from "./context/theme-provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2 } from "lucide-react";
import dynamic from "next/dynamic";

// Dynamically import Ace Editor to avoid SSR issues
const AceEditor = dynamic(
  async () => {
    // Import the core Ace module first
    await import("ace-builds/src-noconflict/ace");

    // Import modes
    await import("ace-builds/src-noconflict/mode-html");
    await import("ace-builds/src-noconflict/mode-css");
    await import("ace-builds/src-noconflict/mode-javascript");
    await import("ace-builds/src-noconflict/mode-python");

    // Import themes
    await import("ace-builds/src-noconflict/theme-dracula");
    await import("ace-builds/src-noconflict/theme-chrome");
    await import("ace-builds/src-noconflict/theme-github");
    await import("ace-builds/src-noconflict/theme-monokai");
    await import("ace-builds/src-noconflict/theme-tomorrow");
    await import("ace-builds/src-noconflict/theme-twilight");
    await import("ace-builds/src-noconflict/theme-xcode");

    // Import extensions
    await import("ace-builds/src-noconflict/ext-language_tools");

    // Finally import the React component
    const ace = await import("react-ace");
    return ace.default;
  },
  { ssr: false }
);

interface CodeState {
  htmlCode: string;
  cssCode: string;
  jsCode: string;
  pythonCode: string;
}

export default function IdeEditor({
  setMainCode,
  startingCode = "",
  externalCode,
  courseLanguage = "web",
}: {
  setMainCode: (code: string) => void;
  startingCode?: string;
  externalCode?: string | null;
  courseLanguage?: string;
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

  // Initialize with starting code if provided
  useEffect(() => {
    if (startingCode && !initializedRef.current) {
      try {
        setCode(
          isPythonCourse
            ? extractPythonCode(startingCode)
            : extractCodeSections(startingCode)
        );
        initializedRef.current = true;
      } catch (error) {
        console.error("Error parsing starting code:", error);
      }
    }
  }, [startingCode, isPythonCourse]);

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
  const editorTheme =
    settings.editorTheme || (theme === "dark" ? "dracula" : "chrome");

  return (
    <div className="h-full flex flex-col bg-background border rounded-md overflow-hidden">
      <div className="border-b flex items-center justify-between p-2 bg-muted/30">
        <h3 className="text-sm font-medium">Code Editor</h3>

        {!isVerticalLayout && !isPythonCourse && (
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-auto"
          >
            <TabsList className="h-8 bg-muted/50">
              <TabsTrigger value="html" className="text-xs px-3">
                HTML
              </TabsTrigger>
              <TabsTrigger value="css" className="text-xs px-3">
                CSS
              </TabsTrigger>
              <TabsTrigger value="js" className="text-xs px-3">
                JavaScript
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleLayout}
          className="h-8 w-8"
        >
          {isVerticalLayout ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </Button>
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
              <AceEditor
                mode="python"
                theme={editorTheme}
                onChange={(value) => handleCodeChange(value, "pythonCode")}
                value={code.pythonCode}
                name="python-editor"
                width="100%"
                height="100%"
                fontSize={settings.fontSize || 14}
                showPrintMargin={false}
                showGutter={true}
                highlightActiveLine={true}
                setOptions={{
                  enableBasicAutocompletion: true,
                  enableLiveAutocompletion: true,
                  enableSnippets: true,
                  showLineNumbers: true,
                  tabSize: 4,
                  useWorker: false,
                }}
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
              <AceEditor
                mode="html"
                theme={editorTheme}
                onChange={(value) => handleCodeChange(value, "htmlCode")}
                value={code.htmlCode}
                name="html-editor"
                width="100%"
                height="calc(100% - 24px)"
                fontSize={settings.fontSize || 14}
                showPrintMargin={false}
                showGutter={true}
                highlightActiveLine={true}
                setOptions={{
                  enableBasicAutocompletion: true,
                  enableLiveAutocompletion: true,
                  enableSnippets: true,
                  showLineNumbers: true,
                  tabSize: 2,
                  useWorker: false,
                }}
              />
            </div>

            <div className="flex-1 min-h-[33%] border-b">
              <div className="bg-[#1e1e1e] text-white text-xs px-3 py-1">
                style.css
              </div>
              <AceEditor
                mode="css"
                theme={editorTheme}
                onChange={(value) => handleCodeChange(value, "cssCode")}
                value={code.cssCode}
                name="css-editor"
                width="100%"
                height="calc(100% - 24px)"
                fontSize={settings.fontSize || 14}
                showPrintMargin={false}
                showGutter={true}
                highlightActiveLine={true}
                setOptions={{
                  enableBasicAutocompletion: true,
                  enableLiveAutocompletion: true,
                  enableSnippets: true,
                  showLineNumbers: true,
                  tabSize: 2,
                  useWorker: false,
                }}
              />
            </div>

            <div className="flex-1 min-h-[33%]">
              <div className="bg-[#1e1e1e] text-white text-xs px-3 py-1">
                script.js
              </div>
              <AceEditor
                mode="javascript"
                theme={editorTheme}
                onChange={(value) => handleCodeChange(value, "jsCode")}
                value={code.jsCode}
                name="js-editor"
                width="100%"
                height="calc(100% - 24px)"
                fontSize={settings.fontSize || 14}
                showPrintMargin={false}
                showGutter={true}
                highlightActiveLine={true}
                setOptions={{
                  enableBasicAutocompletion: true,
                  enableLiveAutocompletion: true,
                  enableSnippets: true,
                  showLineNumbers: true,
                  tabSize: 2,
                  useWorker: false,
                }}
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
              <AceEditor
                mode="html"
                theme={editorTheme}
                onChange={(value) => handleCodeChange(value, "htmlCode")}
                value={code.htmlCode}
                name="html-editor"
                width="100%"
                height="calc(100% - 24px)"
                fontSize={settings.fontSize || 14}
                showPrintMargin={false}
                showGutter={true}
                highlightActiveLine={true}
                setOptions={{
                  enableBasicAutocompletion: true,
                  enableLiveAutocompletion: true,
                  enableSnippets: true,
                  showLineNumbers: true,
                  tabSize: 2,
                  useWorker: false,
                }}
              />
            </TabsContent>

            <TabsContent
              value="css"
              className="h-full m-0 p-0 data-[state=active]:flex-1"
            >
              <div className="bg-[#1e1e1e] text-white text-xs px-3 py-1">
                style.css
              </div>
              <AceEditor
                mode="css"
                theme={editorTheme}
                onChange={(value) => handleCodeChange(value, "cssCode")}
                value={code.cssCode}
                name="css-editor"
                width="100%"
                height="calc(100% - 24px)"
                fontSize={settings.fontSize || 14}
                showPrintMargin={false}
                showGutter={true}
                highlightActiveLine={true}
                setOptions={{
                  enableBasicAutocompletion: true,
                  enableLiveAutocompletion: true,
                  enableSnippets: true,
                  showLineNumbers: true,
                  tabSize: 2,
                  useWorker: false,
                }}
              />
            </TabsContent>

            <TabsContent
              value="js"
              className="h-full m-0 p-0 data-[state=active]:flex-1"
            >
              <div className="bg-[#1e1e1e] text-white text-xs px-3 py-1">
                script.js
              </div>
              <AceEditor
                mode="javascript"
                theme={editorTheme}
                onChange={(value) => handleCodeChange(value, "jsCode")}
                value={code.jsCode}
                name="js-editor"
                width="100%"
                height="calc(100% - 24px)"
                fontSize={settings.fontSize || 14}
                showPrintMargin={false}
                showGutter={true}
                highlightActiveLine={true}
                setOptions={{
                  enableBasicAutocompletion: true,
                  enableLiveAutocompletion: true,
                  enableSnippets: true,
                  showLineNumbers: true,
                  tabSize: 2,
                  useWorker: false,
                }}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
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
  const htmlMatch = /<body>([\s\S]*?)<\/body>/i.exec(source);
  const cssMatch = /<style>([\s\S]*?)<\/style>/i.exec(source);
  const jsMatch = /<script>([\s\S]*?)<\/script>/i.exec(source);

  return {
    htmlCode: htmlMatch ? htmlMatch[1].trim() : "",
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
