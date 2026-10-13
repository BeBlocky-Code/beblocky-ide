import type { ILesson, ISlide } from "@/types";

const COURSE_LANGUAGES = ["python", "javascript", "typescript", "html", "web"];

export function sortSlidesByOrder(slides: ISlide[]): ISlide[] {
  const toOrder = (s: Partial<ISlide> | null) => {
    const n = Number(s?.order);
    return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
  };
  const toTime = (s: Partial<ISlide> | null) => {
    const t = new Date(s?.updatedAt || s?.createdAt || 0).getTime();
    return Number.isFinite(t) ? t : 0;
  };

  return (slides || [])
    .filter((s): s is ISlide => typeof s === "object" && s !== null)
    .slice()
    .sort((a, b) => {
      const orderDiff = toOrder(a) - toOrder(b);
      if (orderDiff !== 0) return orderDiff;
      const timeDiff = toTime(a) - toTime(b);
      if (timeDiff !== 0) return timeDiff;
      return String(a?._id || "").localeCompare(
        String(b?._id || ""),
      );
    });
}

export function normalizeCourseLanguage(course: unknown): string {
  const c = course as { courseLanguage?: unknown; language?: unknown } | null;
  const candidate = String(
    c?.courseLanguage || c?.language || "web",
  ).toLowerCase();
  return COURSE_LANGUAGES.includes(candidate) ? candidate : "web";
}

export function slidesForLesson(
  lessons: ILesson[],
  lessonId: string,
): ISlide[] {
  const lesson = lessons.find((l) => l._id?.toString() === lessonId);
  return sortSlidesByOrder((lesson?.slides as unknown as ISlide[]) || []);
}

export interface InitialPosition {
  lessonId: string;
  slideIndex: number;
  code: string;
}

/** Where the learner lands: resume from saved progress, else the first lesson. */
export function resolveInitialPosition(
  lessons: ILesson[],
  progress:
    | {
        currentLesson?: unknown;
        currentSlide?: unknown;
        lessonCode?: Record<string, { code?: string } | undefined>;
      }
    | null
    | undefined,
): InitialPosition {
  if (lessons.length === 0) return { lessonId: "", slideIndex: 0, code: "" };

  const first = lessons[0];
  const firstSlides = sortSlidesByOrder(
    (first.slides as unknown as ISlide[]) || [],
  );
  const fallback: InitialPosition = {
    lessonId: first._id?.toString() || "",
    slideIndex: 0,
    code: firstSlides[0]?.startingCode || "",
  };

  const resumeLessonId = progress?.currentLesson
    ? String(progress.currentLesson)
    : null;
  if (!resumeLessonId) return fallback;
  const lesson = lessons.find((l) => l._id?.toString() === resumeLessonId);
  if (!lesson) return fallback;

  const slides = sortSlidesByOrder((lesson.slides as unknown as ISlide[]) || []);
  const resumeSlideId = progress?.currentSlide
    ? String(progress.currentSlide)
    : null;
  let slideIndex = 0;
  if (resumeSlideId) {
    const idx = slides.findIndex((s) => s._id?.toString() === resumeSlideId);
    if (idx !== -1) slideIndex = idx;
  }
  const savedCode = progress?.lessonCode?.[resumeLessonId]?.code;
  return {
    lessonId: resumeLessonId,
    slideIndex,
    code:
      savedCode ||
      slides[slideIndex]?.startingCode ||
      slides[0]?.startingCode ||
      "",
  };
}
