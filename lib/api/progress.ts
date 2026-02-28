import { IProgress, IStudentProgress } from "@/types/progress";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://api.beblocky.com";

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new ApiError(
        response.status,
        `API call failed: ${response.statusText}`
      );
    }

    return response.json();
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

// Progress API calls
export const progressApi = {
  // Create new progress record for student-course pair
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
    apiCall<IProgress>("/progress", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Get all progress records
  getAll: () => apiCall<IProgress[]>("/progress"),

  // Get progress record by ID
  getById: (id: string) => apiCall<IProgress>(`/progress/${id}`),

  // Get all progress records for a student
  getByStudent: (studentId: string) =>
    apiCall<IProgress[]>(`/progress/student/${studentId}`),

  // Get all progress records for a course
  getByCourse: (courseId: string) =>
    apiCall<IProgress[]>(`/progress/course/${courseId}`),

  // Get progress record for specific student and course
  getByStudentAndCourse: (studentId: string, courseId: string) =>
    apiCall<IStudentProgress>(`/progress/${studentId}/${courseId}`),

  // Get completion percentage for student and course
  getCompletionPercentage: (studentId: string, courseId: string) =>
    apiCall<{
      percentage: number;
      completedLessons: number;
      totalLessons: number;
    }>(`/progress/${studentId}/${courseId}/percentage`),

  // Update progress record
  update: (id: string, data: Record<string, unknown>) =>
    apiCall<IProgress>(`/progress/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  // Complete a lesson and update progress
  completeLesson: (
    id: string,
    data: {
      lessonId: string;
      timeSpent: number;
    }
  ) =>
    apiCall<IProgress>(`/progress/${id}/complete-lesson`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  // Save code for a lesson
  saveCode: (
    id: string,
    data: {
      lessonId: string;
      language: string;
      code: string;
    }
  ) =>
    apiCall<IProgress>(`/progress/${id}/save-code`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  // Update time spent for current week
  updateTimeSpent: (
    id: string,
    data: {
      minutes?: number;
      slideId?: string;
      timeSpent?: number;
      lastAccessed?: string;
    }
  ) =>
    apiCall<IProgress>(`/progress/${id}/time-spent`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  // Delete progress record
  delete: (id: string) =>
    apiCall<void>(`/progress/${id}`, {
      method: "DELETE",
    }),
};
