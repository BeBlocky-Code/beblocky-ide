# Marked + react-syntax-highlighter Markdown Preview Spec (BeBlocky-compatible)

Use this document as a **prompt/spec** for another project to reproduce the **preview-only** markdown rendering behavior from this repo’s `components/markdown/modern-editor.tsx`.

## Goal

Implement a **safe markdown preview renderer** that:

- Parses markdown using **`marked`** (GFM + breaks enabled).
- Renders markdown via a **token-based React renderer** (use `marked.lexer()`), **not** by injecting full HTML into the DOM.
- Renders fenced code blocks using **`react-syntax-highlighter`** (Prism) with theme switching.
- **Does not render arbitrary HTML**, except a small allowlist (images + a few inline tags).

## Dependencies (required)

- `marked`
- `react-syntax-highlighter`
- `dompurify`

## Rendering rules (must match)

### Markdown parsing

- Configure `marked` with:
  - `breaks: true`
  - `gfm: true`
- Convert markdown into tokens using:
  - `marked.lexer(markdownString)`

### Code blocks (fenced) and inline code

- Fenced code blocks must be rendered with:
  - `Prism as SyntaxHighlighter` from `react-syntax-highlighter`
  - Prism styles: `oneDark` and `oneLight` (switch by theme)
- Inline code (backticks) must render as a `<code>` element (no syntax highlighter).
- **Important**: inside inline code and fenced code, decode HTML entities so `<` is shown as `<` (not `&lt;`).
  - At minimum decode: `&lt;`, `&gt;`, `&amp;`, `&quot;`, `&#39;`.

### Supported token types (expected output)

Your renderer should support these token types at least:

- **Block tokens**
  - `heading` → `h1/h2/h3...`
  - `paragraph` → `p`
  - `list` → `ul/ol` with `li`
  - `blockquote` → `blockquote`
  - `code` → `SyntaxHighlighter` block
  - `hr` → `hr`
  - `table` → `table` with `thead/tbody` (basic support)
  - `html` → sanitized, restricted (see below)
- **Inline tokens**
  - `strong` → `strong`
  - `em` → `em`
  - `codespan` → `code`
  - `link` → `a` with `target="_blank"` and `rel="noreferrer"`
  - `image` → `img`
  - `br` → `br`
  - `del` → `del`
  - `text` → text
  - `html` → sanitized, restricted (see below)

### HTML policy (strict allowlist)

The preview must **not** render arbitrary HTML.

Allowed tags (inline HTML allowlist):

- `img`
- `span`
- `sup`
- `sub`
- `br`

Allowed attributes:

- `style`
- `src`, `alt`, `width`, `height`, `title`

Rules:

- Inline HTML tokens:
  - If the HTML does **not** include one of the allowed tags above, **render nothing** for that token.
  - If it includes an allowed tag, sanitize it with `DOMPurify` using only the allowlisted tags/attrs.
- Block HTML tokens:
  - Sanitize with `DOMPurify`, allowing only `p`, `div`, plus the inline allowlist above.
- If you’re in an SSR environment:
  - Guard sanitization behind `typeof window !== "undefined"` (DOMPurify requires browser globals).

## “Showcase” markdown (the other project must render this correctly)

Paste this exact content into the preview. The output should match the intent described in the checklist below.

````md
# Markdown Preview Showcase

This line has **bold**, _italic_, and ~~strikethrough~~.

Inline code must show `<` correctly: `<!DOCTYPE html>` and `<div class="x">Hello</div>`.

---

## Lists

- Bullet A
- Bullet B
  - Nested item

1. First
2. Second

> Blockquote: `<` and `>` must render normally in text, and inline code stays monospace.

---

## Links

External link: [example](https://example.com)

---

## Images (the only HTML we keep)

Markdown image:
![Alt text](https://placehold.co/600x200/png)

HTML image (allowed):
<img src="https://placehold.co/320x120/png" alt="demo image" width="320" height="120" />

---

## Superscript/Subscript + Color (allowed HTML)

Math: x<sup>2</sup> + y<sup>2</sup> = z<sup>2</sup>

Chemistry: H<sub>2</sub>O

Color via span:
<span style="color:#7c3aed;">Purple text</span> and <span style="color:rgb(59,130,246);">Blue text</span>

Hard break using br (allowed): First line<br>Second line

---

## Table

| Feature     | Expected              |
| ----------- | --------------------- |
| Code blocks | Highlighted           |
| HTML        | Only allowlisted tags |

---

## Code block (must NOT escape `<`)

```html
<!DOCTYPE html>
<html>
  <body>
    <h1>Hello</h1>
  </body>
</html>
```
````

```tsx
export function Demo() {
  return <div data-x="1">Hello</div>;
}
```

---

## XSS should be blocked (must NOT run / must NOT render script)

<script>alert("xss")</script>
<img src="x" onerror="alert('xss')" />
```

## Acceptance checklist (quick visual validation)

- **Inline code** shows `<` characters (no `&lt;` in the rendered output).
- **Fenced code blocks** are syntax-highlighted and also show `<` correctly.
- **Links** open in a new tab and include `rel="noreferrer"`.
- **Images** render for both `![alt](url)` and allowlisted `<img ... />`.
- **Disallowed HTML** (like `<script>`) does not render and does not execute.
- **Allowlisted inline HTML** renders and is sanitized (no `onerror` attributes, etc.).

## Implementation hint (non-negotiable approach)

To match this behavior, do **token-based rendering**:

- `tokens = marked.lexer(markdown)`
- `renderBlocks(tokens)` → React nodes
- `renderInline(token.tokens)` → React nodes
- `code` token → `SyntaxHighlighter` (Prism) with `oneDark/oneLight`
- Decode HTML entities inside code tokens before rendering
