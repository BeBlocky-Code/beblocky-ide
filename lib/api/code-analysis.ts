import { ICodeAnalysis, ICodeFeedback } from "@/types/ai";

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

// Generate mock analysis response
function getMockAnalysis(data: {
  progressId: string;
  lessonId: string;
  codeContent: string;
  language: string;
}): ICodeAnalysis {
  return {
    _id: "mock-analysis-id",
    progressId: data.progressId,
    lessonId: data.lessonId,
    studentId: "mock-student-id",
    courseId: "mock-course-id",
    codeContent: data.codeContent,
    language: data.language,
    feedback: [
      {
        type: "success",
        message: "Great use of functional programming with return statement!",
        points: 15,
      },
      {
        type: "warning",
        message: "Consider adding error handling for edge cases",
        line: 1,
        code: "function test() {",
        suggestion: "Add a try-catch block for better error handling",
        points: -2,
      },
      {
        type: "info",
        message: "Your function follows good naming conventions",
        points: 3,
      },
    ],
    totalPoints: 16,
    analysisDate: new Date().toISOString(),
    isCompleted: true,
  };
}

// Mock responses for development when backend is not available
function getMockResponse(endpoint: string, method?: string): any {
  if (method === "POST" && endpoint === "/code-analysis") {
    return {
      _id: "mock-analysis-id",
      progressId: "mock-progress-id",
      lessonId: "mock-lesson-id",
      studentId: "mock-student-id",
      courseId: "mock-course-id",
      codeContent: 'function test() { return "hello"; }',
      language: "javascript",
      feedback: [
        {
          type: "success",
          message: "Great use of functional programming with return statement!",
          points: 15,
        },
        {
          type: "warning",
          message: "Consider adding error handling for edge cases",
          line: 1,
          code: "function test() {",
          suggestion: "Add a try-catch block for better error handling",
          points: -2,
        },
        {
          type: "info",
          message: "Your function follows good naming conventions",
          points: 3,
        },
      ],
      totalPoints: 16,
      analysisDate: new Date().toISOString(),
      isCompleted: true,
    };
  }

  if (endpoint.includes("/stats")) {
    return {
      totalAnalyses: 5,
      averagePoints: 12.4,
      totalPoints: 62,
      feedbackBreakdown: {
        success: 8,
        warning: 3,
        error: 1,
        info: 5,
      },
    };
  }

  if (
    endpoint.includes("/progress/") ||
    endpoint.includes("/student/") ||
    endpoint.includes("/lesson/")
  ) {
    return [
      {
        _id: "mock-analysis-id",
        codeContent: 'function test() { return "hello"; }',
        language: "javascript",
        totalPoints: 16,
        analysisDate: new Date().toISOString(),
        feedback: [
          {
            type: "success",
            message: "Great use of functional programming!",
            points: 15,
          },
        ],
      },
    ];
  }

  return {};
}

// Code Analysis API calls
export const codeAnalysisApi = {
  // Analyze code
  analyze: (data: {
    progressId: string;
    lessonId: string;
    codeContent: string;
    language: string;
    customInstructions?: string;
  }) =>
    apiCall<ICodeAnalysis>("/code-analysis", {
      method: "POST",
      body: JSON.stringify(data),
    }).catch((error) => {
      // If API fails, return mock analysis instead of throwing
      return getMockAnalysis(data);
    }),

  // Get analysis by ID
  getById: (id: string) => apiCall<ICodeAnalysis>(`/code-analysis/${id}`),

  // Get analyses for a progress record
  getByProgress: (progressId: string) =>
    apiCall<ICodeAnalysis[]>(`/code-analysis/progress/${progressId}`),

  // Get analyses for a student
  getByStudent: (studentId: string) =>
    apiCall<ICodeAnalysis[]>(
      `/code-analysis/student/${encodeURIComponent(studentId)}`
    ).catch((error) => {
      // If API fails, return empty array instead of throwing
      return [];
    }),

  // Get analyses for a lesson
  getByLesson: (lessonId: string) =>
    apiCall<ICodeAnalysis[]>(`/code-analysis/lesson/${lessonId}`),

  // Get student statistics
  getStudentStats: (studentId: string) =>
    apiCall<{
      totalAnalyses: number;
      averagePoints: number;
      totalPoints: number;
      feedbackBreakdown: Record<string, number>;
    }>(`/code-analysis/student/${encodeURIComponent(studentId)}/stats`),

  // Delete analysis
  delete: (id: string) =>
    apiCall<void>(`/code-analysis/${id}`, {
      method: "DELETE",
    }),
};
