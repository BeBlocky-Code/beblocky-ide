export { courseApi } from "./course";
export { lessonApi } from "./lesson";
export { slideApi } from "./slide";
export { userApi } from "./user";
export { progressApi } from "./progress";
export { studentApi } from "./student";
export { aiConversationApi } from "./ai-conversation";
export { codeAnalysisApi } from "./code-analysis";
export { noteApi } from "./note";

import { courseApi } from "./course";
import { lessonApi } from "./lesson";
import { slideApi } from "./slide";

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

function isPopulatedSlide(slide: unknown): boolean {
  return typeof slide === "object" && slide !== null && !Array.isArray(slide);
}

function normalizeLessonSlides(lesson: any) {
  const raw = Array.isArray(lesson?.slides) ? lesson.slides : [];
  const docs = raw.filter(isPopulatedSlide);
  return { ...lesson, slides: sortSlides(docs) };
}

// Course metadata + lessons-by-course (slides populated). Course GET only
// populates lessons — lesson.slides stay as ObjectId strings.
export const getCourseWithContent = async (courseId: string) => {
  try {
    const [course, lessons] = await Promise.all([
      courseApi.getById(courseId),
      lessonApi.getByCourseId(courseId),
    ]);

    let sortedLessons = [...(lessons || [])]
      .map(normalizeLessonSlides)
      .sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0));

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
