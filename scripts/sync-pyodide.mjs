/**
 * Copies the Pyodide runtime out of node_modules into public/pyodide so the
 * Python console is served first-party. Runs before `dev` and `build`.
 */
import { createRequire } from "node:module";
import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

// Everything the browser needs to boot CPython. Extra wheels are not shipped.
const RUNTIME_FILES = [
  "pyodide.js",
  "pyodide.asm.js",
  "pyodide.asm.wasm",
  "python_stdlib.zip",
  "pyodide-lock.json",
];

const require = createRequire(import.meta.url);

async function resolvePyodideDir() {
  try {
    return dirname(require.resolve("pyodide/package.json"));
  } catch {
    throw new Error(
      "Cannot resolve the `pyodide` package. Run an install before dev/build."
    );
  }
}

async function isUpToDate(from, to) {
  try {
    const [src, dest] = await Promise.all([stat(from), stat(to)]);
    return src.size === dest.size && dest.mtimeMs >= src.mtimeMs;
  } catch {
    return false;
  }
}

async function main() {
  const pyodideDir = await resolvePyodideDir();
  const { version } = JSON.parse(
    await readFile(join(pyodideDir, "package.json"), "utf8")
  );
  const outDir = join(process.cwd(), "public", "pyodide");
  await mkdir(outDir, { recursive: true });

  let copied = 0;
  for (const file of RUNTIME_FILES) {
    const from = join(pyodideDir, file);
    const to = join(outDir, file);

    try {
      await stat(from);
    } catch {
      throw new Error(
        `Pyodide ${version} is missing ${file}; cannot serve the Python runtime.`
      );
    }

    if (await isUpToDate(from, to)) continue;
    await copyFile(from, to);
    copied += 1;
  }

  // Lets the client log which runtime it booted without parsing the lockfile.
  await writeFile(
    join(outDir, "beblocky-version.json"),
    `${JSON.stringify({ version }, null, 2)}\n`
  );

  console.log(
    copied === 0
      ? `pyodide ${version}: public/pyodide already up to date`
      : `pyodide ${version}: synced ${copied} file(s) to public/pyodide`
  );
}

main().catch((error) => {
  console.error(`[sync-pyodide] ${error.message}`);
  process.exit(1);
});
