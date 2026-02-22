"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Circle,
  Menu,
  X,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useTheme } from "./context/theme-provider";

type LessonProps = {
  _id?: string;
  title: string;
  description?: string;
  status?: "completed" | "in-progress";
};

export default function IdeLessonNavigator({
  currentLessonId,
  onSelectLesson,
  lessons = [],
}: {
  currentLessonId: string;
  onSelectLesson: (lessonId: string) => void;
  lessons: LessonProps[];
}) {
  const { theme } = useTheme();
  const accentColor = theme === "dark" ? "#892FFF" : "#FF932C";

  // All lessons are accessible; status is optional (no locking)
  const processedLessons = lessons.map((lesson, index) => ({
    ...lesson,
    status:
      lesson.status ??
      (lesson._id === currentLessonId ? "in-progress" : "completed"),
  }));

  // Calculate overall progress
  const totalLessons = processedLessons.length;
  const completedLessons = processedLessons.filter(
    (lesson) => lesson.status === "completed"
  ).length;
  const progressPercentage =
    totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  // Get status icon (all lessons are accessible; no locked state)
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle size={16} className="text-green-500" />;
      case "in-progress":
        return <Circle size={16} style={{ color: accentColor }} className="fill-current/20" />;
      default:
        return <Circle size={16} className="text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4">
     
        <Progress value={progressPercentage} className="h-2" />
        <div className="text-xs text-muted-foreground">
          {completedLessons} of {totalLessons} lessons completed
        </div>
   

      <ScrollArea className="h-[60vh]">
        <div className="space-y-2">
          {processedLessons.map((lesson) => (
            <Button
              key={lesson._id || lesson.title}
              variant={lesson._id === currentLessonId ? "secondary" : "ghost"}
              className="w-full justify-start text-sm h-auto py-3"
              onClick={() => {
                if (lesson._id) {
                  onSelectLesson(lesson._id);
                  // Close the drawer after selection
                  const closeButton = document.querySelector(
                    '[data-drawer-close="true"]'
                  );
                  if (closeButton) {
                    (closeButton as HTMLElement).click();
                  }
                }
              }}
            >
              <span className="mr-2">
                {getStatusIcon(lesson.status || "locked")}
              </span>
              <div className="text-left">
                <div className="font-medium">{lesson.title}</div>
                {lesson.description && (
                  <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {lesson.description}
                  </div>
                )}
              </div>
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
