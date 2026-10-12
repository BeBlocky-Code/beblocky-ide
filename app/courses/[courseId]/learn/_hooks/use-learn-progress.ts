"use client";

import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { progressApi } from "@/lib/api/progress";
import { studentApi } from "@/lib/api/student";
import { queryKeys } from "@/lib/query-keys";
import type { IStudentProgress } from "@/types/progress";
import { useProgressQuery, type LearnUserData } from "./use-learn-data";

/** Progress record lifecycle: bootstrap, ensure, cache seeding, activity ping. */
export function useLearnProgress(opts: {
  studentId: string | null;
  courseId: string;
  currentLessonId: string;
  userData: LearnUserData;
}) {
  const { studentId, courseId, currentLessonId, userData } = opts;
  const queryClient = useQueryClient();
  const progressQuery = useProgressQuery(studentId, courseId);
  // Mutations seed the query cache, so the query is the single source of truth
  const userProgress = (progressQuery.data as IStudentProgress | undefined) ?? null;

  const progressKey = () =>
    studentId && courseId
      ? queryKeys.progress.byStudentAndCourse(studentId, courseId)
      : null;

  const invalidateProgress = () => {
    const queryKey = progressKey();
    if (queryKey) queryClient.invalidateQueries({ queryKey });
  };

  const seedProgressCache = (updated: IStudentProgress) => {
    const queryKey = progressKey();
    if (queryKey) queryClient.setQueryData(queryKey, updated);
  };

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof progressApi.create>[0]) =>
      progressApi.create(data),
    onSuccess: (created) => seedProgressCache(created as unknown as IStudentProgress),
  });

  const completeSlideMutation = useMutation({
    mutationFn: (args: {
      id: string;
      data: { slideId: string; lessonId: string; timeSpent?: number };
    }) => progressApi.completeSlide(args.id, args.data),
    onSuccess: (updated) => seedProgressCache(updated as unknown as IStudentProgress),
  });

  /** Ensure a Nest progress doc exists; returns its _id or null. */
  const ensureProgressId = async (lessonId?: string): Promise<string | null> => {
    if (!studentId || studentId === "guest") return null;

    const existingId = userProgress?._id?.toString();
    if (existingId) return existingId;

    try {
      const created = await createMutation.mutateAsync({
        studentId,
        courseId,
        currentLesson: lessonId || currentLessonId || undefined,
      });
      return created?._id?.toString() ?? null;
    } catch {
      // Race: another request may have created it
      try {
        const existing = await progressApi.getByStudentAndCourse(
          studentId,
          courseId,
        );
        seedProgressCache(existing as IStudentProgress);
        return existing?._id?.toString() ?? null;
      } catch {
        return null;
      }
    }
  };

  // Bootstrap progress when the student has none for this course
  useEffect(() => {
    if (
      !studentId ||
      !courseId ||
      !currentLessonId ||
      userProgress?._id ||
      createMutation.isPending ||
      !progressQuery.isError
    )
      return;

    createMutation.mutate({ studentId, courseId, currentLesson: currentLessonId });
  }, [
    studentId,
    courseId,
    currentLessonId,
    userProgress?._id,
    progressQuery.isError,
    progressQuery.data,
  ]);

  // Update student activity on load (fire-and-forget)
  useEffect(() => {
    if (userData.id === "guest" || !studentId) return;
    studentApi
      .updateActivity(studentId, {
        lastCodingActivity: new Date().toISOString(),
      })
      .catch(() => {});
  }, [userData.id, studentId]);

  return {
    userProgress,
    ensureProgressId,
    invalidateProgress,
    completeSlide: completeSlideMutation.mutate,
  };
}
