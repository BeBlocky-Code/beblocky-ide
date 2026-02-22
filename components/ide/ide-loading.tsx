import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useTheme } from "./context/theme-provider";
import { cn } from "@/lib/utils";

export default function IdeLoadingSkeleton() {
  const { theme } = useTheme();
  const accentColorClass = theme === "dark" ? "bg-[#892FFF]/10" : "bg-[#FF932C]/10";

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background">
      {/* Header Skeleton */}
      <div className="h-16 w-full border-b flex items-center justify-between px-4 md:px-6 bg-background relative shadow-sm">
        <div className="flex items-center gap-4 flex-1">
          <Skeleton className="h-10 md:h-12 w-32 md:w-36 rounded-xl" /> {/* Logo */}
          <div className="h-8 md:h-10 w-px bg-border/40 hidden sm:block" />
          <Skeleton className="h-6 w-48 hidden lg:block rounded-full" /> {/* Course title */}
        </div>
        
        <div className="flex-none">
          <Skeleton className="h-9 w-32 md:w-48 rounded-full" /> {/* Mode Toggle */}
        </div>

        <div className="flex items-center gap-2 flex-1 justify-end">
          <div className="hidden md:flex items-center gap-2">
            <Skeleton className="h-8 w-16 md:w-20 rounded-full" /> {/* Coins */}
            <Skeleton className="h-8 w-16 md:w-20 rounded-full" /> {/* Streak */}
          </div>
          <div className="w-px h-6 bg-border/40 hidden md:block" />
          <div className="hidden md:block">
            <Skeleton className="h-9 w-9 rounded-full" /> {/* Theme Toggle */}
          </div>
          <Skeleton className="h-9 w-9 rounded-full" /> {/* Settings */}
          <Skeleton className="h-9 w-9 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600" /> {/* User menu */}
        </div>
      </div>

      {/* Main Workspace Skeleton */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row p-2 gap-2">
        {/* Slides Panel (40%) */}
        <div className="w-full md:w-[35%] h-full">
          <Card className="h-full border border-border/40 rounded-[2rem] shadow-sm overflow-hidden flex flex-col bg-card/30 backdrop-blur-sm">
            <CardHeader className="p-4 border-b border-border/40 bg-muted/20 flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full" /> {/* Menu button */}
                <Skeleton className="h-5 w-32 rounded-full" /> {/* Title */}
              </div>
              <Skeleton className="h-8 w-16 rounded-full" /> {/* Progress indicator */}
            </CardHeader>
            <CardContent className="p-6 space-y-6 flex-1 overflow-hidden">
              <div className="space-y-3">
                <Skeleton className="h-8 w-3/4 rounded-lg" /> {/* Slide title */}
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full rounded-md" />
                  <Skeleton className="h-4 w-5/6 rounded-md" />
                  <Skeleton className="h-4 w-4/5 rounded-md" />
                  <Skeleton className="h-4 w-full rounded-md" />
                </div>
              </div>
              
              <Skeleton className={cn("h-48 w-full rounded-3xl", accentColorClass)} /> {/* Image placeholder */}
              
              <div className="space-y-3">
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-4 w-4/5 rounded-md" />
              </div>

              <div className="mt-auto space-y-4">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-10 flex-1 rounded-full" /> {/* Back button */}
                  <Skeleton className="h-10 flex-[2] rounded-full" /> {/* Next button */}
                </div>
                <Skeleton className="h-2 w-full rounded-full" /> {/* Progress bar */}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Editor Panel (35%) */}
        <div className="hidden md:block md:w-[35%] h-full">
          <Card className="h-full border border-border/40 rounded-[2rem] shadow-sm overflow-hidden flex flex-col bg-card/30 backdrop-blur-sm">
            <CardHeader className="p-4 border-b border-border/40 bg-muted/20 flex-row items-center justify-between space-y-0">
              <Skeleton className="h-5 w-24 rounded-full" /> {/* Editor title */}
              <div className="flex gap-1.5 bg-background/50 p-1 rounded-full border border-border/40">
                <Skeleton className="h-7 w-12 rounded-full" />
                <Skeleton className="h-7 w-12 rounded-full" />
                <Skeleton className="h-7 w-12 rounded-full" />
              </div>
            </CardHeader>
            <CardContent className="p-4 flex-1 overflow-hidden font-mono">
              <div className="h-full space-y-3 p-2">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-4 w-6 rounded opacity-40" />
                    <Skeleton
                      className={cn(
                        "h-4 rounded-md",
                        i % 4 === 0 ? "w-[80%]" : i % 3 === 0 ? "w-[60%]" : i % 2 === 0 ? "w-[90%]" : "w-[40%]"
                      )}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel (30%) */}
        <div className="hidden md:block md:flex-1 h-full">
          <Card className="h-full border border-border/40 rounded-[2rem] shadow-sm overflow-hidden flex flex-col bg-card/30 backdrop-blur-sm">
            <CardHeader className="p-4 border-b border-border/40 bg-muted/20 flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <Skeleton className="w-2.5 h-2.5 rounded-full bg-red-400/30" />
                  <Skeleton className="w-2.5 h-2.5 rounded-full bg-amber-400/30" />
                  <Skeleton className="w-2.5 h-2.5 rounded-full bg-emerald-400/30" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <div className="flex gap-1.5">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </CardHeader>
            <CardContent className="p-6 flex-1 bg-background/40 m-2 rounded-2xl border border-border/20">
              <div className="space-y-6">
                <Skeleton className="h-10 w-2/3 rounded-xl" />
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full rounded-md" />
                  <Skeleton className="h-4 w-[90%] rounded-md" />
                  <Skeleton className="h-4 w-[80%] rounded-md" />
                </div>
                <Skeleton className="h-32 w-full rounded-2xl bg-muted/40" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mobile Footer/Console Toggle */}
      <div className="h-14 border-t border-border/40 bg-muted/10 backdrop-blur-md flex items-center px-4 justify-between gap-4 md:hidden">
        <Skeleton className="h-9 w-28 rounded-full" />
        <Skeleton className="h-9 w-28 rounded-full" />
      </div>
    </div>
  );
}
