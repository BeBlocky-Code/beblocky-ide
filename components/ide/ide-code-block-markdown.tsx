"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy,
  Check,
  Maximize2,
  Minimize2,
  FileText,
  Terminal,
  Play,
  Code2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Prism from "prismjs";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-java";
import "prismjs/components/prism-css";
import "prismjs/components/prism-markup";

interface CodeBlockProps {
  code: string;
  language: string;
  filename?: string;
}

export function ModernCodeBlock({ code, language, filename }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const codeRef = useRef<HTMLElement>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [code, language]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = null;
      }
    };
  }, []);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = null;
      }
      setCopied(true);
      copyTimeoutRef.current = setTimeout(() => {
        copyTimeoutRef.current = null;
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  const getLanguageColor = (lang: string) => {
    const colors: Record<string, string> = {
      javascript: "from-yellow-400 to-yellow-600",
      typescript: "from-blue-400 to-blue-600",
      python: "from-green-400 to-green-600",
      java: "from-red-400 to-red-600",
      css: "from-purple-400 to-purple-600",
      html: "from-orange-400 to-orange-600",
      json: "from-gray-400 to-gray-600",
      bash: "from-slate-400 to-slate-600",
      shell: "from-slate-400 to-slate-600",
      sql: "from-indigo-400 to-indigo-600",
      default: "from-slate-400 to-slate-600",
    };
    return colors[lang.toLowerCase()] || colors.default;
  };

  const getLanguageIcon = (lang: string) => {
    switch (lang.toLowerCase()) {
      case "bash":
      case "shell":
        return Terminal;
      case "javascript":
      case "typescript":
      case "python":
      case "java":
        return Play;
      default:
        return Code2;
    }
  };

  const LanguageIcon = getLanguageIcon(language);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="my-4 w-full min-w-0"
    >
      <div className="overflow-hidden rounded-[1.5rem] border border-border/40 bg-card/30 dark:bg-slate-950/50 backdrop-blur-md shadow-sm w-full max-w-full min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-muted/10 backdrop-blur-md border-b border-border/40">
          <div className="flex items-center gap-3">
            {/* File name */}
            {filename && (
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-xs font-black tracking-tight text-foreground/80">
                  {filename}
                </span>
              </div>
            )}
            {!filename && (
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                  Source Code
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Language Badge */}
            <div
              className={cn(
                "px-2.5 py-1 text-[10px] font-black rounded-full text-white bg-gradient-to-r shadow-sm",
                getLanguageColor(language),
              )}
            >
              <LanguageIcon className="inline-block h-3 w-3 mr-1" />
              {language.toUpperCase()}
            </div>

            {/* Expand/Collapse */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 hover:bg-muted/50 rounded-full text-muted-foreground transition-colors"
            >
              {isExpanded ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>

            {/* Copy */}
            <button
              onClick={copyToClipboard}
              title="Copy code"
              aria-label="Copy code"
              className="p-1.5 hover:bg-muted/50 rounded-full text-muted-foreground transition-colors touch-manipulation"
            >
              <AnimatePresence mode="wait">
                {copied ? (
                  <motion.div
                    key="check"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Check className="h-4 w-4 text-green-500" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="copy"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Copy className="h-4 w-4" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>

        {/* Code Content */}
        <motion.div
          animate={{ height: isExpanded ? "auto" : "auto" }}
          transition={{ duration: 0.3 }}
          className={cn(
            "relative overflow-auto max-h-[500px] w-full max-w-full min-w-0",
            isExpanded && "max-h-none",
          )}
        >
          <div className="w-full max-w-full min-w-0 overflow-x-auto overflow-y-hidden p-4">
            <pre className="m-0 bg-transparent w-max whitespace-pre">
              <code
                ref={codeRef}
                className={`language-${language} text-base sm:text-lg font-medium leading-relaxed block`}
              >
                {code}
              </code>
            </pre>
          </div>

          {!isExpanded && (
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-slate-50 dark:from-slate-900 to-transparent pointer-events-none" />
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
