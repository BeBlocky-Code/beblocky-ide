import {
  ICompletionPercentageResponse,
  IProgress,
  IStudentProgress,
} from "@/types/progress";
import { apiCall } from "./utils";

export const progressApi = {
  create: (data: {
    studentId: string;
    courseId: string;
    currentLesson?: string;
  }) =>
    apiCall<IProgress>("/progress", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getAll: () => apiCall<IProgress[]>("/progress"),

  getById: (id: string) => apiCall<IProgress>(`/progress/${id}`),

  getByStudent: (studentId: string) =>
    apiCall<IProgress[]>(`/progress/student/${studentId}`),

  getByCourse: (courseId: string) =>
    apiCall<IProgress[]>(`/progress/course/${courseId}`),

  getByStudentAndCourse: (studentId: string, courseId: string) =>
    apiCall<IStudentProgress>(`/progress/${studentId}/${courseId}`),

  getCompletionPercentage: (studentId: string, courseId: string) =>
    apiCall<ICompletionPercentageResponse>(
      `/progress/${studentId}/${courseId}/percentage`,
    ),

  update: (id: string, data: Record<string, unknown>) =>
    apiCall<IProgress>(`/progress/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  completeLesson: (
    id: string,
    data: {
      lessonId: string;
      timeSpent: number;
    },
  ) =>
    apiCall<IProgress>(`/progress/${id}/complete-lesson`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  completeSlide: (
    id: string,
    data: {
      slideId: string;
      lessonId: string;
      timeSpent?: number;
    },
  ) =>
    apiCall<IProgress>(`/progress/${id}/complete-slide`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  saveCode: (
    id: string,
    data: {
      lessonId: string;
      language: string;
      code: string;
    },
  ) =>
    apiCall<IProgress>(`/progress/${id}/save-code`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  updateTimeSpent: (
    id: string,
    data: {
      minutes?: number;
      slideId?: string;
      timeSpent?: number;
      lastAccessed?: string;
    },
  ) =>
    apiCall<IProgress>(`/progress/${id}/time-spent`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiCall<void>(`/progress/${id}`, {
      method: "DELETE",
    }),
};
