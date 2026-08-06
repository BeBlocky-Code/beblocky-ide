import { Types } from "mongoose";

export interface ISlideCompletion {
  isCompleted: boolean;
  completedAt?: Date | string;
  timeSpent: number;
  lessonId: string;
}

export interface ILessonCompletion {
  isCompleted: boolean;
  completedAt?: Date | string;
  timeSpent: number;
}

// Main progress interface matching the API structure
export interface IProgress {
  _id?: string;
  studentId: Types.ObjectId | string;
  courseId: Types.ObjectId | string;
  completedLessons:
    | Record<string, ILessonCompletion>
    | Map<string, ILessonCompletion>;
  completedSlides?:
    | Record<string, ISlideCompletion>
    | Map<string, ISlideCompletion>;
  completionPercentage: number;
  timeSpent: Record<string, number> | Map<string, number>;
  coinsEarned: number;
  lessonCode:
    | Record<
        string,
        {
          language: string;
          code: string;
          timestamp: Date | string;
        }
      >
    | Map<
        string,
        {
          language: string;
          code: string;
          timestamp: Date | string;
        }
      >;
  currentLesson?: Types.ObjectId | string;
  currentSlide?: Types.ObjectId | string;
  startedAt: Date | string;
  lastCompletedAt?: Date | string;
  isActive: boolean;
  lastCalculatedAt: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface ICreateProgressDto {
  studentId: string;
  courseId: string;
  currentLesson?: string;
}

export interface IUpdateProgressDto {
  completionPercentage?: number;
  coinsEarned?: number;
  isActive?: boolean;
  currentLesson?: string;
}

export interface ICompleteLessonDto {
  lessonId: string;
  timeSpent: number;
}

export interface ICompleteSlideDto {
  slideId: string;
  lessonId: string;
  timeSpent?: number;
}

export interface ISaveCodeDto {
  lessonId: string;
  language: string;
  code: string;
}

export type { IUpdateTimeSpentDto } from "../student";

export interface ICompletionPercentageResponse {
  percentage: number;
  completedSlides: number;
  totalSlides: number;
  completedLessons: number;
  totalLessons: number;
}

/** Full progress document returned by getByStudentAndCourse */
export interface IStudentProgress {
  _id?: string;
  studentId: string;
  courseId: string;
  completionPercentage: number;
  completedLessons:
    | Record<string, ILessonCompletion>
    | number;
  completedSlides?: Record<string, ISlideCompletion>;
  totalLessons?: number;
  totalSlides?: number;
  coinsEarned: number;
  timeSpent: number | Record<string, number>;
  lessonCode?: Record<
    string,
    {
      language: string;
      code: string;
      timestamp: string;
    }
  >;
  currentLesson?: string;
  currentSlide?: string;
  startedAt: Date | string;
  lastCompletedAt?: Date | string;
  isActive: boolean;
}

export interface IProgressResponse {
  _id: string;
  studentId: string;
  courseId: string;
  completedLessons: Record<string, ILessonCompletion>;
  completedSlides: Record<string, ISlideCompletion>;
  completionPercentage: number;
  timeSpent: Record<string, number>;
  coinsEarned: number;
  lessonCode: Record<
    string,
    {
      language: string;
      code: string;
      timestamp: string;
    }
  >;
  currentLesson?: string;
  currentSlide?: string;
  startedAt: string;
  lastCompletedAt?: string;
  isActive: boolean;
  lastCalculatedAt: string;
  createdAt: string;
  updatedAt: string;
}
