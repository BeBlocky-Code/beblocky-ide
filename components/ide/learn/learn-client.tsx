"use client";

import { ThemeProvider } from "@/components/ide/context/theme-provider";
import { CoinProvider } from "@/components/ide/context/coin-context";
import { SettingsProvider } from "@/components/ide/context/settings-context";
import { AIProvider } from "@/components/ide/context/ai-context";
import { AuthProvider } from "@/components/context/auth-context";
import IdeLoadingSkeleton from "@/components/ide/ide-loading";
import LearnIde from "@/components/ide/learn/learn-ide";
import { LearnError } from "@/components/ide/learn/learn-error";
import { useLearnData } from "@/app/courses/[courseId]/learn/_hooks/use-learn-data";

/** Providers plus the skeleton → error → IDE gate. */
export default function LearnClient({
  encryptedCourseId,
  courseId,
}: {
  encryptedCourseId: string;
  courseId: string;
}) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <CoinProvider>
          <SettingsProvider>
            <AIProvider>
              <LearnGate
                encryptedCourseId={encryptedCourseId}
                courseId={courseId}
              />
            </AIProvider>
          </SettingsProvider>
        </CoinProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

function LearnGate({
  encryptedCourseId,
  courseId,
}: {
  encryptedCourseId: string;
  courseId: string;
}) {
  const data = useLearnData(encryptedCourseId, courseId);

  // Skeleton until the shell can paint with real data (no empty-editor flash)
  if (data.isLoading) return <IdeLoadingSkeleton />;
  if (data.errorMessage) return <LearnError message={data.errorMessage} />;
  if (!data.ready || !data.course || !data.userData) return <IdeLoadingSkeleton />;

  return (
    <LearnIde
      key={courseId}
      courseId={courseId}
      snapshot={{
        course: data.course,
        userData: data.userData,
        studentId: data.resolvedStudentId,
        progress: data.progress,
      }}
    />
  );
}
