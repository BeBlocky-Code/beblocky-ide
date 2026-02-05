"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";

type Theme = "light" | "dark";

export interface SafeMarkdownProps {
  content: string;
  theme?: Theme;
  className?: string;
}

type AnyToken = any;

// Configure marked once (client-only file).
marked.setOptions({ breaks: true, gfm: true });

function decodeHtmlEntities(input: string): string {
  return (
    input
      // Order matters: decode &amp; last
      .replaceAll("&lt;", "<")
      .replaceAll("&gt;", ">")
      .replaceAll("&quot;", '"')
      .replaceAll("&#39;", "'")
      .replaceAll("&amp;", "&")
  );
}

function hasAllowedInlineTag(html: string): boolean {
  return /<\/?(img|span|sup|sub|br)\b/i.test(html);
}

function hasAllowedBlockTag(html: string): boolean {
  return /<\/?(p|div|img|span|sup|sub|br)\b/i.test(html);
}

function sanitizeHtml(html: string, kind: "inline" | "block"): string {
  if (typeof window === "undefined") return "";

  const inlineTags = ["img", "span", "sup", "sub", "br"];
  const inlineAttrs = ["style", "src", "alt", "width", "height", "title"];

  const allowedTags = kind === "inline" ? inlineTags : ["p", "div", ...inlineTags];
  const allowedAttrs = inlineAttrs;

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: allowedTags,
    ALLOWED_ATTR: allowedAttrs,
  });
}

function isPossiblyUnsafeUrl(url: string): boolean {
  const u = url.trim().toLowerCase();
  return (
    u.startsWith("javascript:") ||
    u.startsWith("vbscript:") ||
    u.startsWith("data:")
  );
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 64);
}

function inlinePlainText(tokens: AnyToken[] | undefined): string {
  if (!tokens || !Array.isArray(tokens)) return "";
  let out = "";
  for (const t of tokens) {
    if (!t) continue;
    if (t.type === "text") out += t.text || "";
    else if (t.type === "codespan") out += decodeHtmlEntities(t.text || "");
    else if (t.type === "link") out += inlinePlainText(t.tokens) || t.text || "";
    else if (t.type === "image") out += t.text || "";
    else if (t.tokens) out += inlinePlainText(t.tokens);
  }
  return out;
}

function HeadingWithCopy({
  level,
  id,
  children,
}: {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  id: string | undefined;
  children: React.ReactNode;
}) {
  const Tag = (`h${level}` as unknown) as React.ElementType;
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = null;
      }
    };
  }, []);

  return (
    <Tag id={id} className="group">
      {children}
      {id && (
        <button
          type="button"
          data-heading-copy="true"
          className="ml-2 inline-flex items-center opacity-0 group-hover:opacity-100 transition-opacity text-xs px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80"
          title={copied ? "Copied!" : "Copy link"}
          onClick={() => {
            const url = `${window.location.origin}${window.location.pathname}#${id}`;
            navigator.clipboard
              .writeText(url)
              .then(() => {
                if (copyTimeoutRef.current) {
                  clearTimeout(copyTimeoutRef.current);
                  copyTimeoutRef.current = null;
                }
                setCopied(true);
                copyTimeoutRef.current = window.setTimeout(() => {
                  copyTimeoutRef.current = null;
                  setCopied(false);
                }, 1200);
              })
              .catch(() => {});
          }}
        >
          #
        </button>
      )}
    </Tag>
  );
}

export function SafeMarkdown({ content, theme = "light", className }: SafeMarkdownProps) {
  const tokens = useMemo(() => marked.lexer(content || ""), [content]);

  const renderInline = (inlineTokens: AnyToken[] | undefined): React.ReactNode => {
    if (!inlineTokens || !Array.isArray(inlineTokens)) return null;

    return inlineTokens.map((t, idx) => {
      if (!t) return null;

      switch (t.type) {
        case "text":
          return <React.Fragment key={idx}>{t.text}</React.Fragment>;
        case "strong":
          return <strong key={idx}>{renderInline(t.tokens)}</strong>;
        case "em":
          return <em key={idx}>{renderInline(t.tokens)}</em>;
        case "del":
          return <del key={idx}>{renderInline(t.tokens)}</del>;
        case "br":
          return <br key={idx} />;
        case "codespan":
          return <code key={idx}>{decodeHtmlEntities(t.text || "")}</code>;
        case "link": {
          const href = String(t.href || "");
          if (!href || isPossiblyUnsafeUrl(href)) {
            return <React.Fragment key={idx}>{renderInline(t.tokens)}</React.Fragment>;
          }
          return (
            <a
              key={idx}
              href={href}
              title={t.title || undefined}
              target="_blank"
              rel="noreferrer"
            >
              {renderInline(t.tokens)}
            </a>
          );
        }
        case "image": {
          const src = String(t.href || "");
          if (!src || isPossiblyUnsafeUrl(src)) return null;
          return (
            <img
              key={idx}
              src={src}
              alt={t.text || ""}
              title={t.title || undefined}
            />
          );
        }
        case "html": {
          const raw = String(t.text || "");
          if (!hasAllowedInlineTag(raw)) return null;
          const sanitized = sanitizeHtml(raw, "inline");
          if (!sanitized) return null;
          return (
            <span
              key={idx}
              dangerouslySetInnerHTML={{
                __html: sanitized,
              }}
            />
          );
        }
        default:
          return t.tokens ? (
            <React.Fragment key={idx}>{renderInline(t.tokens)}</React.Fragment>
          ) : null;
      }
    });
  };

  const renderBlocks = (blockTokens: AnyToken[]): React.ReactNode => {
    if (!blockTokens || !Array.isArray(blockTokens)) return null;

    return blockTokens.map((t, idx) => {
      if (!t) return null;

      switch (t.type) {
        case "space":
          return null;
        case "text": {
          // Marked can emit block-level "text" tokens (commonly inside list items).
          const inlineTokens =
            t.tokens && Array.isArray(t.tokens) ? t.tokens : [{ type: "text", text: t.text }];
          return <p key={idx}>{renderInline(inlineTokens)}</p>;
        }
        case "hr":
          return <hr key={idx} />;
        case "heading": {
          const level = (t.depth ?? 1) as 1 | 2 | 3 | 4 | 5 | 6;
          const id = slugify(inlinePlainText(t.tokens) || t.text || "");
          return (
            <HeadingWithCopy key={idx} level={level} id={id || undefined}>
              {renderInline(t.tokens)}
            </HeadingWithCopy>
          );
        }
        case "paragraph":
          return <p key={idx}>{renderInline(t.tokens)}</p>;
        case "blockquote":
          return <blockquote key={idx}>{renderBlocks(t.tokens || [])}</blockquote>;
        case "list": {
          const Tag = t.ordered ? "ol" : "ul";
          return (
            <Tag key={idx}>
              {(t.items || []).map((item: AnyToken, itemIdx: number) => (
                <li key={itemIdx}>{renderBlocks(item.tokens || [])}</li>
              ))}
            </Tag>
          );
        }
        case "code": {
          const language = t.lang || "text";
          const code = decodeHtmlEntities(String(t.text || ""));
          return (
            <div key={idx} className="my-4 w-full min-w-0">
              <SyntaxHighlighter
                language={language}
                style={theme === "dark" ? oneDark : oneLight}
                PreTag="div"
                customStyle={{
                  borderRadius: "0.75rem",
                  fontSize: "0.85em",
                  padding: "0.9rem",
                  margin: 0,
                  maxWidth: "100%",
                  overflowX: "auto",
                }}
              >
                {code}
              </SyntaxHighlighter>
            </div>
          );
        }
        case "table": {
          const header = t.header || [];
          const rows = t.rows || [];
          return (
            <table key={idx}>
              <thead>
                <tr>
                  {header.map((cell: AnyToken, i: number) => (
                    <th key={i}>
                      {cell?.tokens ? renderInline(cell.tokens) : cell?.text ?? String(cell ?? "")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row: AnyToken[], rIdx: number) => (
                  <tr key={rIdx}>
                    {(row || []).map((cell: AnyToken, cIdx: number) => (
                      <td key={cIdx}>
                        {cell?.tokens
                          ? renderInline(cell.tokens)
                          : cell?.text ?? String(cell ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          );
        }
        case "html": {
          const raw = String(t.text || "");
          if (!hasAllowedBlockTag(raw)) return null;
          const sanitized = sanitizeHtml(raw, "block");
          if (!sanitized) return null;
          return (
            <div
              key={idx}
              dangerouslySetInnerHTML={{
                __html: sanitized,
              }}
            />
          );
        }
        default:
          return null;
      }
    });
  };

  return <div className={className}>{renderBlocks(tokens)}</div>;
}


