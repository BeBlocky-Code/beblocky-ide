/**
 * Helpers for the in-browser Python REPL (Pyodide).
 * Transforms sync input() into awaitable calls so stdin can be served
 * from the in-console line editor (no window.prompt).
 */

export const PS1 = ">>> ";
export const PS2 = "... ";

/**
 * Installs async input helper, syntax checker, and an AST-aware async executor
 * that rewrites input() → await __beblocky_input__() and returns the last
 * expression value (interactive display).
 */
export const BEBLOCKY_REPL_SETUP = `
import sys
import ast
import builtins
import codeop
import traceback
from js import beblockyReadStdin

async def __beblocky_input__(prompt=""):
    # Prompt goes to the transcript; the typed line is echoed by the console UI.
    if prompt:
        sys.stdout.write(str(prompt))
        sys.stdout.flush()
    line = await beblockyReadStdin()
    return "" if line is None else str(line)

def __beblocky_sync_input__(prompt=""):
    raise RuntimeError(
        "Interactive input is handled by the Beblocky console."
    )

builtins.input = __beblocky_sync_input__

class __BeblockyInputTransformer(ast.NodeTransformer):
    def visit_Call(self, node):
        self.generic_visit(node)
        if isinstance(node.func, ast.Name) and node.func.id == "input":
            node.func = ast.Name(id="__beblocky_input__", ctx=ast.Load())
            return ast.Await(value=node)
        return node

def __beblocky_check_syntax(source: str):
    try:
        cmd = codeop.compile_command(source, "<stdin>", "single")
    except SyntaxError as e:
        return ("syntax-error", "".join(traceback.format_exception_only(type(e), e)))
    if cmd is None:
        return ("incomplete", None)
    return ("complete", None)

async def __beblocky_exec(source: str, filename: str = "<stdin>"):
    """Compile and run source asynchronously; return last expression value."""
    tree = ast.parse(source, filename=filename, mode="exec")
    tree = __BeblockyInputTransformer().visit(tree)
    ast.fix_missing_locations(tree)

    # Return last expression for interactive display (like the REPL).
    if tree.body and isinstance(tree.body[-1], ast.Expr):
        last = tree.body.pop()
        tree.body.append(ast.Return(value=last.value))
        ast.fix_missing_locations(tree)

    module = ast.Module(
        body=[
            ast.AsyncFunctionDef(
                name="__beblocky_run",
                args=ast.arguments(
                    posonlyargs=[],
                    args=[],
                    vararg=None,
                    kwonlyargs=[],
                    kw_defaults=[],
                    kwarg=None,
                    defaults=[],
                ),
                body=tree.body or [ast.Pass()],
                decorator_list=[],
                returns=None,
                type_comment=None,
                type_params=[],
            )
        ],
        type_ignores=[],
    )
    ast.fix_missing_locations(module)
    code = compile(module, filename, "exec")
    ns = globals()
    exec(code, ns, ns)
    return await ns["__beblocky_run"]()
`.trim();
