"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCourseWithContent } from "@/lib/api";
import { progressApi } from "@/lib/api/progress";
import { studentApi } from "@/lib/api/student";
import { ApiError } from "@/lib/api/utils";
import { queryKeys } from "@/lib/query-keys";
import { useSession } from "@/lib/use-session";
import {
  idePageError,
  primaryUserRole,
  shouldFetchStudentProfile,
} from "@/lib/ide-access";
import { generateInitials } from "@/lib/utils";
import type { IStudentProgress } from "@/types/progress";
import type { UserRole } from "@/types/user";

export interface LearnUserData {
  _id: string;
  id: string;
  name: string;
  email: string;
  initials: string;
  role: UserRole;
  progress: Record<string, unknown>;
  preferences: Record<string, unknown>;
  emailVerified: boolean;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

export function useProgressQuery(
  studentId: string | null,
  courseId: string,
) {
  return useQuery({
    queryKey: queryKeys.progress.byStudentAndCourse(studentId ?? "", courseId),
    queryFn: () => progressApi.getByStudentAndCourse(studentId!, courseId),
    enabled: !!studentId && !!courseId,
    staleTime: 5 * 60 * 1000,
  });
}

/** Session, course, student and progress queries plus the derived page status. */
export function useLearnData(encryptedCourseId: string, realCourseId: string) {
  const { data: session, isPending: isSessionPending } = useSession();

  const courseQuery = useQuery({
    queryKey: queryKeys.courses.withContent(realCourseId),
    queryFn: () => getCourseWithContent(realCourseId),
    enabled: !!realCourseId,
    staleTime: 5 * 60 * 1000,
  });
  const shouldFetchStudent = shouldFetchStudentProfile({
    userId: session?.user?.id,
    roles: session?.user?.roles,
  });
  const studentQuery = useQuery({
    queryKey: queryKeys.students.byUserId(session?.user?.id ?? ""),
    queryFn: () => studentApi.getByUserId(session!.user!.id),
    enabled: shouldFetchStudent,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 404) return false;
      return failureCount < 2;
    },
  });
  const resolvedStudentId = studentQuery.data?._id?.toString() ?? null;
  const progressQuery = useProgressQuery(resolvedStudentId, realCourseId);

  const user = session?.user;
  const userData = useMemo<LearnUserData | null>(() => {
    if (!user) return null;
    return {
      _id: resolvedStudentId || user.id,
      id: resolvedStudentId || user.id,
      name: user.name ?? "",
      email: user.email ?? "",
      initials: generateInitials(user.name ?? user.email ?? "", user.email),
      role: primaryUserRole(user.roles) as UserRole,
      progress: {},
      preferences: {},
      emailVerified: true,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    };
  }, [user, resolvedStudentId]);

  const isLoading =
    isSessionPending ||
    (courseQuery.isLoading && !!realCourseId) ||
    (shouldFetchStudent && studentQuery.isLoading);
  const errorMessage = idePageError({
    invalidCourseId: !!encryptedCourseId && !realCourseId,
    signedOut: !isSessionPending && !session?.user,
    courseFailed: courseQuery.isError,
  });
  const progressSettled =
    !resolvedStudentId || progressQuery.isSuccess || progressQuery.isError;
  const course = courseQuery.data;
  const ready = !!course && userData != null && progressSettled;

  return {
    isLoading,
    errorMessage,
    ready,
    course,
    userData,
    resolvedStudentId,
    progress: progressQuery.data as IStudentProgress | undefined,
  };
}
