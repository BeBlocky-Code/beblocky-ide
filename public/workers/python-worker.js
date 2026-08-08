/*
 * Beblocky Python worker.
 *
 * Owns the whole CPython runtime: loads the self-hosted Pyodide build, keeps the
 * REPL buffer, and talks to the console UI over postMessage. Never touches the
 * DOM, so a runaway student loop cannot freeze the IDE.
 *
 * Plain JS on purpose: served from /public so no bundler is involved in the path
 * that has to work for every student.
 */

/* eslint-disable */

const INDEX_URL = "/pyodide/";
const CONSOLE_FILENAME = "<console>";

// Emscripten aborts the whole worker if one of these is missing, so they are
// checked up front to turn that into a message the student can act on.
const REQUIRED_ASSETS = [
  "pyodide.asm.wasm",
  "pyodide.asm.js",
  "python_stdlib.zip",
  "pyodide-lock.json",
];

// Executed once after Pyodide boots. Student code runs at module level via
// PyCF_ALLOW_TOP_LEVEL_AWAIT, so assignments persist between REPL lines.
const PYTHON_SETUP = `
import ast
import builtins
import codeop
import json
import sys
import traceback
from types import TracebackType

from js import bbReadStdin

# Frames from this setup module are stripped out of student tracebacks.
_BB_FILE = sys._getframe().f_code.co_filename

_ns = {"__name__": "__main__", "__doc__": None, "__builtins__": builtins}


async def _bb_input(prompt=""):
    """input() replacement that awaits a line from the console UI."""
    if prompt is not None and prompt != "":
        sys.stdout.write(str(prompt))
        sys.stdout.flush()
    try:
        line = await bbReadStdin()
    except BaseException:
        # The UI rejects the pending read when the student interrupts.
        raise KeyboardInterrupt from None
    if line is None:
        raise EOFError("EOF when reading a line")
    return str(line)


def _bb_blocked_input(prompt=""):
    raise RuntimeError(
        "input() only works at the top level of your program here. "
        "Read the value outside the function and pass it in as an argument."
    )


builtins.input = _bb_blocked_input
_ns["_bb_input"] = _bb_input


class _BbInputRewriter(ast.NodeTransformer):
    """Rewrite input(...) into 'await _bb_input(...)'.

    Sync functions, lambdas and class bodies are skipped because 'await' is a
    syntax error inside them; those calls reach the builtins stub instead.
    """

    def visit_FunctionDef(self, node):
        return node

    def visit_Lambda(self, node):
        return node

    def visit_ClassDef(self, node):
        return node

    def visit_Call(self, node):
        self.generic_visit(node)
        if isinstance(node.func, ast.Name) and node.func.id == "input":
            node.func = ast.Name(id="_bb_input", ctx=ast.Load())
            return ast.Await(value=node)
        return node


def _bb_only_message():
    return "".join(traceback.format_exception_only(*sys.exc_info()[:2]))


def _bb_rebuild_tb(tb):
    kept = []
    while tb is not None:
        if tb.tb_frame.f_code.co_filename != _BB_FILE:
            kept.append(tb)
        tb = tb.tb_next
    rebuilt = None
    for entry in reversed(kept):
        rebuilt = TracebackType(rebuilt, entry.tb_frame, entry.tb_lasti, entry.tb_lineno)
    return rebuilt


def _bb_strip_frames(exc, seen=None):
    """Hide runtime plumbing so students only see their own code."""
    if seen is None:
        seen = set()
    if exc is None or id(exc) in seen:
        return
    seen.add(id(exc))
    try:
        exc.__traceback__ = _bb_rebuild_tb(exc.__traceback__)
    except BaseException:
        pass
    _bb_strip_frames(exc.__cause__, seen)
    _bb_strip_frames(exc.__context__, seen)


def _bb_check(source):
    """Classify a REPL buffer exactly like the CPython prompt does."""
    try:
        compiled = codeop.compile_command(source, "<console>", "single")
    except (SyntaxError, OverflowError, ValueError):
        return json.dumps(["error", _bb_only_message()])
    return json.dumps(["incomplete" if compiled is None else "complete", None])


async def _bb_run(source, filename, interactive):
    flags = ast.PyCF_ALLOW_TOP_LEVEL_AWAIT
    try:
        tree = ast.parse(source, filename=filename, mode="exec")
        tree = _BbInputRewriter().visit(tree)
        ast.fix_missing_locations(tree)
        if not tree.body:
            return "ok"
        if interactive:
            node = ast.Interactive(body=tree.body)
            code = compile(node, filename, "single", flags=flags)
        else:
            node = ast.Module(body=tree.body, type_ignores=[])
            code = compile(node, filename, "exec", flags=flags)
    except (SyntaxError, ValueError):
        sys.stderr.write(_bb_only_message())
        return "error"

    try:
        pending = eval(code, _ns)
        if pending is not None:
            await pending
    except KeyboardInterrupt:
        sys.stderr.write("KeyboardInterrupt\\n")
        return "error"
    except SystemExit:
        return "ok"
    except BaseException as exc:
        _bb_strip_frames(exc)
        sys.stderr.write(
            "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
        )
        return "error"
    finally:
        try:
            sys.stdout.flush()
            sys.stderr.flush()
        except BaseException:
            pass
    return "ok"
`;

let pyodide = null;
let pyRun = null;
let pyCheck = null;
let loadPromise = null;

let stdinResolve = null;
let stdinReject = null;

// REPL continuation buffer lives here so the UI only ever sends single lines.
let buffer = [];

const decoder = new TextDecoder();

function post(message) {
  self.postMessage(message);
}

function decode(chunk) {
  if (typeof chunk === "string") return chunk;
  if (chunk instanceof Uint8Array) return decoder.decode(chunk);
  return chunk == null ? "" : String(chunk);
}

function describe(error) {
  if (!error) return "Unknown error";
  if (typeof error === "string") return error;
  return error.message ? String(error.message) : String(error);
}

function readStdin() {
  return new Promise((resolve, reject) => {
    stdinResolve = resolve;
    stdinReject = reject;
    post({ type: "stdin_request" });
  });
}

function settleStdin(kind, value) {
  const resolve = stdinResolve;
  const reject = stdinReject;
  stdinResolve = null;
  stdinReject = null;
  if (kind === "value" && resolve) resolve(value);
  else if (kind === "cancel" && reject) reject(new Error("KeyboardInterrupt"));
}

async function preflightAssets() {
  const checks = await Promise.all(
    REQUIRED_ASSETS.map(async (asset) => {
      try {
        const response = await fetch(`${INDEX_URL}${asset}`, { method: "HEAD" });
        return response.ok ? null : `${asset} (${response.status})`;
      } catch {
        return `${asset} (unreachable)`;
      }
    })
  );

  const missing = checks.filter(Boolean);
  if (missing.length > 0) {
    throw new Error(
      `The Python runtime files could not be loaded: ${missing.join(", ")}. Check your connection and try again.`
    );
  }
}

async function ensurePyodide() {
  if (pyodide) return pyodide;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    await preflightAssets();
    importScripts(`${INDEX_URL}pyodide.js`);
    if (typeof self.loadPyodide !== "function") {
      throw new Error("Pyodide bundle loaded but loadPyodide is missing.");
    }

    self.bbReadStdin = readStdin;

    const py = await self.loadPyodide({ indexURL: INDEX_URL });

    py.setStdout({
      write: (chunk) => {
        const text = decode(chunk);
        if (text) post({ type: "stdout", text });
        return chunk && chunk.length != null ? chunk.length : text.length;
      },
      isatty: false,
    });
    py.setStderr({
      write: (chunk) => {
        const text = decode(chunk);
        if (text) post({ type: "stderr", text });
        return chunk && chunk.length != null ? chunk.length : text.length;
      },
      isatty: false,
    });
    // All reads go through _bb_input; a raw sys.stdin read should fail loudly.
    py.setStdin({ error: true });

    py.runPython(PYTHON_SETUP);
    pyRun = py.globals.get("_bb_run");
    pyCheck = py.globals.get("_bb_check");

    pyodide = py;
    return py;
  })().catch((error) => {
    // Clearing the promise is what makes retry work without a new worker.
    loadPromise = null;
    throw error;
  });

  return loadPromise;
}

async function boot() {
  try {
    const py = await ensurePyodide();
    post({ type: "ready", version: py.version });
  } catch (error) {
    post({ type: "load_error", message: describe(error) });
  }
}

async function execute(id, source, filename, interactive) {
  try {
    await ensurePyodide();
  } catch (error) {
    post({ type: "load_error", message: describe(error) });
    post({ type: "done", id, status: "error" });
    return;
  }

  try {
    const status = await pyRun(source, filename, interactive);
    post({ type: "done", id, status: status === "ok" ? "ok" : "error" });
  } catch (error) {
    post({ type: "stderr", text: `${describe(error)}\n` });
    post({ type: "done", id, status: "error" });
  }
}

async function push(id, line) {
  try {
    await ensurePyodide();
  } catch (error) {
    post({ type: "load_error", message: describe(error) });
    post({ type: "done", id, status: "error" });
    return;
  }

  buffer.push(line);
  const source = buffer.join("\n");

  let verdict;
  try {
    verdict = JSON.parse(pyCheck(source));
  } catch (error) {
    buffer = [];
    post({ type: "stderr", text: `${describe(error)}\n` });
    post({ type: "done", id, status: "error" });
    return;
  }

  const [state, message] = verdict;

  if (state === "incomplete") {
    post({ type: "done", id, status: "incomplete" });
    return;
  }

  buffer = [];

  if (state === "error") {
    if (message) post({ type: "stderr", text: message });
    post({ type: "done", id, status: "error" });
    return;
  }

  await execute(id, source, CONSOLE_FILENAME, true);
}

self.onmessage = (event) => {
  const message = event.data || {};

  switch (message.type) {
    case "boot":
      void boot();
      return;
    case "run":
      buffer = [];
      settleStdin("cancel");
      void execute(message.id, message.source, message.filename || "main.py", false);
      return;
    case "push":
      void push(message.id, message.line);
      return;
    case "reset":
      buffer = [];
      settleStdin("cancel");
      return;
    case "stdin":
      settleStdin("value", message.value);
      return;
    case "stdin_cancel":
      settleStdin("cancel");
      return;
    default:
      return;
  }
};
