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
    const course = await courseApi.getById(courseId);
    const lessons = await lessonApi.getByCourseId(courseId);

    // Get slides for each lesson
    const lessonsWithSlides = await Promise.all(
      lessons.map(async (lesson) => {
        const slides = await slideApi.getByLessonId(
          lesson._id?.toString() || ""
        );
        return {
          ...lesson,
          slides: slides.sort((a, b) => a.order - b.order), // Sort slides by order
        };
      })
    );

    // Sort lessons by their order (assuming they have an order field)
    const sortedLessons = lessonsWithSlides.sort((a, b) => {
      // If lessons have an order field, use it; otherwise, keep original order
      return (a as Record<string, unknown>).order &&
        (b as Record<string, unknown>).order
        ? ((a as Record<string, unknown>).order as number) -
            ((b as Record<string, unknown>).order as number)
        : 0;
    });

    return {
      ...course,
      lessons: sortedLessons,
    };
  } catch (error) {
    console.error("Error fetching course with content:", error);
    throw error;
  }
};
