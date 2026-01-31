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
      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900/95 shadow-sm w-full max-w-full min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/50">
          <div className="flex items-center gap-3">
            {/* File name */}
            {filename && (
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {filename}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Language Badge */}
            <div
              className={`px-2 py-0.5 text-[10px] rounded-md text-white bg-gradient-to-r ${getLanguageColor(
                language
              )}`}
            >
              <LanguageIcon className="inline-block h-3 w-3 mr-1" />
              {language.toUpperCase()}
            </div>

            {/* Expand/Collapse */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-md text-slate-700 dark:text-slate-300"
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
              className="p-1 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-md text-slate-700 dark:text-slate-300"
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
            "relative overflow-auto max-h-[400px] w-full max-w-full min-w-0",
            isExpanded && "max-h-none"
          )}
        >
          <div className="w-full max-w-full min-w-0 overflow-x-auto">
            <pre className="m-0 bg-transparent w-full min-w-0">
              <code ref={codeRef} className={`language-${language}`}>
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
