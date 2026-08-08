import { ICodeAnalysis } from "@/types/ai";
import { apiCall } from "./utils";

export const codeAnalysisApi = {
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
    }),

  getById: (id: string) => apiCall<ICodeAnalysis>(`/code-analysis/${id}`),

  getByProgress: (progressId: string) =>
    apiCall<ICodeAnalysis[]>(`/code-analysis/progress/${progressId}`),

  getByStudent: (studentId: string) =>
    apiCall<ICodeAnalysis[]>(
      `/code-analysis/student/${encodeURIComponent(studentId)}`,
    ),

  getByLesson: (lessonId: string) =>
    apiCall<ICodeAnalysis[]>(`/code-analysis/lesson/${lessonId}`),

  getStudentStats: (studentId: string) =>
    apiCall<{
      totalAnalyses: number;
      averagePoints: number;
      totalPoints: number;
      feedbackBreakdown: Record<string, number>;
    }>(`/code-analysis/student/${encodeURIComponent(studentId)}/stats`),

  delete: (id: string) =>
    apiCall<void>(`/code-analysis/${id}`, {
      method: "DELETE",
    }),
};
