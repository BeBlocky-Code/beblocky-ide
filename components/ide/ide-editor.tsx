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
}

export default function IdeEditor({
  setMainCode,
  startingCode = "",
  externalCode,
}: {
  setMainCode: (code: string) => void;
  startingCode?: string;
  externalCode?: string | null;
}) {
  const { settings } = useSettings();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState("html");
  const [isVerticalLayout, setIsVerticalLayout] = useState(false);
  const [code, setCode] = useState<CodeState>({
    htmlCode: "",
    cssCode: "",
    jsCode: "",
  });
  const initializedRef = useRef(false);

  // Initialize with starting code if provided
  useEffect(() => {
    if (startingCode && !initializedRef.current) {
      try {
        setCode(extractCodeSections(startingCode));
        initializedRef.current = true;
      } catch (error) {
        console.error("Error parsing starting code:", error);
      }
    }
  }, [startingCode]);

  // Load external code when provided (e.g., "Load My Code" action)
  useEffect(() => {
    if (!externalCode) return;

    try {
      setCode(extractCodeSections(externalCode));
    } catch (error) {
      console.error("Error parsing external code:", error);
    }
  }, [externalCode]);

  // Update the main code whenever any of the code sections change
  useEffect(() => {
    setMainCode(generateHtmlTemplate(code));
  }, [code, setMainCode]);

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

        {!isVerticalLayout && (
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
        {isVerticalLayout ? (
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
  };
}
