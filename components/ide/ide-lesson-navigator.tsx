"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CheckCircle,
  Circle,
  BookOpen,
} from "lucide-react";
import { useTheme } from "./context/theme-provider";

type LessonProps = {
  _id?: string;
  title: string;
  description?: string;
  status?: "completed" | "in-progress" | "locked";
};

export default function IdeLessonNavigator({
  currentLessonId,
  onSelectLesson,
  lessons = [],
  courseProgress,
}: {
  currentLessonId: string;
  onSelectLesson: (lessonId: string) => void;
  lessons: LessonProps[];
  courseProgress?: {
    percentage: number;
    completedSlides: number;
    totalSlides: number;
  };
}) {
  const { theme } = useTheme();
  const accentColor = theme === "dark" ? "#892FFF" : "#FF932C";

  // All lessons are accessible; status is optional (no locking)
  const processedLessons = lessons.map((lesson) => ({
    ...lesson,
    status:
      lesson.status ??
      (lesson._id === currentLessonId ? "in-progress" : undefined),
  }));

  const completedLessonCount = processedLessons.filter(
    (lesson) => lesson.status === "completed",
  ).length;
  const totalLessons = processedLessons.length;

  const progressPercentage =
    typeof courseProgress?.percentage === "number"
      ? courseProgress.percentage
      : totalLessons > 0
        ? (completedLessonCount / totalLessons) * 100
        : 0;

  const progressSubtitle =
    courseProgress && courseProgress.totalSlides > 0
      ? `${courseProgress.completedSlides} of ${courseProgress.totalSlides} slides completed`
      : `${completedLessonCount} of ${totalLessons} lessons completed`;

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle size={16} className="text-green-500" />;
      case "in-progress":
        return (
          <Circle
            size={16}
            style={{ color: accentColor }}
            className="fill-current/20"
          />
        );
      default:
        return <Circle size={16} className="text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3 px-1">
        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">
          <span>Your Progress</span>
          <span style={{ color: accentColor }}>
            {Math.round(progressPercentage)}%
          </span>
        </div>
        <div className="h-1.5 w-full bg-muted/40 rounded-full overflow-hidden border border-border/5">
          <div
            className="h-full transition-all duration-1000 ease-out shadow-sm"
            style={{
              width: `${Math.min(100, Math.max(0, progressPercentage))}%`,
              backgroundImage: `linear-gradient(to right, ${accentColor}, ${theme === "dark" ? "#b794f4" : "#f6ad55"})`,
            }}
          />
        </div>
        <div className="text-[10px] font-bold text-muted-foreground/40 text-center">
          {progressSubtitle}
        </div>
      </div>

      <ScrollArea className="h-[55vh] pr-4">
        <div className="space-y-3">
          {processedLessons.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <BookOpen size={40} className="opacity-20 mb-3" />
              <p className="text-sm">No lessons available.</p>
            </div>
          ) : (
            processedLessons.map((lesson) => {
              const isActive = lesson._id === currentLessonId;
              return (
                <Button
                  key={lesson._id || lesson.title}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start text-sm h-auto py-4 px-4 rounded-xl border transition-all duration-300 group",
                    isActive
                      ? "bg-card shadow-md border-border/40 scale-[1.02] z-10"
                      : "hover:bg-muted/30 border-transparent hover:border-border/10",
                  )}
                  onClick={() => {
                    if (lesson._id) {
                      onSelectLesson(lesson._id);
                      const closeButton = document.querySelector(
                        '[data-drawer-close="true"]',
                      );
                      if (closeButton) {
                        (closeButton as HTMLElement).click();
                      }
                    }
                  }}
                >
                  <div className="flex items-center gap-4 w-full">
                    <div
                      className={cn(
                        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500",
                        isActive ? "bg-primary/10 shadow-inner" : "bg-muted/20",
                      )}
                    >
                      {getStatusIcon(lesson.status)}
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <div
                        className={cn(
                          "font-bold tracking-tight transition-colors truncate",
                          isActive
                            ? "text-foreground"
                            : "text-foreground/70 group-hover:text-foreground",
                        )}
                      >
                        {lesson.title}
                      </div>
                      {lesson.description && (
                        <div className="text-[11px] text-muted-foreground/60 mt-1 line-clamp-1 font-medium group-hover:text-muted-foreground/80 transition-colors">
                          {lesson.description}
                        </div>
                      )}
                    </div>
                    {isActive && (
                      <div
                        className="w-1.5 h-1.5 rounded-full animate-pulse shadow-glow"
                        style={{
                          backgroundColor: accentColor,
                          boxShadow: `0 0 10px ${accentColor}`,
                        }}
                      />
                    )}
                  </div>
                </Button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
