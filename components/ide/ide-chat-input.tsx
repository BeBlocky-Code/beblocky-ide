"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowUpFromDot } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "./context/theme-provider";

interface IdeChatInputProps {
  inputValue: string;
  selectedConversationId: string;
  isThinking: boolean;
  onInputChange: (value: string) => void;
  onSendMessage: (value?: string) => void;
}

export default function IdeChatInput({
  inputValue,
  selectedConversationId,
  isThinking,
  onInputChange,
  onSendMessage,
}: IdeChatInputProps) {
  const { theme } = useTheme();
  const accentColor = theme === "dark" ? "#892FFF" : "#FF932C";
  // Local state so typing doesn't trigger parent re-renders (fixes lag)
  const [localValue, setLocalValue] = useState(inputValue);
  const [placeholder, setPlaceholder] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(0);
  const [typingSpeed, setTypingSpeed] = useState(150);

  // Sync from parent when it clears (e.g. after send) or when conversation changes
  useEffect(() => {
    setLocalValue(inputValue);
  }, [inputValue]);

  const suggestions = useMemo(() => [
    "Explain this code to me...",
    "How do I center a div?",
    "Fix my syntax errors...",
    "Optimize this function...",
    "What's the best practice here?",
  ], []);

  useEffect(() => {
    // Stop placeholder animation if user is typing (use localValue to avoid depending on parent)
    if (localValue) {
      setPlaceholder("");
      return;
    }

    let timer: NodeJS.Timeout;
    const handleTyping = () => {
      const i = loopNum % suggestions.length;
      const fullText = suggestions[i];

      setPlaceholder(
        isDeleting
          ? fullText.substring(0, placeholder.length - 1)
          : fullText.substring(0, placeholder.length + 1)
      );

      setTypingSpeed(isDeleting ? 50 : 100);

      if (!isDeleting && placeholder === fullText) {
        timer = setTimeout(() => setIsDeleting(true), 2000);
      } else if (isDeleting && placeholder === "") {
        setIsDeleting(false);
        setLoopNum(loopNum + 1);
      } else {
        timer = setTimeout(handleTyping, typingSpeed);
      }
    };

    timer = setTimeout(handleTyping, typingSpeed);
    return () => clearTimeout(timer);
  }, [placeholder, isDeleting, loopNum, typingSpeed, suggestions, localValue]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isThinking && localValue.trim()) {
      const value = localValue;
      setLocalValue(""); // clear immediately so input is empty after send
      onInputChange("");
      onSendMessage(value);
    }
  };

  const handleSend = () => {
    if (!localValue.trim() || isThinking) return;
    const value = localValue;
    setLocalValue(""); // clear immediately so input is empty after send
    onInputChange("");
    onSendMessage(value);
  };

  return (
    <div className="px-4 pb-4 pt-1 bg-transparent">
      <div className="relative max-w-2xl mx-auto">
        <div className="relative bg-card/60 backdrop-blur-xl border border-border/40 rounded-full p-1.5 flex items-center gap-2 shadow-sm transition-all h-11 sm:h-12">
          <Input
            placeholder={placeholder}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isThinking}
            className="flex-1 border-none focus-visible:ring-0 bg-transparent text-xs sm:text-sm font-medium px-4 h-full placeholder:text-muted-foreground/30"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={isThinking || !localValue.trim()}
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-full text-white hover:scale-105 active:scale-95 transition-all shadow-md flex-shrink-0 border-0"
            style={{ 
              backgroundColor: accentColor, 
              opacity: localValue.trim() ? 1 : 0.5 
            }}
          >
            <ArrowUpFromDot size={16} className={cn("transition-transform duration-500", !localValue.trim() ? "scale-75" : "scale-100")} />
          </Button>
        </div>
      </div>
    </div>
  );
}
