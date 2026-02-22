"use client";

import { motion } from "framer-motion";
import { Code2, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "./context/theme-provider";

interface IdeModeToggleProps {
  mode: "ide" | "ai";
  onModeChange: (mode: "ide" | "ai") => void;
}

export default function IdeModeToggle({
  mode,
  onModeChange,
}: IdeModeToggleProps) {
  const { theme } = useTheme();
  const accentColor = theme === "dark" ? "#892FFF" : "#FF932C";

  return (
    <div
      className="relative flex items-center rounded-full p-1 bg-muted/50 border border-border/40 shadow-inner w-fit min-w-[140px] xs:min-w-[180px] md:min-w-[220px]"
    >
      {/* Sliding pill background */}
      <motion.div
        className="absolute h-[calc(100%-8px)] rounded-full shadow-sm"
        style={{ 
          background: accentColor,
          width: "calc(50% - 4px)" 
        }}
        initial={false}
        animate={{
          x: mode === "ide" ? 0 : "100%",
        }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      />

      {/* IDE Mode button */}
      <button
        onClick={() => onModeChange("ide")}
        className={cn(
          "relative z-10 flex-1 flex items-center justify-center gap-1 md:gap-2 px-2 md:px-4 py-1.5 rounded-full text-[10px] md:text-xs font-bold transition-colors duration-300",
          mode === "ide" ? "text-white" : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Code2 size={14} className="shrink-0" />
        <span className="truncate">IDE <span className="hidden xs:inline">Mode</span></span>
      </button>

      {/* AI Mode button */}
      <button
        onClick={() => onModeChange("ai")}
        className={cn(
          "relative z-10 flex-1 flex items-center justify-center gap-1 md:gap-2 px-2 md:px-4 py-1.5 rounded-full text-[10px] md:text-xs font-bold transition-colors duration-300",
          mode === "ai" ? "text-white" : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Bot size={14} className="shrink-0" />
        <span className="truncate">AI <span className="hidden xs:inline">Mode</span></span>
      </button>
    </div>
  );
}
