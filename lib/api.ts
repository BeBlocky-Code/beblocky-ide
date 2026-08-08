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

function sortSlides(slides: any[]) {
  return slides.slice().sort((a, b) => {
    const orderA = Number.isFinite(Number(a?.order))
      ? Number(a?.order)
      : Number.MAX_SAFE_INTEGER;
    const orderB = Number.isFinite(Number(b?.order))
      ? Number(b?.order)
      : Number.MAX_SAFE_INTEGER;
    const orderDiff = orderA - orderB;
    if (orderDiff !== 0) return orderDiff;

    const timeA = new Date(a?.updatedAt || a?.createdAt || 0).getTime();
    const timeB = new Date(b?.updatedAt || b?.createdAt || 0).getTime();
    const timeDiff = timeA - timeB;
    if (timeDiff !== 0) return timeDiff;

    return String(a?._id || a?.id || "").localeCompare(
      String(b?._id || b?.id || ""),
    );
  });
}

/** Course GET populates lessons but leaves lesson.slides as ObjectIds (strings). */
function isPopulatedSlide(slide: unknown): boolean {
  return typeof slide === "object" && slide !== null && !Array.isArray(slide);
}

function normalizeLessonSlides(lesson: any) {
  const raw = Array.isArray(lesson?.slides) ? lesson.slides : [];
  const docs = raw.filter(isPopulatedSlide);
  return { ...lesson, slides: sortSlides(docs) };
}

// Course metadata + lessons-by-course (slides populated). Avoid trusting
// course.lessons[].slides — those are usually unpopulated ObjectId refs.
export const getCourseWithContent = async (courseId: string) => {
  try {
    const [course, lessons] = await Promise.all([
      courseApi.getById(courseId),
      lessonApi.getByCourseId(courseId),
    ]);

    let sortedLessons = [...(lessons || [])]
      .map(normalizeLessonSlides)
      .sort(
        (a: any, b: any) => Number(a?.order || 0) - Number(b?.order || 0),
      );

    // If lessons endpoint returned id-only slides, hydrate per lesson.
    const needsSlideHydration = (lessons || []).some((lesson: any) => {
      const originalSlides = Array.isArray(lesson?.slides) ? lesson.slides : [];
      return (
        originalSlides.length > 0 &&
        originalSlides.some((s: unknown) => !isPopulatedSlide(s))
      );
    });

    if (needsSlideHydration) {
      sortedLessons = await Promise.all(
        sortedLessons.map(async (lesson: any) => {
          if ((lesson.slides?.length || 0) > 0) return lesson;
          const lessonId = String(lesson?._id || lesson?.id || "");
          if (!lessonId) return lesson;
          try {
            const slides = await slideApi.getByLessonId(lessonId);
            return {
              ...lesson,
              slides: sortSlides(Array.isArray(slides) ? slides : []),
            };
          } catch {
            return lesson;
          }
        }),
      );
    }

    return {
      ...course,
      lessons: sortedLessons,
    };
  } catch (error) {
    console.error("Error fetching course with content:", error);
    throw error;
  }
};
