"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { progressApi } from "@/lib/api/progress";
import { detectLanguage } from "@/lib/learn/detect-language";

/** Editor code, "last saved" tracking, unsaved-changes warning and Save Code. */
export function useCodeState(opts: {
  initialCode: string;
  courseId: string;
  currentLessonId: string;
  studentId: string | null;
  ensureProgressId: (lessonId?: string) => Promise<string | null>;
  invalidateProgress: () => void;
}) {
  const {
    courseId,
    currentLessonId,
    studentId,
    ensureProgressId,
    invalidateProgress,
  } = opts;
  const { toast } = useToast();
  const [mainCode, setMainCodeState] = useState(opts.initialCode);
  const [lastSavedCode, setLastSavedCode] = useState(opts.initialCode);

  // Edits count as saved when there is no baseline yet, or when they match
  // what is in localStorage (the "Load My Code" case).
  const setMainCode = useCallback(
    (code: string) => {
      setMainCodeState(code);
      setLastSavedCode((previous) => {
        if (!code) return previous;
        if (!previous) return code;
        const local = currentLessonId
          ? localStorage.getItem(`code-${courseId}-${currentLessonId}`)
          : null;
        return local && code === local ? code : previous;
      });
    },
    [courseId, currentLessonId],
  );

  /** Replace the editor contents and treat them as saved (lesson switch). */
  const resetCode = (code: string) => {
    setMainCodeState(code);
    setLastSavedCode(code);
  };

  // Save Code persists code only — does not mark lessons/slides complete
  const handleSaveCode = async (): Promise<void> => {
    localStorage.setItem(`code-${courseId}-${currentLessonId}`, mainCode);

    try {
      if (!studentId) throw new Error("Student ID not found");

      const progressId = await ensureProgressId(currentLessonId);
      if (!progressId || !currentLessonId) {
        throw new Error("Failed to get or create progress record");
      }

      const detectedLanguage = detectLanguage(mainCode);
      await progressApi.saveCode(progressId, {
        lessonId: currentLessonId,
        language: detectedLanguage,
        code: mainCode,
      });

      toast({
        title: "Code Saved",
        description: `Your ${detectedLanguage} code has been saved.`,
      });
      invalidateProgress();
    } catch {
      toast({
        title: "Save Sync Failed",
        description:
          "Your code was saved locally, but couldn't sync with the server. Please check your connection.",
        variant: "destructive",
      });
    }

    setLastSavedCode(mainCode);
  };

  // Warn user before closing tab
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasUnsavedChanges =
        mainCode !== lastSavedCode && mainCode.trim() !== "";
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = ""; // Required for Chrome
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [mainCode, lastSavedCode]);

  return { mainCode, setMainCode, resetCode, handleSaveCode };
}
