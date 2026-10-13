# Bundle analysis — AST-495 (learn route)

Tool: `next experimental-analyze -o` (Turbopack), summarized with
`node scripts/summarize-analyze.mjs . [rows]`. Figures are per-package compressed
size across all client output files for `/courses/[courseId]/learn`, including
lazy chunks (analyzer estimate; differs slightly from whole-file gzip).

First-paint JS from `measure.mjs` (HTML entry scripts, gz):

| | scripts | gz |
|---|---|---|
| before | 12 | 361 KB |
| after | 13 | 338 KB |

Largest entry chunk: 160 KB -> 123 KB.

## Changes

- `safe-markdown.tsx`: `Prism` (all refractor languages) -> `PrismLight` with the
  15 languages lessons use; one-dark/one-light imported directly. refractor 269 KB -> 20 KB gz.
- framer-motion: `motion` -> `m` under a root `LazyMotion` (`components/motion`), with
  `domAnimation` loaded after first paint. Also unified the `motion/react` import in `shimmer.tsx`.
- Not changed: query persister (~3 KB, would add a hydration race), jszip (already dynamic),
  root layout (no highlight.js import left after AST-491).

## Before
```

Client output (learn route analysis): 2939KB raw, 1064KB compressed (per-module est.)
  268.9KB gz   568.9KB raw  refractor
  258.7KB gz   720.7KB raw  next
  194.7KB gz   704.3KB raw  ace-builds
   47.1KB gz   139.7KB raw  app code (components)
   41.2KB gz    88.5KB raw  motion-dom
   18.3KB gz    98.5KB raw  app code (app)
   17.7KB gz    41.6KB raw  jszip
   15.4KB gz    43.1KB raw  pako
   14.8KB gz    30.8KB raw  framer-motion
   14.7KB gz    37.4KB raw  @tanstack/query-core
   11.3KB gz    40.6KB raw  marked
   10.1KB gz    30.9KB raw  react-resizable-panels
   10.0KB gz    27.2KB raw  dompurify
    8.6KB gz    40.3KB raw  react-syntax-highlighter
```

## After
```

Client output (learn route analysis): 2381KB raw, 809KB compressed (per-module est.)
  258.7KB gz   720.7KB raw  next
  194.7KB gz   704.3KB raw  ace-builds
   47.4KB gz   140.4KB raw  app code (components)
   39.8KB gz    75.0KB raw  motion-dom
   20.2KB gz    45.5KB raw  refractor
   18.3KB gz    98.5KB raw  app code (app)
   17.7KB gz    41.6KB raw  jszip
   15.4KB gz    43.1KB raw  pako
   14.6KB gz    37.4KB raw  @tanstack/query-core
   11.3KB gz    37.7KB raw  marked
   10.6KB gz    18.0KB raw  framer-motion
   10.1KB gz    30.9KB raw  react-resizable-panels
   10.0KB gz    27.1KB raw  dompurify
    8.5KB gz    13.3KB raw  lucide-react
```

## Browser measurement (local prod build, signed in, Course 1 learn)

| | JS transferred (gz) | Lighthouse desktop perf | LCP | TBT |
|---|---|---|---|---|
| main | 787 KB | 82 | 1677 ms | 210 ms |
| this branch | 593 KB | 91 | 1209 ms | 97 ms |
