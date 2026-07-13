import { Types } from "mongoose";

// Main progress interface matching the API documentation structure
export interface IProgress {
  _id?: string;
  studentId: Types.ObjectId;
  courseId: Types.ObjectId;
  completedLessons: Map<
    string,
    {
      isCompleted: boolean;
      completedAt: Date;
      timeSpent: number;
    }
  >;
  completionPercentage: number;
  timeSpent: Map<string, number>; // weekKey -> total minutes
  coinsEarned: number;
  lessonCode: Map<
    string,
    {
      language: string;
      code: string;
      timestamp: Date;
    }
  >;
  currentLesson?: Types.ObjectId;
  startedAt: Date;
  lastCompletedAt?: Date;
  isActive: boolean;
  lastCalculatedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// Progress creation DTO
export interface ICreateProgressDto {
  studentId: string;
  courseId: string;
  currentLesson?: string;
}

// Progress update DTO
export interface IUpdateProgressDto {
  completionPercentage?: number;
  coinsEarned?: number;
  isActive?: boolean;
  currentLesson?: string;
}

// Lesson completion DTO
export interface ICompleteLessonDto {
  lessonId: string;
  timeSpent: number;
}

// Code saving DTO
export interface ISaveCodeDto {
  lessonId: string;
  language: string;
  code: string;
}

// Time spent update DTO (see student/index.ts)
export type { IUpdateTimeSpentDto } from "../student";

// Completion percentage response
export interface ICompletionPercentageResponse {
  percentage: number;
  completedLessons: number;
  totalLessons: number;
}

// Student progress summary (for getByStudentAndCourse)
export interface IStudentProgress {
  _id?: string;
  studentId: string;
  courseId: string;
  completionPercentage: number;
  completedLessons: number;
  totalLessons: number;
  coinsEarned: number;
  timeSpent: number;
  currentLesson?: string;
  startedAt: Date;
  lastCompletedAt?: Date;
  isActive: boolean;
  // Legacy support for existing code structure
  progress?: Array<{
    _id?: string;
    lessonId?: string;
    slideId?: string;
    code?: string;
    timeSpent?: number;
    completed?: boolean;
    lastAccessed?: string;
  }>;
}

// Progress response wrapper
export interface IProgressResponse {
  _id: string;
  studentId: string;
  courseId: string;
  completedLessons: Record<
    string,
    {
      isCompleted: boolean;
      completedAt: string;
      timeSpent: number;
    }
  >;
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
  startedAt: string;
  lastCompletedAt?: string;
  isActive: boolean;
  lastCalculatedAt: string;
  createdAt: string;
  updatedAt: string;
}
