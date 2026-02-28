/**
 * Query key factory for TanStack Query.
 * Use these keys everywhere so invalidation is consistent.
 */

export const queryKeys = {
  courses: {
    all: ["courses"] as const,
    detail: (courseId: string) => ["courses", "detail", courseId] as const,
    withContent: (courseId: string) =>
      ["courses", "withContent", courseId] as const,
  },
  users: {
    all: ["users"] as const,
    byEmail: (email: string) => ["users", "byEmail", email] as const,
  },
  students: {
    all: ["students"] as const,
    byEmail: (email: string) => ["students", "byEmail", email] as const,
    byUserId: (userId: string) => ["students", "byUserId", userId] as const,
  },
  progress: {
    all: ["progress"] as const,
    byStudent: (studentId: string) =>
      ["progress", "byStudent", studentId] as const,
    byStudentAndCourse: (studentId: string, courseId: string) =>
      ["progress", "byStudentAndCourse", studentId, courseId] as const,
  },
  ai: {
    conversations: (studentId: string) =>
      ["ai", "conversations", studentId] as const,
    analysisHistory: (studentId: string) =>
      ["ai", "analysisHistory", studentId] as const,
  },
} as const;
