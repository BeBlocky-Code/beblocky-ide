"use client";

import { useMemo, useState } from "react";
import { progressApi } from "@/lib/api/progress";
import { slidesForLesson } from "@/lib/learn/slides";
import type { ILesson } from "@/types";
import { UserRole } from "@/types/user";
import type { LearnUserData } from "./use-learn-data";

/** Lesson/slide position; slides are derived from the lesson id. */
export function useLessonNavigation(opts: {
  lessons: ILesson[];
  currentLessonId: string;
  setCurrentLessonId: (lessonId: string) => void;
  initialSlideIndex: number;
  userData: LearnUserData;
  timeSpent: number;
  resetCode: (code: string) => void;
  ensureProgressId: (lessonId?: string) => Promise<string | null>;
  invalidateProgress: () => void;
  completeSlide: (args: {
    id: string;
    data: { slideId: string; lessonId: string; timeSpent?: number };
  }) => void;
}) {
  const { lessons, userData, timeSpent, currentLessonId, setCurrentLessonId } =
    opts;
  const [currentSlideIndex, setCurrentSlideIndex] = useState(
    opts.initialSlideIndex,
  );
  const currentSlides = useMemo(
    () => slidesForLesson(lessons, currentLessonId),
    [lessons, currentLessonId],
  );
  const tracksProgress =
    userData.id !== "guest" && userData.role === UserRole.STUDENT;

  // Advancing/finishing marks the left (or current) slide complete
  const handleSlideChange = async (slideIndex: number) => {
    const previousIndex = currentSlideIndex;
    setCurrentSlideIndex(slideIndex);

    const isAdvancing = slideIndex > previousIndex;
    const isFinishingLast =
      slideIndex === previousIndex &&
      slideIndex === currentSlides.length - 1 &&
      currentSlides.length > 0;

    if (!isAdvancing && !isFinishingLast) return;
    if (!tracksProgress || !currentLessonId) return;

    const slideToComplete = isFinishingLast
      ? currentSlides[slideIndex]
      : currentSlides[previousIndex];
    const slideId = slideToComplete?._id?.toString();
    if (!slideId) return;

    const progressId = await opts.ensureProgressId(currentLessonId);
    if (!progressId) return;

    opts.completeSlide({
      id: progressId,
      data: {
        slideId,
        lessonId: currentLessonId,
        timeSpent: Math.floor(timeSpent / 60) || 0,
      },
    });
  };

  const handleSelectLesson = async (lessonId: string) => {
    setCurrentLessonId(lessonId);

    const selected = lessons.find((l) => l._id?.toString() === lessonId);
    if (!selected) return;

    const slides = slidesForLesson(lessons, lessonId);
    setCurrentSlideIndex(0);
    opts.resetCode(slides[0]?.startingCode || "");

    if (tracksProgress) {
      const progressId = await opts.ensureProgressId(lessonId);
      if (progressId) {
        progressApi
          .update(progressId, { currentLesson: lessonId })
          .then(() => opts.invalidateProgress())
          .catch(() => {});
      }
    }
  };

  return {
    currentLessonId,
    currentSlideIndex,
    currentSlides,
    handleSlideChange,
    handleSelectLesson,
  };
}
