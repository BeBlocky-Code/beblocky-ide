/**
 * Main-thread facade over the Python worker.
 *
 * The console UI only sees this class: it sends lines, receives text, and never
 * knows that Pyodide exists. Interrupting a running program terminates the
 * worker and starts a fresh one, which is the only kill switch that works
 * without cross-origin isolation.
 */

export const PS1 = ">>> ";
export const PS2 = "... ";

const WORKER_URL = "/workers/python-worker.js";
const LOAD_TIMEOUT_MS = 90_000;

export type RunStatus = "ok" | "error" | "incomplete";

export type PythonRuntimeHandlers = {
  onStdout: (text: string) => void;
  onStderr: (text: string) => void;
  onStdinChange: (waiting: boolean) => void;
  onReady: (version: string) => void;
  onLoadError: (message: string) => void;
  onRestart: () => void;
};

type Pending = {
  resolve: (status: RunStatus) => void;
};

type WorkerMessage =
  | { type: "ready"; version?: string }
  | { type: "load_error"; message?: string }
  | { type: "stdout"; text?: string }
  | { type: "stderr"; text?: string }
  | { type: "stdin_request" }
  | { type: "done"; id: number; status?: RunStatus };

export class PythonRuntime {
  private handlers: PythonRuntimeHandlers;
  private worker: Worker | null = null;
  private pending = new Map<number, Pending>();
  private sequence = 0;
  private loadTimer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;

  private awaitingStdin = false;
  private ready = false;

  constructor(handlers: PythonRuntimeHandlers) {
    this.handlers = handlers;
  }

  get isReady() {
    return this.ready;
  }

  get isWaitingForInput() {
    return this.awaitingStdin;
  }

  get isRunning() {
    return this.pending.size > 0;
  }

  start() {
    if (this.disposed || this.worker) return;
    this.spawn();
  }

  /** Throws away the current worker and boots a clean one. */
  retry() {
    if (this.disposed) return;
    this.teardown();
    this.spawn();
  }

  dispose() {
    this.disposed = true;
    this.teardown();
  }

  runFile(source: string, filename = "main.py") {
    return this.request((id, worker) => {
      worker.postMessage({ type: "run", id, source, filename });
    });
  }

  push(line: string) {
    return this.request((id, worker) => {
      worker.postMessage({ type: "push", id, line });
    });
  }

  /** Clears any half-typed REPL block without executing it. */
  reset() {
    this.worker?.postMessage({ type: "reset" });
  }

  respondStdin(value: string) {
    if (!this.awaitingStdin || !this.worker) return false;
    this.setAwaitingStdin(false);
    this.worker.postMessage({ type: "stdin", value });
    return true;
  }

  /**
   * Cancels a pending input() if there is one, otherwise restarts the worker to
   * kill whatever is running. Returns true when the runtime was restarted.
   */
  interrupt(): boolean {
    if (this.awaitingStdin && this.worker) {
      this.setAwaitingStdin(false);
      this.worker.postMessage({ type: "stdin_cancel" });
      return false;
    }

    if (!this.isRunning) {
      this.reset();
      return false;
    }

    this.teardown();
    this.spawn();
    this.handlers.onRestart();
    return true;
  }

  private request(send: (id: number, worker: Worker) => void): Promise<RunStatus> {
    if (this.disposed) return Promise.resolve("error");
    if (!this.worker) this.spawn();
    const worker = this.worker;
    if (!worker) return Promise.resolve("error");

    const id = ++this.sequence;
    return new Promise<RunStatus>((resolve) => {
      this.pending.set(id, { resolve });
      send(id, worker);
    });
  }

  private setAwaitingStdin(waiting: boolean) {
    if (this.awaitingStdin === waiting) return;
    this.awaitingStdin = waiting;
    this.handlers.onStdinChange(waiting);
  }

  private spawn() {
    this.ready = false;
    this.setAwaitingStdin(false);

    let worker: Worker;
    try {
      worker = new Worker(WORKER_URL);
    } catch (error) {
      this.handlers.onLoadError(
        error instanceof Error
          ? error.message
          : "This browser could not start the Python runtime."
      );
      return;
    }

    this.worker = worker;
    worker.onmessage = (event) => this.handleMessage(event.data);
    worker.onerror = (event) => {
      this.failLoad(event.message || "The Python runtime crashed.");
    };

    this.loadTimer = setTimeout(() => {
      this.loadTimer = null;
      this.failLoad(
        "Loading Python timed out. Check your connection and try again."
      );
    }, LOAD_TIMEOUT_MS);

    worker.postMessage({ type: "boot" });
  }

  private teardown() {
    if (this.loadTimer) {
      clearTimeout(this.loadTimer);
      this.loadTimer = null;
    }
    if (this.worker) {
      this.worker.onmessage = null;
      this.worker.onerror = null;
      this.worker.terminate();
      this.worker = null;
    }
    this.ready = false;
    this.setAwaitingStdin(false);
    this.settleAll("error");
  }

  private settleAll(status: RunStatus) {
    const pending = [...this.pending.values()];
    this.pending.clear();
    for (const entry of pending) entry.resolve(status);
  }

  private clearLoadTimer() {
    if (!this.loadTimer) return;
    clearTimeout(this.loadTimer);
    this.loadTimer = null;
  }

  private failLoad(message: string) {
    this.clearLoadTimer();
    this.ready = false;
    this.settleAll("error");
    this.handlers.onLoadError(message);
  }

  private handleMessage(message: WorkerMessage | null) {
    if (this.disposed || !message) return;

    switch (message.type) {
      case "ready":
        this.clearLoadTimer();
        this.ready = true;
        this.handlers.onReady(String(message.version || ""));
        return;
      case "load_error":
        this.failLoad(String(message.message || "Failed to load Python."));
        return;
      case "stdout":
        this.handlers.onStdout(String(message.text ?? ""));
        return;
      case "stderr":
        this.handlers.onStderr(String(message.text ?? ""));
        return;
      case "stdin_request":
        this.setAwaitingStdin(true);
        return;
      case "done": {
        this.setAwaitingStdin(false);
        const entry = this.pending.get(message.id);
        if (!entry) return;
        this.pending.delete(message.id);
        entry.resolve(message.status || "error");
        return;
      }
      default:
        return;
    }
  }
}
