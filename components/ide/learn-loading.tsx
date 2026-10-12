"use client";

import { ThemeProvider } from "@/components/ide/context/theme-provider";
import IdeLoadingSkeleton from "@/components/ide/ide-loading";

export function LearnLoading() {
  return (
    <ThemeProvider>
      <IdeLoadingSkeleton />
    </ThemeProvider>
  );
}
