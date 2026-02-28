import { IProgress, IStudentProgress } from "@/types/progress";
import { ApiError, apiCallWithAuth } from "@/lib/api/utils";

async function progressApiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    return await apiCallWithAuth<T>(endpoint, options);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // For development, return mock data if API is not available
    if (process.env.NODE_ENV === "development") {
      return getMockResponse(endpoint, options.method) as T;
    }
    throw new ApiError(
      0,
      `Network error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// Mock responses for development when backend is not available
function getMockResponse(endpoint: string, method?: string): any {
  if (method === "POST" && endpoint === "/progress") {
    return {
      _id: "mock-progress-id",
      studentId: "mock-student-id",
      courseId: "mock-course-id",
      completedLessons: {},
      completionPercentage: 0,
      timeSpent: {},
      coinsEarned: 0,
      lessonCode: {},
      currentLesson: "mock-lesson-id",
      startedAt: new Date().toISOString(),
      isActive: true,
      lastCalculatedAt: new Date().toISOString(),
    };
  }

  if (endpoint.includes("/save-code") && method === "PATCH") {
    return {
      _id: "mock-progress-id",
      studentId: "mock-student-id",
      courseId: "mock-course-id",
      lessonCode: {
        "mock-lesson-id": {
          language: "javascript",
          code: 'console.log("Mock saved code");',
          timestamp: new Date().toISOString(),
        },
      },
    };
  }

  return {};
}

// Progress API calls (session-based: credentials + Bearer token)
export const progressApi = {
  create: (data: {
    studentId: string;
    courseId: string;
    currentLesson?: string;
    lessonId?: string;
    slideId?: string;
    code?: string;
    timeSpent?: number;
    completed?: boolean;
  }) =>
    progressApiCall<IProgress>("/progress", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getAll: () => progressApiCall<IProgress[]>("/progress"),

  getById: (id: string) => progressApiCall<IProgress>(`/progress/${id}`),

  getByStudent: (studentId: string) =>
    progressApiCall<IProgress[]>(`/progress/student/${studentId}`),

  getByCourse: (courseId: string) =>
    progressApiCall<IProgress[]>(`/progress/course/${courseId}`),

  getByStudentAndCourse: (studentId: string, courseId: string) =>
    progressApiCall<IStudentProgress>(`/progress/${studentId}/${courseId}`),

  getCompletionPercentage: (studentId: string, courseId: string) =>
    progressApiCall<{
      percentage: number;
      completedLessons: number;
      totalLessons: number;
    }>(`/progress/${studentId}/${courseId}/percentage`),

  update: (id: string, data: Record<string, unknown>) =>
    progressApiCall<IProgress>(`/progress/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  completeLesson: (
    id: string,
    data: {
      lessonId: string;
      timeSpent: number;
    }
  ) =>
    progressApiCall<IProgress>(`/progress/${id}/complete-lesson`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  saveCode: (
    id: string,
    data: {
      lessonId: string;
      language: string;
      code: string;
    }
  ) =>
    progressApiCall<IProgress>(`/progress/${id}/save-code`, {
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
    }
  ) =>
    progressApiCall<IProgress>(`/progress/${id}/time-spent`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    progressApiCall<void>(`/progress/${id}`, {
      method: "DELETE",
    }),
};
