"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { progressApi } from "@/lib/api/progress";
import { queryKeys } from "@/lib/query-keys";
import type { IStudentProgress } from "@/types/progress";

const TICK_MS = 60000;
const DISPLAY_EVERY_MINUTES = 5;
const SYNC_EVERY_MINUTES = 60;

function progressSeconds(progress: IStudentProgress | null): number {
  const minutes = Number(progress?.timeSpent);
  return progress?.timeSpent != null && Number.isFinite(minutes)
    ? minutes * 60
    : 0;
}

/**
 * Counts minutes in a ref (no re-render per tick), exposes `timeSpent` in
 * seconds, and writes to the API every 60 minutes.
 */
export function useTimeTracking(
  progress: IStudentProgress | null,
  studentId: string | null,
  courseId: string,
) {
  const queryClient = useQueryClient();
  const [timeSpent, setTimeSpent] = useState(() => progressSeconds(progress));
  const minutesRef = useRef(progressSeconds(progress) / 60);
  const progressRef = useRef(progress);
  const studentIdRef = useRef(studentId);
  const courseIdRef = useRef(courseId);

  useEffect(() => {
    progressRef.current = progress;
    studentIdRef.current = studentId;
    courseIdRef.current = courseId;
  });

  // Resync the counter whenever stored progress reports a new total
  useEffect(() => {
    if (progress?.timeSpent != null) {
      const minutes = Number(progress.timeSpent);
      if (Number.isFinite(minutes)) minutesRef.current = minutes;
    }
  }, [progress?.timeSpent]);

  useEffect(() => {
    const interval = setInterval(() => {
      const isVisible = document.visibilityState === "visible";
      minutesRef.current += 1;
      const minutes = minutesRef.current;
      const current = progressRef.current;

      if (current?._id && minutes % SYNC_EVERY_MINUTES === 0) {
        progressApi
          .updateTimeSpent(current._id, {
            minutes: 1,
            lastAccessed: new Date().toISOString(),
          })
          .then(() => {
            if (studentIdRef.current && courseIdRef.current) {
              queryClient.invalidateQueries({
                queryKey: queryKeys.progress.byStudentAndCourse(
                  studentIdRef.current,
                  courseIdRef.current,
                ),
              });
            }
          })
          .catch(() => {});
      }

      if (isVisible && minutes % DISPLAY_EVERY_MINUTES === 0) {
        setTimeSpent(minutes * 60);
      }
    }, TICK_MS);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        setTimeSpent(minutesRef.current * 60);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [queryClient]);

  return timeSpent;
}
