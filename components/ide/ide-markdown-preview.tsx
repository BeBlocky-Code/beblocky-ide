"use client";

import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Code2,
  FileText,
  Hash,
  Quote,
  List,
  Link,
  ImageIcon,
} from "lucide-react";
import { SafeMarkdown } from "@/components/markdown/safe-markdown";
import { useTheme } from "./context/theme-provider";

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

export default function IdeMarkdownPreview({
  content,
  className,
}: MarkdownPreviewProps) {
  const { theme } = useTheme();

  const getContentTypeIcon = (content: string) => {
    if (content.includes("```")) return Code2;
    if (content.includes("#")) return Hash;
    if (content.includes(">")) return Quote;
    if (content.includes("-") || content.includes("*")) return List;
    if (content.includes("[") && content.includes("](")) return Link;
    if (content.includes("![")) return ImageIcon;
    return FileText;
  };

  const ContentIcon = getContentTypeIcon(content);

  const markdownClassName = useMemo(
    () =>
      `prose prose-slate dark:prose-invert max-w-none 
        prose-headings:scroll-m-20 prose-headings:font-semibold prose-headings:tracking-tight
        prose-h1:text-3xl prose-h1:font-bold prose-h1:bg-gradient-to-r prose-h1:from-slate-900 prose-h1:to-slate-600 prose-h1:bg-clip-text prose-h1:text-transparent dark:prose-h1:from-white dark:prose-h1:to-slate-300
        prose-h2:text-2xl prose-h2:font-semibold prose-h2:border-b prose-h2:border-border/50 prose-h2:pb-2
        prose-h3:text-xl prose-h3:font-medium
        prose-p:leading-7 prose-p:text-slate-700 dark:prose-p:text-slate-300
        prose-blockquote:border-l-4 prose-blockquote:border-primary/50 prose-blockquote:bg-primary/5 prose-blockquote:rounded-r-lg prose-blockquote:py-2 prose-blockquote:px-4
        prose-ul:my-6 prose-li:my-2
        prose-a:text-primary prose-a:font-medium prose-a:no-underline hover:prose-a:underline
        prose-strong:text-slate-900 dark:prose-strong:text-white prose-strong:font-semibold
        prose-code:bg-slate-100 dark:prose-code:bg-slate-800 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-sm prose-code:font-medium prose-code:before:content-none prose-code:after:content-none
        prose-table:border-collapse prose-table:border prose-table:border-border/50 prose-table:rounded-lg prose-table:overflow-hidden
        prose-th:bg-slate-50 dark:prose-th:bg-slate-800 prose-th:border prose-th:border-border/50 prose-th:px-4 prose-th:py-2 prose-th:font-semibold
        prose-td:border prose-td:border-border/50 prose-td:px-4 prose-td:py-2 w-full`,
    []
  );

  return (
    <div className={cn("h-full overflow-hidden", className)}>
      <Card className="h-full bg-gradient-to-br from-slate-50/80 to-white/80 dark:from-slate-900/80 dark:to-slate-800/80 backdrop-blur-sm border-0 shadow-xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between p-2 border-b border-border/50 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm"
        ></motion.div>

        {/* Content */}
        <ScrollArea className="h-[calc(100%-44px)] w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="p-4 w-full"
          >
            <SafeMarkdown
              content={content || ""}
              theme={theme}
              className={markdownClassName}
            />
          </motion.div>
        </ScrollArea>
      </Card>
    </div>
  );
}
