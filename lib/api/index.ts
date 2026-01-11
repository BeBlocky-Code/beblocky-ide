export { courseApi } from "./course";
export { lessonApi } from "./lesson";
export { slideApi } from "./slide";
export { userApi } from "./user";
export { progressApi } from "./progress";
export { studentApi } from "./student";
export { aiConversationApi } from "./ai-conversation";
export { codeAnalysisApi } from "./code-analysis";

import { courseApi } from "./course";
import { lessonApi } from "./lesson";
import { slideApi } from "./slide";

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
          slides: slides
            .slice()
            .sort((a, b) => {
              const orderA = Number.isFinite(Number((a as any)?.order))
                ? Number((a as any)?.order)
                : Number.MAX_SAFE_INTEGER;
              const orderB = Number.isFinite(Number((b as any)?.order))
                ? Number((b as any)?.order)
                : Number.MAX_SAFE_INTEGER;
              const orderDiff = orderA - orderB;
              if (orderDiff !== 0) return orderDiff;

              const timeA = new Date(
                (a as any)?.updatedAt || (a as any)?.createdAt || 0
              ).getTime();
              const timeB = new Date(
                (b as any)?.updatedAt || (b as any)?.createdAt || 0
              ).getTime();
              const timeDiff = timeA - timeB;
              if (timeDiff !== 0) return timeDiff;

              return String((a as any)?._id || "").localeCompare(
                String((b as any)?._id || "")
              );
            }), // Sort slides by order (stable tie-breakers)
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
