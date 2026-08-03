"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
  type KeyboardEvent,
} from "react";
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
  Play,
} from "lucide-react";
import { BEBLOCKY_REPL_SETUP, PS1, PS2 } from "@/lib/python-repl";

type LogLevel = "info" | "error" | "warning" | "success";

type LogEntry = {
  id: string;
  message: string;
  level: LogLevel;
  timestamp: Date;
};

type TranscriptLine = {
  id: string;
  text: string;
  kind: "out" | "err" | "in" | "sys";
};

export type IdeConsoleHandle = {
  run: () => void;
};

declare global {
  interface Window {
    loadPyodide?: (options?: Record<string, unknown>) => Promise<any>;
    beblockyReadStdin?: () => Promise<string>;
  }
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const IdeConsole = forwardRef<
  IdeConsoleHandle,
  {
    code: string;
    courseLanguage?: string;
    onMinimize?: () => void;
  }
>(function IdeConsole({ code, courseLanguage, onMinimize }, ref) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeTab, setActiveTab] = useState("console");
  const consoleRef = useRef<HTMLDivElement>(null);
  const pyodideRef = useRef<any>(null);
  const pyodideLoadingRef = useRef<Promise<any> | null>(null);
  const pyodideScriptLoadingRef = useRef<Promise<void> | null>(null);
  const runCodeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runCodeIframeRef = useRef<HTMLIFrameElement | null>(null);
  const runCodeMessageHandlerRef = useRef<((e: MessageEvent) => void) | null>(
    null
  );
  const runCodeIdRef = useRef<string | null>(null);
  const pyodideScriptListenersRef = useRef<{
    script: HTMLScriptElement;
    onLoad: () => void;
    onError: () => void;
  } | null>(null);

  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [lineInput, setLineInput] = useState("");
  const [prompt, setPrompt] = useState(PS1);
  const [replReady, setReplReady] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [awaitingStdin, setAwaitingStdin] = useState(false);
  const [pythonError, setPythonError] = useState<string | null>(null);

  const replGlobalsRef = useRef<any>(null);
  const busyRef = useRef(false);
  const stdinResolverRef = useRef<((value: string) => void) | null>(null);
  const stdinRejectRef = useRef<((reason?: unknown) => void) | null>(null);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number | null>(null);
  const lineInputRef = useRef<HTMLInputElement>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const localBufferRef = useRef<string[]>([]);
  const codeRef = useRef(code);
  codeRef.current = code;

  const normalizedCourseLanguage = (courseLanguage || "web").toLowerCase();
  const isPythonCourse = normalizedCourseLanguage === "python";

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const MAX_LOGS = 500;

  const addLog = useCallback((message: string, level: LogLevel = "info") => {
    const newLog: LogEntry = {
      id: makeId(),
      message,
      level,
      timestamp: new Date(),
    };
    setLogs((prev) => {
      const next = [...prev, newLog];
      return next.length > MAX_LOGS ? next.slice(-MAX_LOGS) : next;
    });
  }, []);

  const appendTranscript = useCallback(
    (text: string, kind: TranscriptLine["kind"] = "out") => {
      if (text == null || text === "") return;
      let next = String(text);
      // Keep stdout prompts (no trailing newline) inline; end other kinds on a line.
      if (kind !== "out" && !next.endsWith("\n")) {
        next += "\n";
      }
      setTranscript((prev) => [
        ...prev,
        {
          id: makeId(),
          text: next,
          kind,
        },
      ]);
    },
    []
  );

  const appendTranscriptRef = useRef(appendTranscript);
  appendTranscriptRef.current = appendTranscript;

  const rejectPendingStdin = useCallback((reason?: unknown) => {
    if (stdinRejectRef.current) {
      const reject = stdinRejectRef.current;
      stdinResolverRef.current = null;
      stdinRejectRef.current = null;
      setAwaitingStdin(false);
      reject(reason ?? new Error("KeyboardInterrupt"));
    }
  }, []);

  const requestStdinLine = useCallback((): Promise<string> => {
    setAwaitingStdin(true);
    queueMicrotask(() => lineInputRef.current?.focus());
    return new Promise<string>((resolve, reject) => {
      stdinResolverRef.current = (value: string) => {
        stdinResolverRef.current = null;
        stdinRejectRef.current = null;
        setAwaitingStdin(false);
        resolve(value);
      };
      stdinRejectRef.current = (reason?: unknown) => {
        stdinResolverRef.current = null;
        stdinRejectRef.current = null;
        setAwaitingStdin(false);
        reject(reason);
      };
    });
  }, []);

  const ensurePyodideScript = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (typeof window.loadPyodide === "function") return;

    if (!pyodideScriptLoadingRef.current) {
      pyodideScriptLoadingRef.current = new Promise<void>((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>(
          'script[data-pyodide="true"]'
        );
        if (existing) {
          const onLoad = () => resolve();
          const onError = () =>
            reject(new Error("Failed to load Pyodide script."));
          existing.addEventListener("load", onLoad);
          existing.addEventListener("error", onError);
          pyodideScriptListenersRef.current = {
            script: existing,
            onLoad,
            onError,
          };
          return;
        }

        const script = document.createElement("script");
        script.dataset.pyodide = "true";
        script.src = "https://cdn.jsdelivr.net/pyodide/v0.29.1/full/pyodide.js";
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () =>
          reject(new Error("Failed to load Pyodide script."));
        document.head.appendChild(script);
      });
    }

    await pyodideScriptLoadingRef.current;
  }, []);

  const ensurePythonRuntime = useCallback(async () => {
    if (pyodideRef.current && replGlobalsRef.current) {
      return {
        py: pyodideRef.current,
        globals: replGlobalsRef.current,
      };
    }

    if (!pyodideLoadingRef.current) {
      pyodideLoadingRef.current = (async () => {
        await ensurePyodideScript();
        const loadPyodide = window.loadPyodide;
        if (typeof loadPyodide !== "function") {
          throw new Error(
            "Pyodide failed to load (window.loadPyodide missing)."
          );
        }

        window.beblockyReadStdin = () => requestStdinLine();

        const py = await loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.29.1/full/",
        });

        // Disable browser prompt(); all stdin goes through beblockyReadStdin.
        if (typeof py.setStdin === "function") {
          py.setStdin({
            stdin: () => {
              throw new Error(
                "Synchronous stdin is disabled. Use input() via the Beblocky console."
              );
            },
          });
        }

        if (typeof py.setStdout === "function") {
          py.setStdout({
            batched: (s: string) => s && appendTranscriptRef.current(s, "out"),
          });
        }
        if (typeof py.setStderr === "function") {
          py.setStderr({
            batched: (s: string) => s && appendTranscriptRef.current(s, "err"),
          });
        }

        // Shared REPL namespace (same as PyodideConsole(py.globals))
        const globals = py.globals;
        replGlobalsRef.current = globals;

        py.runPython(BEBLOCKY_REPL_SETUP, { globals });

        let banner = `Welcome to the Beblocky Python REPL (Pyodide ${py.version})`;
        try {
          const consoleMod = py.pyimport("pyodide.console");
          if (consoleMod?.BANNER) {
            banner += `\n${consoleMod.BANNER}`;
          }
        } catch {
          /* optional */
        }
        appendTranscriptRef.current(banner, "sys");

        pyodideRef.current = py;
        return { py, globals };
      })();
    }

    return pyodideLoadingRef.current;
  }, [ensurePyodideScript, requestStdinLine]);

  const setBusy = useCallback((busy: boolean) => {
    busyRef.current = busy;
    setIsBusy(busy);
  }, []);

  const executeSource = useCallback(
    async (source: string, filename = "<stdin>") => {
      const { py, globals } = await ensurePythonRuntime();
      try {
        const result = await py.runPythonAsync(
          `__beblocky_exec(${JSON.stringify(source)}, ${JSON.stringify(filename)})`,
          { globals }
        );
        if (result !== undefined && result !== null) {
          let text: string;
          try {
            const shortened = py.runPython(
              `from pyodide.console import repr_shorten\nrepr_shorten`,
              { globals }
            );
            text = String(
              shortened.callKwargs
                ? shortened.callKwargs(result, {
                    separator: "\n<long output truncated>\n",
                  })
                : shortened(result)
            );
            try {
              shortened.destroy?.();
            } catch {
              /* ignore */
            }
          } catch {
            text = String(result);
          }
          if (text && text !== "None") {
            appendTranscriptRef.current(
              text.endsWith("\n") ? text : `${text}\n`,
              "out"
            );
          }
          try {
            result.destroy?.();
          } catch {
            /* ignore */
          }
        }
      } catch (error: any) {
        const msg = error?.message ? String(error.message) : String(error);
        appendTranscriptRef.current(
          msg
            .replace(/\n\s*File ".*__beblocky_exec.*/g, "")
            .replace(/\n\s*File ".*__beblocky_run.*/g, "")
            .trimEnd() || msg.trimEnd(),
          "err"
        );
      }
    },
    [ensurePythonRuntime]
  );

  const checkSyntax = useCallback(
    async (source: string): Promise<"incomplete" | "complete" | "syntax-error"> => {
      const { py, globals } = await ensurePythonRuntime();
      const result = py.runPython(
        `__beblocky_check_syntax(${JSON.stringify(source)})`,
        { globals }
      );
      try {
        const arr = result.toJs ? result.toJs() : result;
        const status = arr[0] as string;
        if (status === "syntax-error") {
          const errText = arr[1] != null ? String(arr[1]) : "SyntaxError";
          appendTranscriptRef.current(errText.trimEnd(), "err");
          return "syntax-error";
        }
        if (status === "incomplete") return "incomplete";
        return "complete";
      } finally {
        try {
          result.destroy?.();
        } catch {
          /* ignore */
        }
      }
    },
    [ensurePythonRuntime]
  );

  const pushReplLine = useCallback(
    async (rawLine: string) => {
      if (busyRef.current || awaitingStdin) return;
      const line = rawLine.replace(/\u00a0/g, " ");

      if (line.trim() === "clear") {
        setTranscript([]);
        setPrompt(PS1);
        localBufferRef.current = [];
        appendTranscriptRef.current("Console cleared.", "sys");
        return;
      }

      appendTranscriptRef.current(`${prompt}${line}`, "in");
      setBusy(true);

      try {
        localBufferRef.current.push(line);
        const source = localBufferRef.current.join("\n");
        const status = await checkSyntax(source);

        if (status === "incomplete") {
          setPrompt(PS2);
          return;
        }

        localBufferRef.current = [];
        setPrompt(PS1);

        if (status === "syntax-error") {
          return;
        }

        await executeSource(source);
      } catch (error: any) {
        localBufferRef.current = [];
        setPrompt(PS1);
        appendTranscriptRef.current(
          error?.message ? String(error.message) : String(error),
          "err"
        );
      } finally {
        setBusy(false);
        queueMicrotask(() => lineInputRef.current?.focus());
      }
    },
    [awaitingStdin, checkSyntax, executeSource, prompt, setBusy]
  );

  const runPythonFile = useCallback(async () => {
    if (busyRef.current) return;
    const pythonCode = codeRef.current;

    if (!pythonCode?.trim()) {
      appendTranscriptRef.current("No Python code to run.", "sys");
      return;
    }

    rejectPendingStdin(new Error("KeyboardInterrupt"));
    localBufferRef.current = [];
    setPrompt(PS1);
    setBusy(true);
    appendTranscriptRef.current("— Running main.py —", "sys");

    try {
      await ensurePythonRuntime();
      await executeSource(pythonCode, "main.py");
    } catch (error: any) {
      appendTranscriptRef.current(
        error?.message ? String(error.message) : String(error),
        "err"
      );
    } finally {
      setBusy(false);
      setPrompt(PS1);
      queueMicrotask(() => lineInputRef.current?.focus());
    }
  }, [ensurePythonRuntime, executeSource, rejectPendingStdin, setBusy]);

  const handleInterrupt = useCallback(() => {
    const wasAwaitingStdin = Boolean(stdinRejectRef.current);
    localBufferRef.current = [];
    rejectPendingStdin(new Error("KeyboardInterrupt"));
    setPrompt(PS1);
    appendTranscriptRef.current(
      wasAwaitingStdin ? "^C" : "^C\nKeyboardInterrupt",
      "err"
    );
    setLineInput("");
    historyIndexRef.current = null;
  }, [rejectPendingStdin]);

  const submitLine = useCallback(
    async (value: string) => {
      if (awaitingStdin && stdinResolverRef.current) {
        appendTranscriptRef.current(value, "in");
        stdinResolverRef.current(value);
        setLineInput("");
        historyIndexRef.current = null;
        return;
      }

      const trimmedHistory = value.trimEnd();
      if (trimmedHistory) {
        const hist = historyRef.current;
        if (hist[hist.length - 1] !== trimmedHistory) {
          hist.push(trimmedHistory);
        }
      }
      historyIndexRef.current = null;
      setLineInput("");
      await pushReplLine(value);
    },
    [awaitingStdin, pushReplLine]
  );

  const onLineKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "c" && e.ctrlKey) {
        e.preventDefault();
        handleInterrupt();
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        void submitLine(lineInput);
        return;
      }

      if (awaitingStdin) return;

      if (e.key === "ArrowUp") {
        e.preventDefault();
        const hist = historyRef.current;
        if (!hist.length) return;
        let idx = historyIndexRef.current;
        if (idx === null) idx = hist.length;
        if (idx > 0) {
          idx -= 1;
          historyIndexRef.current = idx;
          setLineInput(hist[idx] || "");
        }
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const hist = historyRef.current;
        let idx = historyIndexRef.current;
        if (idx === null) return;
        if (idx < hist.length - 1) {
          idx += 1;
          historyIndexRef.current = idx;
          setLineInput(hist[idx] || "");
        } else {
          historyIndexRef.current = null;
          setLineInput("");
        }
      }
    },
    [awaitingStdin, handleInterrupt, lineInput, submitLine]
  );

  const clearPythonConsole = useCallback(() => {
    setTranscript([]);
    setPrompt(PS1);
    localBufferRef.current = [];
    if (replReady) {
      appendTranscriptRef.current("Console cleared.", "sys");
    }
  }, [replReady]);

  useEffect(() => {
    if (!isPythonCourse) return;
    let cancelled = false;
    setPythonError(null);
    (async () => {
      try {
        appendTranscriptRef.current("Loading Python runtime…", "sys");
        await ensurePythonRuntime();
        if (!cancelled) {
          setReplReady(true);
          setPrompt(PS1);
          queueMicrotask(() => lineInputRef.current?.focus());
        }
      } catch (error: any) {
        if (!cancelled) {
          const msg = error?.message ? String(error.message) : String(error);
          setPythonError(msg);
          appendTranscriptRef.current(msg, "err");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isPythonCourse, ensurePythonRuntime]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ block: "end" });
  }, [transcript, lineInput, prompt, awaitingStdin]);

  useEffect(() => {
    return () => {
      if (runCodeTimeoutRef.current) {
        clearTimeout(runCodeTimeoutRef.current);
        runCodeTimeoutRef.current = null;
      }
      if (runCodeMessageHandlerRef.current) {
        window.removeEventListener("message", runCodeMessageHandlerRef.current);
        runCodeMessageHandlerRef.current = null;
      }
      runCodeIdRef.current = null;
      const iframe = runCodeIframeRef.current;
      if (iframe && document.body.contains(iframe)) {
        document.body.removeChild(iframe);
        runCodeIframeRef.current = null;
      }
      const pyodide = pyodideScriptListenersRef.current;
      if (pyodide) {
        pyodide.script.removeEventListener("load", pyodide.onLoad);
        pyodide.script.removeEventListener("error", pyodide.onError);
        pyodideScriptListenersRef.current = null;
      }
      rejectPendingStdin(new Error("Console unmounted"));
      if (window.beblockyReadStdin) {
        delete window.beblockyReadStdin;
      }
      replGlobalsRef.current = null;
    };
  }, [rejectPendingStdin]);

  const runWebCode = useCallback(() => {
    clearLogs();

    if (runCodeTimeoutRef.current) {
      clearTimeout(runCodeTimeoutRef.current);
      runCodeTimeoutRef.current = null;
    }
    if (runCodeMessageHandlerRef.current) {
      window.removeEventListener("message", runCodeMessageHandlerRef.current);
      runCodeMessageHandlerRef.current = null;
    }
    runCodeIframeRef.current = null;
    runCodeIdRef.current = `${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}`;

    try {
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.setAttribute("sandbox", "allow-scripts");
      document.body.appendChild(iframe);
      runCodeIframeRef.current = iframe;

      const runId = runCodeIdRef.current;
      const handleMessage = (event: MessageEvent) => {
        const data = (event as any)?.data;
        if (!data || data.source !== "beblocky-ide-console") return;
        if (!runId || data.runId !== runId) return;

        const level = String(data.level || "info");
        const msg =
          Array.isArray(data.args) && data.args.length
            ? data.args.join(" ")
            : "";

        if (level === "error") addLog(msg, "error");
        else if (level === "warn") addLog(msg, "warning");
        else addLog(msg, "info");
      };
      runCodeMessageHandlerRef.current = handleMessage;
      window.addEventListener("message", handleMessage);

      const safeCode = String(code ?? "");
      const srcdoc = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Sandbox</title>
    <script>
      (function () {
        const runId = ${JSON.stringify(runId)};
        function safeSerialize(v) {
          try {
            if (typeof v === 'string') return v;
            return JSON.stringify(v);
          } catch (_) {
            try { return String(v); } catch (_) { return '[unserializable]'; }
          }
        }
        function send(level, args) {
          try {
            parent.postMessage({ source: 'beblocky-ide-console', runId, level, args: (args || []).map(safeSerialize) }, '*');
          } catch (_) {}
        }
        ['log','info','warn','error'].forEach((level) => {
          const orig = console[level];
          console[level] = function () {
            send(level, Array.from(arguments));
            if (orig) orig.apply(console, arguments);
          };
        });
        window.addEventListener('error', function (e) {
          send('error', [e && e.message ? e.message : 'Unknown error']);
        });
        window.addEventListener('unhandledrejection', function (e) {
          const reason = e && e.reason ? e.reason : 'Unhandled rejection';
          send('error', [reason]);
        });
      })();
    </script>
  </head>
  <body>
${safeCode}
  </body>
</html>`;
      iframe.srcdoc = srcdoc;

      runCodeTimeoutRef.current = setTimeout(() => {
        runCodeTimeoutRef.current = null;
        runCodeIdRef.current = null;
        if (runCodeMessageHandlerRef.current) {
          window.removeEventListener(
            "message",
            runCodeMessageHandlerRef.current
          );
          runCodeMessageHandlerRef.current = null;
        }
        runCodeIframeRef.current = null;
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    } catch (error) {
      addLog(`Error setting up console: ${error}`, "error");
    }
  }, [code, clearLogs, addLog]);

  const runCode = useCallback(() => {
    if (isPythonCourse) {
      void runPythonFile();
      return;
    }
    runWebCode();
  }, [isPythonCourse, runPythonFile, runWebCode]);

  useImperativeHandle(ref, () => ({ run: runCode }), [runCode]);

  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs]);

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

  const inputDisabled = isPythonCourse
    ? Boolean(pythonError) ||
      (!replReady && !awaitingStdin) ||
      (isBusy && !awaitingStdin)
    : false;

  return (
    <Card className="h-full flex flex-col border-none rounded-none shadow-none">
      <CardHeader className="p-2 border-b flex-row items-center justify-between space-y-0 bg-muted/30">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between w-full">
            <TabsList className="h-8 bg-muted/50">
              <TabsTrigger value="console" className="text-xs px-3">
                {isPythonCourse ? "Python" : "Console"}
              </TabsTrigger>
              <TabsTrigger value="problems" className="text-xs px-3">
                Problems
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={isPythonCourse ? clearPythonConsole : clearLogs}
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
                title={isPythonCourse ? "Run main.py" : "Run code"}
                disabled={isPythonCourse && (isBusy || !replReady)}
              >
                <Play size={16} />
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
            {isPythonCourse ? (
              <div className="h-full flex flex-col bg-background">
                <ScrollArea className="flex-1 min-h-0">
                  <div
                    className="p-3 font-mono text-sm whitespace-pre-wrap break-words"
                    ref={consoleRef}
                  >
                    {transcript.map((line) => (
                      <span
                        key={line.id}
                        className={
                          line.kind === "err"
                            ? "text-red-500"
                            : line.kind === "sys"
                              ? "text-muted-foreground"
                              : "text-foreground"
                        }
                      >
                        {line.text}
                      </span>
                    ))}
                    <div ref={transcriptEndRef} />
                  </div>
                </ScrollArea>
                <div className="border-t px-3 py-2 flex items-center gap-1 font-mono text-sm bg-muted/20">
                  {!awaitingStdin && (
                    <span className="text-muted-foreground select-none shrink-0">
                      {prompt}
                    </span>
                  )}
                  <input
                    ref={lineInputRef}
                    type="text"
                    value={lineInput}
                    disabled={inputDisabled}
                    onChange={(e) => setLineInput(e.target.value)}
                    onKeyDown={onLineKeyDown}
                    spellCheck={false}
                    autoCapitalize="off"
                    autoCorrect="off"
                    className="flex-1 min-w-0 bg-transparent outline-none border-none text-sm font-mono"
                    placeholder={
                      !replReady
                        ? "Loading…"
                        : awaitingStdin
                          ? ""
                          : "Type Python here…"
                    }
                    aria-label="Python REPL input"
                  />
                </div>
              </div>
            ) : (
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
            )}
          </TabsContent>

          <TabsContent
            value="problems"
            className="h-full m-0 p-0 data-[state=active]:flex flex-col"
          >
            <div className="p-4 text-center text-muted-foreground">
              {pythonError
                ? pythonError
                : "No problems detected in your code."}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
});

export default IdeConsole;
