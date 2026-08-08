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
  RotateCcw,
  Square,
} from "lucide-react";
import { PS1, PS2, PythonRuntime } from "@/lib/python-runtime";

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
  const runCodeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runCodeIframeRef = useRef<HTMLIFrameElement | null>(null);
  const runCodeMessageHandlerRef = useRef<((e: MessageEvent) => void) | null>(
    null
  );
  const runCodeIdRef = useRef<string | null>(null);

  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [lineInput, setLineInput] = useState("");
  const [prompt, setPrompt] = useState(PS1);
  const [replReady, setReplReady] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [awaitingStdin, setAwaitingStdin] = useState(false);
  const [pythonError, setPythonError] = useState<string | null>(null);

  const runtimeRef = useRef<PythonRuntime | null>(null);
  const busyRef = useRef(false);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number | null>(null);
  const lineInputRef = useRef<HTMLInputElement>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
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

  const setBusy = useCallback((busy: boolean) => {
    busyRef.current = busy;
    setIsBusy(busy);
  }, []);

  // One worker-backed runtime per mounted Python console.
  useEffect(() => {
    if (!isPythonCourse) return;

    const runtime = new PythonRuntime({
      onStdout: (text) => appendTranscriptRef.current(text, "out"),
      onStderr: (text) => appendTranscriptRef.current(text, "err"),
      onStdinChange: setAwaitingStdin,
      onReady: (version) => {
        setPythonError(null);
        setReplReady(true);
        setPrompt(PS1);
        appendTranscriptRef.current(
          version
            ? `Python ${version} ready. Type below or press Run.`
            : "Python ready. Type below or press Run.",
          "sys"
        );
      },
      onLoadError: (message) => {
        setReplReady(false);
        setAwaitingStdin(false);
        setBusy(false);
        setPythonError(message);
        appendTranscriptRef.current(message, "err");
      },
      onRestart: () => {
        setBusy(false);
        setReplReady(false);
        setPrompt(PS1);
        appendTranscriptRef.current(
          "^C\nKeyboardInterrupt — Python restarted, variables were cleared.",
          "err"
        );
      },
    });

    runtimeRef.current = runtime;
    setTranscript([]);
    setReplReady(false);
    setPythonError(null);
    appendTranscriptRef.current("Loading Python…", "sys");
    runtime.start();

    return () => {
      runtimeRef.current = null;
      runtime.dispose();
    };
  }, [isPythonCourse, setBusy]);

  // Focus after React enables the field for stdin (a microtask focus would race
  // the disabled attribute).
  useEffect(() => {
    if (!awaitingStdin) return;
    lineInputRef.current?.focus();
  }, [awaitingStdin]);

  const retryRuntime = useCallback(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    setBusy(false);
    setPythonError(null);
    setReplReady(false);
    setPrompt(PS1);
    appendTranscriptRef.current("Reloading Python…", "sys");
    runtime.retry();
  }, [setBusy]);

  const pushReplLine = useCallback(
    async (rawLine: string) => {
      const runtime = runtimeRef.current;
      if (!runtime || busyRef.current) return;
      const line = rawLine.replace(/\u00a0/g, " ");

      if (line.trim() === "clear") {
        runtime.reset();
        setTranscript([]);
        setPrompt(PS1);
        appendTranscriptRef.current("Console cleared.", "sys");
        return;
      }

      appendTranscriptRef.current(`${prompt}${line}`, "in");
      setBusy(true);
      try {
        const status = await runtime.push(line);
        setPrompt(status === "incomplete" ? PS2 : PS1);
      } finally {
        setBusy(false);
        queueMicrotask(() => lineInputRef.current?.focus());
      }
    },
    [prompt, setBusy]
  );

  const runPythonFile = useCallback(async () => {
    const runtime = runtimeRef.current;
    if (!runtime || busyRef.current) return;

    const pythonCode = codeRef.current;
    if (!pythonCode?.trim()) {
      appendTranscriptRef.current("No Python code to run.", "sys");
      return;
    }

    setPrompt(PS1);
    setBusy(true);
    appendTranscriptRef.current("— Running main.py —", "sys");
    try {
      await runtime.runFile(pythonCode, "main.py");
    } finally {
      setBusy(false);
      setPrompt(PS1);
      queueMicrotask(() => lineInputRef.current?.focus());
    }
  }, [setBusy]);

  const handleInterrupt = useCallback(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;

    setLineInput("");
    historyIndexRef.current = null;
    setPrompt(PS1);

    // A restart reports itself through onRestart; cancelling input() does not.
    const restarted = runtime.interrupt();
    if (!restarted) {
      appendTranscriptRef.current("^C", "err");
    }
  }, []);

  const submitLine = useCallback(
    async (value: string) => {
      const runtime = runtimeRef.current;
      if (!runtime) return;

      if (awaitingStdin) {
        appendTranscriptRef.current(value, "in");
        setLineInput("");
        historyIndexRef.current = null;
        runtime.respondStdin(value);
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
    runtimeRef.current?.reset();
    setTranscript([]);
    setPrompt(PS1);
    if (replReady) {
      appendTranscriptRef.current("Console cleared.", "sys");
    }
  }, [replReady]);

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
    };
  }, []);

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
        const data = event?.data as
          | { source?: string; runId?: string; level?: string; args?: unknown[] }
          | undefined;
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

  // Disabled while busy unless we're waiting on input() (then the field must
  // accept keys).
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

              {isPythonCourse && pythonError && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={retryRuntime}
                  className="h-8 w-8"
                  title="Reload Python runtime"
                >
                  <RotateCcw size={16} />
                </Button>
              )}

              {isPythonCourse && (isBusy || awaitingStdin) && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleInterrupt}
                  className="h-8 w-8 text-red-500"
                  title="Stop (Ctrl+C)"
                >
                  <Square size={16} />
                </Button>
              )}

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

                {pythonError ? (
                  <div className="border-t px-3 py-2 flex items-center justify-between gap-3 bg-muted/20">
                    <span className="text-xs text-muted-foreground truncate">
                      Python could not start.
                    </span>
                    <Button size="sm" variant="secondary" onClick={retryRuntime}>
                      <RotateCcw size={14} className="mr-1.5" />
                      Retry
                    </Button>
                  </div>
                ) : (
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
                          ? "Loading Python…"
                          : awaitingStdin
                            ? ""
                            : "Type Python here…"
                      }
                      aria-label="Python REPL input"
                    />
                  </div>
                )}
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
