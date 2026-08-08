import { ICourse, ILesson, ISlide } from "@/types";
import { IProgress, IStudentProgress } from "@/types/progress";
import { IUser } from "@/types/user";
import { apiCall } from "./api/utils";

// Course API calls
export const courseApi = {
  getAll: () => apiCall<ICourse[]>("/courses"),
  getById: (id: string) => apiCall<ICourse>(`/courses/${id}`),
  create: (data: Record<string, unknown>) =>
    apiCall<ICourse>("/courses", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Record<string, unknown>) =>
    apiCall<ICourse>(`/courses/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    apiCall<void>(`/courses/${id}`, {
      method: "DELETE",
    }),
};

// Lesson API calls
export const lessonApi = {
  getAll: () => apiCall<ILesson[]>("/lessons"),
  getById: (id: string) => apiCall<ILesson>(`/lessons/${id}`),
  getByCourseId: (courseId: string) =>
    apiCall<ILesson[]>(`/lessons?courseId=${courseId}`),
  create: (data: Record<string, unknown>) =>
    apiCall<ILesson>("/lessons", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Record<string, unknown>) =>
    apiCall<ILesson>(`/lessons/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    apiCall<void>(`/lessons/${id}`, {
      method: "DELETE",
    }),
};

// Slide API calls
export const slideApi = {
  getAll: () => apiCall<ISlide[]>("/slides"),
  getById: (id: string) => apiCall<ISlide>(`/slides/${id}`),
  getByCourseId: (courseId: string) =>
    apiCall<ISlide[]>(`/slides?courseId=${courseId}`),
  getByLessonId: (lessonId: string) =>
    apiCall<ISlide[]>(`/slides?lessonId=${lessonId}`),
  create: (data: Record<string, unknown>) =>
    apiCall<ISlide>("/slides", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Record<string, unknown>) =>
    apiCall<ISlide>(`/slides/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    apiCall<void>(`/slides/${id}`, {
      method: "DELETE",
    }),
};

// User API calls
export const userApi = {
  getById: (id: string) => apiCall<IUser>(`/users/${id}`),
  getByEmail: (email: string) =>
    apiCall<IUser>(`/users/by-email?email=${encodeURIComponent(email)}`),
  update: (id: string, data: Record<string, unknown>) =>
    apiCall<IUser>(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

// Progress API calls - now exported from dedicated progress.ts file
// Import from "@/lib/api/progress" instead

// Student API calls
export const studentApi = {
  getStreak: (id: string) =>
    apiCall<{ streak: number }>(`/students/${id}/streak`),
  updateActivity: (id: string, data: Record<string, unknown>) =>
    apiCall<Record<string, unknown>>(`/students/${id}/activity`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  getTotalCoins: (id: string) =>
    apiCall<{ total: number }>(`/students/${id}/coins/total`),
  addCoins: (id: string, data: Record<string, unknown>) =>
    apiCall<Record<string, unknown>>(`/students/${id}/coins/add`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateTimeSpent: (id: string, data: Record<string, unknown>) =>
    apiCall<Record<string, unknown>>(`/students/${id}/time-spent`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};

// Helper function to get course with full content (lessons and slides)
export const getCourseWithContent = async (courseId: string) => {
  try {
    // Prefer a single course GET when the API nests lessons+slides.
    const course = await courseApi.getById(courseId);
    const nestedLessons = (course as { lessons?: unknown }).lessons;

    if (
      Array.isArray(nestedLessons) &&
      nestedLessons.length > 0 &&
      typeof nestedLessons[0] === "object" &&
      nestedLessons[0] !== null &&
      "slides" in (nestedLessons[0] as object)
    ) {
      const sortedLessons = [...(nestedLessons as any[])].map((lesson) => ({
        ...lesson,
        slides: Array.isArray(lesson.slides)
          ? [...lesson.slides].sort(
              (a: any, b: any) => (Number(a.order) || 0) - (Number(b.order) || 0)
            )
          : [],
      }));
      sortedLessons.sort(
        (a: any, b: any) => Number(a?.order || 0) - Number(b?.order || 0)
      );
      return { ...course, lessons: sortedLessons };
    }

    // Fallback: one lessons-by-course call (backend populates slides).
    const lessons = await lessonApi.getByCourseId(courseId);
    const sortedLessons = [...lessons]
      .map((lesson: any) => ({
        ...lesson,
        slides: Array.isArray(lesson.slides)
          ? [...lesson.slides].sort(
              (a: any, b: any) => (Number(a.order) || 0) - (Number(b.order) || 0)
            )
          : [],
      }))
      .sort(
        (a: any, b: any) => Number(a?.order || 0) - Number(b?.order || 0)
      );

    return {
      ...course,
      lessons: sortedLessons,
    };
  } catch (error) {
    console.error("Error fetching course with content:", error);
    throw error;
  }
};
