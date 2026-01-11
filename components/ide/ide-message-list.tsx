"use client";

import { useRef, useEffect, ReactElement } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot } from "lucide-react";
import { IChatMessage } from "@/types/ai";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { SafeMarkdown } from "@/components/markdown/safe-markdown";
import { useTheme } from "./context/theme-provider";

interface IdeMessageListProps {
  messages: IChatMessage[];
  isThinking: boolean;
}

export default function IdeMessageList({
  messages,
  isThinking,
}: IdeMessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  // Scroll to bottom of messages when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Filter out the first element (index 0) as it's not important for display
  const displayMessages = messages.slice(1);

  // Render markdown content with code syntax highlighting
  const renderMarkdown = (content: string, isUser: boolean) => {
    if (isUser) {
      // User messages are plain text, no markdown rendering
      return (
        <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">
          {content}
        </p>
      );
    }

    return (
      <SafeMarkdown
        content={content}
        theme={theme}
        className="markdown-content break-words [&_h1]:text-lg [&_h1]:sm:text-xl [&_h1]:font-bold [&_h1]:mt-3 [&_h1]:sm:mt-4 [&_h1]:mb-2 [&_h1]:text-slate-900 [&_h1]:dark:text-slate-100 [&_h1]:break-words [&_h2]:text-base [&_h2]:sm:text-lg [&_h2]:font-bold [&_h2]:mt-2 [&_h2]:sm:mt-3 [&_h2]:mb-2 [&_h2]:text-slate-900 [&_h2]:dark:text-slate-100 [&_h2]:break-words [&_h3]:text-sm [&_h3]:sm:text-base [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:text-slate-900 [&_h3]:dark:text-slate-100 [&_h3]:break-words [&_p]:mb-2 [&_p]:text-slate-700 [&_p]:dark:text-slate-300 [&_p]:break-words [&_strong]:font-bold [&_strong]:text-slate-900 [&_strong]:dark:text-slate-100 [&_strong]:break-words [&_ul]:list-disc [&_ul]:ml-4 [&_ul]:sm:ml-6 [&_ul]:mb-2 [&_ul]:text-slate-700 [&_ul]:dark:text-slate-300 [&_ul]:break-words [&_ol]:list-decimal [&_ol]:ml-4 [&_ol]:sm:ml-6 [&_ol]:mb-2 [&_ol]:text-slate-700 [&_ol]:dark:text-slate-300 [&_ol]:break-words [&_li]:mb-1 [&_li]:break-words [&_code]:bg-slate-100 [&_code]:dark:bg-slate-800 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono [&_code]:text-slate-900 [&_code]:dark:text-slate-100 [&_code]:break-all [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_table]:max-w-full [&_table]:overflow-x-auto [&_hr]:my-3 [&_hr]:sm:my-4 [&_hr]:border-slate-300 [&_hr]:dark:border-slate-700 [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:dark:border-slate-700 [&_blockquote]:pl-3 [&_blockquote]:sm:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-600 [&_blockquote]:dark:text-slate-400 [&_blockquote]:break-words"
      />
    );
  };

  return (
    <ScrollArea className="bg-transparent flex-1 sm:p-4 min-h-0 h-full custom-scrollbar">
      <div className="bg-transparent space-y-3 sm:space-y-4 min-h-full">
        {displayMessages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {message.role === "user" ? (
              <div className="relative max-w-[90%] sm:max-w-[85%] w-fit">
                {/* Chat bubble with tail */}
                <div className="bg-primary text-primary-foreground rounded-xl sm:rounded-2xl rounded-tr-sm px-3 py-2 sm:px-4 sm:py-2.5 shadow-sm relative">
                  <div className="overflow-x-auto custom-scrollbar-horizontal">
                    {renderMarkdown(message.content, true)}
                  </div>
                  {/* Tail/swoosh pointing right - hidden on very small screens */}
                  <svg
                    className="absolute right-0 bottom-0 translate-x-full hidden min-[400px]:block"
                    width="12"
                    height="20"
                    viewBox="0 0 12 20"
                  >
                    <path d="M0 0 L12 10 L0 20 Z" fill="hsl(var(--primary))" />
                  </svg>
                </div>
              </div>
            ) : (
              <div className="w-full max-w-[90%] sm:max-w-[85%] min-w-0 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="flex items-start gap-2 sm:gap-3 min-w-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <Bot
                      size={14}
                      className="sm:size-4 text-primary-foreground"
                    />
                  </div>
                  <div className="flex-1 min-w-0 w-0 overflow-hidden">
                    <div className="overflow-x-auto custom-scrollbar-horizontal break-words">
                      {renderMarkdown(message.content, false)}
                    </div>
                    <p className="text-xs mt-1.5 sm:mt-2 text-muted-foreground">
                      {new Date(message.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        {isThinking && (
          <div className="flex justify-start">
            <div className="w-full max-w-[90%] sm:max-w-[85%] min-w-0 rounded-xl sm:rounded-2xl p-3 sm:p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <Bot
                    size={14}
                    className="sm:size-4 text-primary-foreground"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Shimmer duration={1.5}>AI is thinking...</Shimmer>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
}
