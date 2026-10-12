"use client";

import { useRef, useState } from "react";
import IdeWorkspace from "@/components/ide/ide-workspace";
import type { IdeConsoleHandle } from "@/components/ide/ide-console";
import IdeKeyboardShortcuts from "@/components/ide/ide-keyboard-shortcuts";
import IdeHeader from "@/components/ide/ide-header";
import IdeSettingsPanel from "@/components/ide/ide-settings-panel";
import type { ILesson } from "@/types";
import {
  normalizeCourseLanguage,
  resolveInitialPosition,
} from "@/lib/learn/slides";
import { useCodeState } from "@/app/courses/[courseId]/learn/_hooks/use-code-state";
import type { LearnUserData } from "@/app/courses/[courseId]/learn/_hooks/use-learn-data";
import { useLearnProgress } from "@/app/courses/[courseId]/learn/_hooks/use-learn-progress";
import { useLayoutMode } from "@/app/courses/[courseId]/learn/_hooks/use-layout-mode";
import { useLessonNavigation } from "@/app/courses/[courseId]/learn/_hooks/use-lesson-navigation";
import { useTimeTracking } from "@/app/courses/[courseId]/learn/_hooks/use-time-tracking";
import type { IStudentProgress } from "@/types/progress";

export interface LearnIdeSnapshot {
  course: {
    courseTitle?: string;
    lessons?: unknown;
  };
  userData: LearnUserData;
  studentId: string | null;
  progress: IStudentProgress | undefined;
}

/**
 * The IDE shell. Mounted only once course, user and progress are loaded, so
 * its initial state is computed from the snapshot instead of synced by effects.
 */
export default function LearnIde({
  courseId,
  snapshot,
}: {
  courseId: string;
  snapshot: LearnIdeSnapshot;
}) {
  // Frozen at mount: later refetches must not reset the learner's place
  const [{ course, userData, studentId, progress: initialProgress }] =
    useState(snapshot);
  const [lessons] = useState(() => (course.lessons as ILesson[]) || []);
  const [courseLanguage] = useState(() => normalizeCourseLanguage(course));
  const [start] = useState(() => resolveInitialPosition(lessons, initialProgress));

  const consoleRef = useRef<IdeConsoleHandle>(null);
  const layout = useLayoutMode();

  const [currentLessonId, setCurrentLessonId] = useState(start.lessonId);

  const { userProgress, ensureProgressId, invalidateProgress, completeSlide } =
    useLearnProgress({
      studentId,
      courseId,
      currentLessonId: currentLessonId,
      userData,
    });
  const timeSpent = useTimeTracking(
    userProgress ?? initialProgress ?? null,
    studentId,
    courseId,
  );
  const code = useCodeState({
    initialCode: start.code,
    courseId,
    currentLessonId,
    studentId,
    ensureProgressId,
    invalidateProgress,
  });
  const nav = useLessonNavigation({
    lessons,
    currentLessonId,
    setCurrentLessonId,
    initialSlideIndex: start.slideIndex,
    userData,
    timeSpent,
    resetCode: code.resetCode,
    ensureProgressId,
    invalidateProgress,
    completeSlide,
  });

  return (
    <>
      <div className="flex flex-col h-screen w-screen overflow-hidden">
        <IdeHeader
          courseTitle={course.courseTitle ?? ""}
          userData={userData}
          studentId={studentId || undefined}
          onSettingsClick={() => layout.setIsSettingsOpen(true)}
          ideMode={layout.ideMode}
          onModeChange={layout.setIdeMode}
          onSaveCode={code.handleSaveCode}
          mainCode={code.mainCode}
          courseLanguage={courseLanguage}
        />
        <div className="flex-1 overflow-hidden relative">
          <IdeWorkspace
            slides={nav.currentSlides}
            courseId={courseId}
            courseLanguage={courseLanguage}
            mainCode={code.mainCode}
            setMainCode={code.setMainCode}
            lessons={lessons}
            currentLessonId={currentLessonId}
            onSelectLesson={nav.handleSelectLesson}
            currentLayout={layout.currentLayout}
            initialSlideIndex={nav.currentSlideIndex}
            onSlideChange={nav.handleSlideChange}
            studentId={studentId || "guest"}
            ideMode={layout.ideMode}
            onIdeModeChange={layout.setIdeMode}
            consoleRef={consoleRef}
          />
        </div>
        <IdeKeyboardShortcuts
          onRunCode={() => consoleRef.current?.run()}
          onSaveCode={code.handleSaveCode}
          onFormatCode={() => {
            // TODO: Implement code formatting
          }}
        />
      </div>
      <IdeSettingsPanel
        isOpen={layout.isSettingsOpen}
        onClose={() => layout.setIsSettingsOpen(false)}
        currentLayout={layout.currentLayout}
        onChangeLayout={layout.handleLayoutChange}
      />
    </>
  );
}
