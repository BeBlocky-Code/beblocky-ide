"use client";

import { useRef, useEffect, useState, ReactElement } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { IChatMessage } from "@/types/ai";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { SafeMarkdown } from "@/components/markdown/safe-markdown";
import { useTheme } from "./context/theme-provider";
import IdeChatInput from "./ide-chat-input";

// Typewriter component for AI responses
const TypewriterContent = ({ 
  content, 
  onComplete,
  renderMarkdown 
}: { 
  content: string; 
  onComplete?: () => void;
  renderMarkdown: (content: string) => ReactElement;
}) => {
  const [displayedContent, setDisplayedContent] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < content.length) {
      const timeout = setTimeout(() => {
        setDisplayedContent(prev => prev + content[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, 5); // Faster (5ms)
      return () => clearTimeout(timeout);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, content, onComplete]);

  return renderMarkdown(displayedContent);
};

interface IdeMessageListProps {
  messages: IChatMessage[];
  isThinking: boolean;
  inputValue: string;
  selectedConversationId: string;
  onInputChange: (value: string) => void;
  onSendMessage: (value?: string) => void;
  typedMessages: Set<string>;
  setTypedMessages: React.Dispatch<React.SetStateAction<Set<string>>>;
}

// Index of the assistant message that should get typewriter (set only when we just finished thinking)
function useNewResponseTypewriterIndex(
  isThinking: boolean,
  displayMessagesLength: number,
  lastMessageIsAssistant: boolean
) {
  const [index, setIndex] = useState<number | null>(null);
  const prevThinkingRef = useRef(isThinking);

  useEffect(() => {
    const justFinished = prevThinkingRef.current && !isThinking;
    prevThinkingRef.current = isThinking;
    if (justFinished && lastMessageIsAssistant && displayMessagesLength > 0) {
      setIndex(displayMessagesLength - 1);
    }
  }, [isThinking, displayMessagesLength, lastMessageIsAssistant]);

  // Clear when conversation changes (fewer messages)
  useEffect(() => {
    if (index !== null && displayMessagesLength <= index) {
      setIndex(null);
    }
  }, [displayMessagesLength, index]);

  return [index, setIndex] as const;
}

export default function IdeMessageList({
  messages,
  isThinking,
  inputValue,
  selectedConversationId,
  onInputChange,
  onSendMessage,
  typedMessages,
  setTypedMessages,
}: IdeMessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);
  const { theme } = useTheme();
  const accentColor = theme === "dark" ? "#892FFF" : "#FF932C";

  // Filter out the first element (index 0) as it's not important for display
  const displayMessages = messages.filter((_, i) => i > 0);
  const lastMessageIsAssistant =
    displayMessages.length > 0 &&
    displayMessages[displayMessages.length - 1].role === "assistant";
  const [newResponseTypewriterIndex, setNewResponseTypewriterIndex] =
    useNewResponseTypewriterIndex(
      isThinking,
      displayMessages.length,
      lastMessageIsAssistant
    );

  // Scroll to bottom of messages when new messages are added
  useEffect(() => {
    if (isFirstRender.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      isFirstRender.current = false;
      return;
    }
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Render markdown content with code syntax highlighting
  const renderMarkdown = (content: string, isUser: boolean) => {
    if (isUser) {
      // User messages are plain text with better typography
      return (
        <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap break-words">
          {content}
        </p>
      );
    }

    return (
      <SafeMarkdown
        content={content}
        theme={theme}
        className="markdown-content max-w-full min-w-0 break-words [&_h1]:text-lg [&_h1]:sm:text-xl [&_h1]:font-black [&_h1]:mt-4 [&_h1]:mb-2 [&_h1]:text-foreground [&_h2]:text-base [&_h2]:sm:text-lg [&_h2]:font-black [&_h2]:mt-3 [&_h2]:mb-2 [&_h2]:text-foreground [&_h3]:text-sm [&_h3]:sm:text-base [&_h3]:font-black [&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:text-foreground [&_p]:mb-3 [&_p]:text-foreground/90 [&_p]:leading-relaxed [&_strong]:font-black [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:mb-3 [&_ul]:text-foreground/90 [&_ol]:list-decimal [&_ol]:ml-5 [&_ol]:mb-3 [&_ol]:text-foreground/90 [&_li]:mb-1.5 [&_code]:bg-foreground/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_code]:text-[10px] [&_code]:font-black [&_pre]:my-4 [&_pre]:rounded-2xl [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_pre]:min-w-0 [&_hr]:my-4 [&_hr]:border-border/40 [&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-foreground/70"
      />
    );
  };

  return (
    <div className="flex-1 min-h-0 relative flex flex-col min-w-0 overflow-x-hidden">
      <ScrollArea className="bg-transparent flex-1 p-2 sm:p-6 min-h-0 h-full scrollbar-hide min-w-0 overflow-x-hidden">
        <div className="bg-transparent space-y-4 sm:space-y-6 min-h-full pb-32 min-w-0 max-w-full overflow-x-hidden">
          {displayMessages.map((message, index) => {
            const isUser = message.role === "user";
            return (
              <div
                key={index}
                className={cn(
                  "flex w-full min-w-0",
                  isUser ? "justify-end" : "justify-start"
                )}
              >
                <div className={cn(
                  "group relative w-full min-w-0 max-w-full",
                  isUser ? "flex flex-col items-end max-w-[90%] sm:max-w-[75%] ml-auto" : "items-start w-full max-w-[92%] sm:max-w-full"
                )}>
                  {isUser ? (
                    <div className="flex flex-col items-end gap-2 w-full min-w-0">
                      <div className="bg-primary text-white rounded-[1.5rem] rounded-tr-[0.5rem] px-4 py-3 shadow-lg shadow-primary/10 relative overflow-hidden max-w-full min-w-0">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                        <div className="relative z-10 text-xs sm:text-sm min-w-0 overflow-hidden">
                          {renderMarkdown(message.content, true)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-start gap-3 w-full min-w-0 max-w-full">
                      <div className="px-1 py-1 w-full min-w-0 max-w-full">
                        <div className="text-xs sm:text-lg leading-relaxed text-foreground/90 font-medium break-words min-w-0 max-w-full">
                          {message.role === "assistant" && index === newResponseTypewriterIndex ? (
                            <TypewriterContent 
                              content={message.content} 
                              renderMarkdown={(c) => renderMarkdown(c, false)}
                              onComplete={() => setNewResponseTypewriterIndex(null)}
                            />
                          ) : (
                            renderMarkdown(message.content, false)
                          )}
                        </div>
                        <div className="mt-6 flex items-center gap-4">
                          <span
                            className={cn(
                              "text-[9px] font-bold uppercase tracking-tight",
                              theme === "light" ? "text-violet-600" : "text-[#FF9933]"
                            )}
                          >
                            {new Date(message.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {isThinking && (
            <div className="flex flex-col items-start gap-3 w-full animate-pulse transition-opacity duration-1000 px-2">
              <div className="h-10 sm:h-12 w-3/4 bg-muted/20 rounded-2xl rounded-tl-none border border-border/10 flex items-center px-4">
                <div className="flex gap-1.5 items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-[bounce_1s_infinite_0ms]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-[bounce_1s_infinite_200ms]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-[bounce_1s_infinite_400ms]" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </ScrollArea>

      {/* Floating Chat Input */}
      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-background/90 via-background/40 to-transparent pointer-events-none">
        <div className="max-w-4xl mx-auto w-full pointer-events-auto">
          <IdeChatInput
            inputValue={inputValue}
            selectedConversationId={selectedConversationId}
            isThinking={isThinking}
            onInputChange={onInputChange}
            onSendMessage={onSendMessage}
          />
        </div>
      </div>
    </div>
  );
}
