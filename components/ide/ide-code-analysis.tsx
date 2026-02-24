"use client";

import { useMemo } from "react";
import { ICodeAnalysis, ICodeFeedback } from "@/types/ai";
import { useTheme } from "./context/theme-provider";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Terminal,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  RotateCcw,
  Zap,
  History,
  Code2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface IdeCodeAnalysisProps {
  isAnalyzing: boolean;
  currentAnalysis: ICodeAnalysis | null;
  codeFeedback: ICodeFeedback[];
  analysisHistory: ICodeAnalysis[];
  onAnalyzeCode: () => void;
  onSelectAnalysis: (analysis: ICodeAnalysis) => void;
}

export default function IdeCodeAnalysis({
  isAnalyzing,
  currentAnalysis,
  codeFeedback,
  analysisHistory,
  onAnalyzeCode,
  onSelectAnalysis,
}: IdeCodeAnalysisProps) {
  const { theme } = useTheme();
  const accentColor = theme === "dark" ? "#892FFF" : "#FF932C";

  const displayFeedback = codeFeedback;
  const hasFeedback = displayFeedback.length > 0;

  const getTypeStyles = (type: string) => {
    switch (type) {
      case "success":
        return {
          bg: "bg-green-500/10",
          border: "border-green-500/20",
          text: "text-green-500",
          icon: ShieldCheck,
          shadow: "shadow-green-500/5",
        };
      case "warning":
        return {
          bg: "bg-amber-500/10",
          border: "border-amber-500/20",
          text: "text-amber-500",
          icon: AlertTriangle,
          shadow: "shadow-amber-500/5",
        };
      case "error":
        return {
          bg: "bg-red-500/10",
          border: "border-red-500/20",
          text: "text-red-500",
          icon: XCircle,
          shadow: "shadow-red-500/5",
        };
      default:
        return {
          bg: "bg-blue-500/10",
          border: "border-blue-500/20",
          text: "text-blue-500",
          icon: Sparkles,
          shadow: "shadow-blue-500/5",
        };
    }
  };

  return (
    <div className="h-full flex flex-col bg-transparent overflow-hidden">
      {/* Landing State or Current Analysis Result */}
      {!hasFeedback && !isAnalyzing ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />

          <div className="relative group perspective-1000 w-full max-w-md">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-[2.5rem] blur-xl opacity-50 block transition duration-1000" />

            <div className="relative bg-card/40 backdrop-blur-2xl border border-border/40 rounded-[2.5rem] p-8 sm:p-12 text-center shadow-2xl">
              <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center mx-auto mb-8 shadow-2xl rotate-3 group-hover:rotate-0 transition-transform duration-500">
                <Terminal size={48} className="text-white" />
              </div>

              <h2 className="text-2xl sm:text-3xl font-black mb-4 tracking-tight text-foreground">
                Code Inspector
              </h2>
              <p className="text-muted-foreground/80 font-medium mb-10 leading-relaxed text-sm sm:text-base">
                Beblocky AI will scan your code for bugs, logic errors, and best
                practices in realtime.
              </p>

              <Button
                onClick={onAnalyzeCode}
                className="w-full rounded-full h-14 font-black text-lg shadow-xl hover:scale-105 active:scale-95 transition-all shimmer flex items-center justify-center gap-3 border-0 text-white"
                style={{ backgroundColor: accentColor }}
              >
                <Zap size={20} fill="currentColor" />
                Analyze My Code
              </Button>
            </div>
          </div>

          {/* History shortcut if available */}
          {analysisHistory.length > 0 && (
            <div className="mt-12 animate-in fade-in slide-in-from-top-4 duration-1000">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 mb-4 text-center">
                Review Past Sessions
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {analysisHistory.slice(0, 3).map((analysis, i) => (
                  <button
                    key={i}
                    onClick={() => onSelectAnalysis(analysis)}
                    className="px-4 py-2 rounded-full border border-border/40 bg-card/30 backdrop-blur-sm hover:bg-muted/30 transition-all flex items-center gap-2"
                  >
                    <History size={14} className="text-primary" />
                    <span className="text-xs font-bold text-muted-foreground">
                      {new Date(analysis.analysisDate).toLocaleDateString()}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 bg-transparent">
          {/* Header Area */}
          <div className="p-4 sm:p-6 border-b border-border/40 flex items-center justify-between bg-card/20 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                <Terminal size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-black text-lg tracking-tight">
                  Lens Analysis
                </h3>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                    {isAnalyzing ? "Scanning Codebase..." : "Session Active"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onAnalyzeCode}
                disabled={isAnalyzing}
                className="rounded-full h-9 px-4 font-black text-xs border-border/40 bg-background/50 backdrop-blur-sm hover:scale-105 active:scale-95 transition-all"
              >
                <RotateCcw
                  size={14}
                  className={cn("mr-2", isAnalyzing && "animate-spin")}
                />
                Re-Run
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1 px-4 py-6 sm:px-6">
            <div className="max-w-4xl mx-auto space-y-6 pb-20">
              {isAnalyzing && displayFeedback.length === 0 ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="p-6 rounded-[2rem] bg-card/20 border border-border/10 animate-pulse"
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-muted/40" />
                        <div className="space-y-2 flex-1">
                          <div className="h-4 bg-muted/40 rounded-full w-1/3" />
                          <div className="h-3 bg-muted/20 rounded-full w-1/4" />
                        </div>
                      </div>
                      <div className="h-20 bg-muted/10 rounded-3xl" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {/* Results Grid */}
                  <div className="grid grid-cols-1 gap-4">
                    {displayFeedback.map((feedback, index) => {
                      const styles = getTypeStyles(feedback.type);
                      const Icon = styles.icon;

                      return (
                        <div
                          key={index}
                          className={cn(
                            "p-5 sm:p-6 rounded-[2rem] border transition-all duration-300 group hover:shadow-xl",
                            styles.bg,
                            styles.border,
                            styles.shadow,
                            "hover:-translate-y-1",
                          )}
                        >
                          <div className="flex items-start gap-4 mb-4">
                            <div
                              className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg transition-transform group-hover:rotate-12 duration-500",
                                "bg-background/90",
                                styles.text,
                              )}
                            >
                              <Icon size={24} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <Badge
                                  className={cn(
                                    "text-[10px] font-black uppercase tracking-[0.2em] rounded-full px-3",
                                    "bg-background/50 border-0",
                                    styles.text,
                                  )}
                                >
                                  {feedback.type}
                                </Badge>
                                {feedback.line && (
                                  <span className="text-[10px] font-bold text-muted-foreground/60">
                                    LINE {feedback.line}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm sm:text-base font-black text-foreground/90 leading-tight">
                                {feedback.message}
                              </p>
                            </div>
                          </div>

                          {feedback.code && (
                            <div className="mt-4 rounded-3xl bg-slate-950 p-4 font-mono text-xs overflow-x-auto border border-white/5 shadow-inner">
                              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/5">
                                <Code2 size={12} className="text-primary/60" />
                                <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
                                  Snippet
                                </span>
                              </div>
                              <code className="text-slate-300 block whitespace-pre">
                                {feedback.code}
                              </code>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary Footer */}
                  <div className="p-8 rounded-[2.5rem] bg-card/20 backdrop-blur-md border border-border/20 text-center">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                      <ShieldCheck size={32} className="text-green-500" />
                    </div>
                    <h4 className="text-xl font-black mb-2 tracking-tight">
                      Review Complete
                    </h4>
                    <p className="text-sm text-muted-foreground/80 leading-relaxed font-bold">
                      Beblocky AI successfully analyzed your code. Update your
                      elements and re-run for updated results.
                    </p>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Persistence Toggle Section (History View) */}
      {!isAnalyzing && analysisHistory.length > 0 && hasFeedback && (
        <div className="p-4 border-t border-border/20 bg-card/10">
          <TooltipProvider>
            <div className="flex items-center justify-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
                History
              </span>
              <div className="flex -space-x-2">
                {analysisHistory.slice(0, 5).map((history, i) => (
                  <Tooltip key={i}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => onSelectAnalysis(history)}
                        className={cn(
                          "w-8 h-8 rounded-full border-2 border-background flex items-center justify-center transition-all hover:-translate-y-1 hover:z-10",
                          currentAnalysis?._id === history._id
                            ? "bg-primary text-white"
                            : "bg-muted text-muted-foreground",
                        )}
                        style={{
                          backgroundColor:
                            currentAnalysis?._id === history._id
                              ? accentColor
                              : undefined,
                        }}
                      >
                        <History size={14} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs font-bold">
                        {new Date(history.analysisDate).toLocaleString()}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>
          </TooltipProvider>
        </div>
      )}
    </div>
  );
}
