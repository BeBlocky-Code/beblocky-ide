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

    return String(a?._id || "").localeCompare(String(b?._id || ""));
  });
}

// Prefer populated lessons (no N+1 slide fetches).
export const getCourseWithContent = async (courseId: string) => {
  try {
    const course = await courseApi.getById(courseId);
    const nestedLessons = (course as { lessons?: unknown }).lessons;

    if (
      Array.isArray(nestedLessons) &&
      nestedLessons.length > 0 &&
      typeof nestedLessons[0] === "object" &&
      nestedLessons[0] !== null &&
      "slides" in (nestedLessons[0] as object)
    ) {
      const sortedLessons = [...(nestedLessons as any[])]
        .map((lesson) => ({
          ...lesson,
          slides: Array.isArray(lesson.slides)
            ? sortSlides(lesson.slides)
            : [],
        }))
        .sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0));
      return { ...course, lessons: sortedLessons };
    }

    const lessons = await lessonApi.getByCourseId(courseId);
    const sortedLessons = [...lessons]
      .map((lesson: any) => ({
        ...lesson,
        slides: Array.isArray(lesson.slides) ? sortSlides(lesson.slides) : [],
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
