"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Trash2,
  AlertCircle,
  CheckCircle,
  Info,
  ChevronDown,
} from "lucide-react";

type LogLevel = "info" | "error" | "warning" | "success";

type LogEntry = {
  id: string;
  message: string;
  level: LogLevel;
  timestamp: Date;
};

declare global {
  interface Window {
    loadPyodide?: (options?: any) => Promise<any>;
  }
}

export default function IdeConsole({
  code,
  courseLanguage,
  onMinimize,
}: {
  code: string;
  courseLanguage?: string;
  onMinimize?: () => void;
}) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeTab, setActiveTab] = useState("console");
  const consoleRef = useRef<HTMLDivElement>(null);
  const pyodideRef = useRef<any>(null);
  const pyodideLoadingRef = useRef<Promise<any> | null>(null);
  const pyodideScriptLoadingRef = useRef<Promise<void> | null>(null);

  const normalizedCourseLanguage = (courseLanguage || "web").toLowerCase();
  const isPythonCourse = normalizedCourseLanguage === "python";

  // Clear logs
  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // Add a log entry
  const addLog = useCallback((message: string, level: LogLevel = "info") => {
    const newLog: LogEntry = {
      id: Date.now().toString(),
      message,
      level,
      timestamp: new Date(),
    };
    setLogs((prev) => [...prev, newLog]);
  }, []);

  const ensurePyodideScript = useCallback(async () => {
    if (typeof window === "undefined") return;

    // Already present (either loaded before or injected by something else)
    if (typeof window.loadPyodide === "function") return;

    if (!pyodideScriptLoadingRef.current) {
      pyodideScriptLoadingRef.current = new Promise<void>((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>(
          'script[data-pyodide="true"]'
        );
        if (existing) {
          existing.addEventListener("load", () => resolve());
          existing.addEventListener("error", () =>
            reject(new Error("Failed to load Pyodide script."))
          );
          return;
        }

        const script = document.createElement("script");
        script.dataset.pyodide = "true";
        script.src = "https://cdn.jsdelivr.net/pyodide/v0.29.1/full/pyodide.js";
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load Pyodide script."));
        document.head.appendChild(script);
      });
    }

    await pyodideScriptLoadingRef.current;
  }, []);

  const ensurePyodide = useCallback(async () => {
    if (pyodideRef.current) return pyodideRef.current;
    if (!pyodideLoadingRef.current) {
      pyodideLoadingRef.current = (async () => {
        await ensurePyodideScript();
        const loadPyodide = window.loadPyodide;
        if (typeof loadPyodide !== "function") {
          throw new Error("Pyodide failed to load (window.loadPyodide missing).");
        }

        // indexURL is required when loading from CDN
        const py = await loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.29.1/full/",
        });

        // Fallback: some Pyodide builds expose setStdout/setStderr
        try {
          if (typeof py?.setStdout === "function") {
            py.setStdout({
              batched: (s: string) => s && addLog(s, "info"),
            });
          }
          if (typeof py?.setStderr === "function") {
            py.setStderr({
              batched: (s: string) => s && addLog(s, "error"),
            });
          }
        } catch {
          // ignore
        }

        return py;
      })();
    }

    pyodideRef.current = await pyodideLoadingRef.current;
    return pyodideRef.current;
  }, [addLog, ensurePyodideScript]);

  const runPythonCode = useCallback(
    async (pythonCode: string) => {
      clearLogs();

      if (!pythonCode?.trim()) {
        addLog("No Python code to run.", "warning");
        return;
      }

      try {
        addLog("Loading Python runtime…", "info");
        const py = await ensurePyodide();
        addLog("Running Python…", "info");

        const result =
          typeof py?.runPythonAsync === "function"
            ? await py.runPythonAsync(pythonCode)
            : py.runPython(pythonCode);

        if (result !== undefined && result !== null && String(result).length) {
          addLog(String(result), "success");
        }
      } catch (error: any) {
        addLog(error?.message ? String(error.message) : String(error), "error");
      }
    },
    [addLog, clearLogs, ensurePyodide]
  );

  // Run code and capture console output
  const runCode = useCallback(() => {
    clearLogs();

    if (isPythonCourse) {
      void runPythonCode(code);
      return;
    }

    try {
      // Create a sandbox iframe to run the code
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      document.body.appendChild(iframe);

      // Override console methods to capture logs
      if (iframe.contentWindow) {
        const contentWindow = iframe.contentWindow as Window & {
          console: Console;
        };
        const originalConsole = contentWindow.console;

        contentWindow.console.log = (...args: unknown[]) => {
          originalConsole.log(...args);
          addLog(args.map((arg) => formatLogArgument(arg)).join(" "), "info");
        };

        contentWindow.console.error = (...args: unknown[]) => {
          originalConsole.error(...args);
          addLog(args.map((arg) => formatLogArgument(arg)).join(" "), "error");
        };

        contentWindow.console.warn = (...args: unknown[]) => {
          originalConsole.warn(...args);
          addLog(
            args.map((arg) => formatLogArgument(arg)).join(" "),
            "warning"
          );
        };

        contentWindow.console.info = (...args: unknown[]) => {
          originalConsole.info(...args);
          addLog(args.map((arg) => formatLogArgument(arg)).join(" "), "info");
        };

        // Run the code
        try {
          const doc = iframe.contentDocument || iframe.contentWindow.document;
          doc.open();
          doc.write(code);
          doc.close();
        } catch (error) {
          addLog(`Error running code: ${error}`, "error");
        }

        // Clean up iframe after a delay
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1000);
      }
    } catch (error) {
      addLog(`Error setting up console: ${error}`, "error");
    }
  }, [code, clearLogs, addLog, isPythonCourse, runPythonCode]);

  // Extract JavaScript code from HTML
  const extractJavaScriptFromHTML = (html: string): string => {
    const scriptRegex = /<script>([\s\S]*?)<\/script>/g;
    let match;
    let jsCode = "";

    while ((match = scriptRegex.exec(html)) !== null) {
      jsCode += match[1] + "\n";
    }

    return jsCode;
  };

  // Format log arguments for display
  const formatLogArgument = (arg: unknown): string => {
    if (typeof arg === "object") {
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    }
    return String(arg);
  };

  // Scroll to bottom when logs change
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs]);

  // Get icon based on log level
  const getLogIcon = (level: LogLevel) => {
    switch (level) {
      case "error":
        return <AlertCircle size={16} className="text-red-500" />;
      case "warning":
        return <AlertCircle size={16} className="text-amber-500" />;
      case "success":
        return <CheckCircle size={16} className="text-green-500" />;
      case "info":
      default:
        return <Info size={16} className="text-blue-500" />;
    }
  };

  // Auto-run code when component mounts
  useEffect(() => {
    // Auto-run only for web preview (Python should run on explicit action)
    if (!isPythonCourse && code) {
      runCode();
    }
  }, [code, runCode, isPythonCourse]);

  return (
    <Card className="h-full flex flex-col border-none rounded-none shadow-none">
      <CardHeader className="p-2 border-b flex-row items-center justify-between space-y-0 bg-muted/30">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between w-full">
            <TabsList className="h-8 bg-muted/50">
              <TabsTrigger value="console" className="text-xs px-3">
                Console
              </TabsTrigger>
              <TabsTrigger value="problems" className="text-xs px-3">
                Problems
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={clearLogs}
                className="h-8 w-8"
                title="Clear console"
              >
                <Trash2 size={16} />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={runCode}
                className="h-8 w-8"
                title="Run code"
              >
                <CheckCircle size={16} />
              </Button>

              {onMinimize && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onMinimize}
                  className="h-8 w-8"
                  title="Minimize console"
                >
                  <ChevronDown size={16} />
                </Button>
              )}
            </div>
          </div>
        </Tabs>
      </CardHeader>

      <CardContent className="p-0 flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsContent
            value="console"
            className="h-full m-0 p-0 data-[state=active]:flex flex-col"
          >
            <ScrollArea className="h-full">
              <div className="p-2 font-mono text-sm" ref={consoleRef}>
                {logs.length > 0 ? (
                  logs.map((log) => (
                    <div
                      key={log.id}
                      className="py-1 border-b border-border/40 flex items-start gap-2"
                    >
                      {getLogIcon(log.level)}
                      <pre className="whitespace-pre-wrap break-words flex-1">
                        {log.message}
                      </pre>
                      <span className="text-xs text-muted-foreground ml-2">
                        {log.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-muted-foreground p-4 text-center">
                    Console output will appear here when you run your code.
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent
            value="problems"
            className="h-full m-0 p-0 data-[state=active]:flex flex-col"
          >
            <div className="p-4 text-center text-muted-foreground">
              No problems detected in your code.
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
