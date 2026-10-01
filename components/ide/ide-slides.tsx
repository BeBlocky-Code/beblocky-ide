"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Menu,
  Code,
  Copy,
  Check,
  Play,
  BookOpen,
  PartyPopper,
  Trophy,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Slide } from "@/lib/mock-data";
import IdeLessonNavigator from "./ide-lesson-navigator";
import IdeMarkdownPreview from "./ide-markdown-preview";
import IdeChallengePath from "./ide-challenge-path";
import { useTheme } from "./context/theme-provider";

type LessonItem = {
  _id?: string;
  id?: string;
  title?: string;
  description?: string;
  status?: "completed" | "in-progress" | "locked";
  order?: number;
};

function lessonIdOf(lesson: LessonItem | undefined) {
  if (!lesson) return "";
  return String(lesson._id || lesson.id || "");
}

export default function IdeSlides({
  slides,
  courseId,
  lessons,
  currentLessonId,
  onSelectLesson,
  initialSlideIndex = 0,
  onSlideChange,
  courseProgress,
  code,
}: {
  slides: Slide[];
  courseId: string;
  lessons?: LessonItem[];
  currentLessonId?: string;
  onSelectLesson?: (lessonId: string) => void;
  initialSlideIndex?: number;
  onSlideChange?: (slideIndex: number) => void;
  courseProgress?: {
    percentage: number;
    completedSlides: number;
    totalSlides: number;
  };
  code?: string;
}) {
  const orderedSlides = useMemo(() => {
    const toOrder = (s: any) => {
      const n = Number(s?.order);
      return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
    };
    const toTime = (s: any) => {
      const t = new Date(s?.updatedAt || s?.createdAt || 0).getTime();
      return Number.isFinite(t) ? t : 0;
    };

    // Ignore unpopulated ObjectId strings from course.lessons[].slides
    const docs = (slides || []).filter(
      (s): s is Slide => typeof s === "object" && s !== null,
    );

    return docs.slice().sort((a: any, b: any) => {
      const orderDiff = toOrder(a) - toOrder(b);
      if (orderDiff !== 0) return orderDiff;
      const timeDiff = toTime(a) - toTime(b);
      if (timeDiff !== 0) return timeDiff;
      return String(a?._id || a?.id || "").localeCompare(
        String(b?._id || b?.id || ""),
      );
    });
  }, [slides]);

  const orderedLessons = useMemo(() => {
    const list = (lessons || []).slice();
    const hasExplicitOrder = list.some(
      (l) => Number.isFinite(Number((l as any)?.order)),
    );
    if (!hasExplicitOrder) return list;
    return list.sort((a, b) => {
      const ao = Number((a as any)?.order);
      const bo = Number((b as any)?.order);
      const aSafe = Number.isFinite(ao) ? ao : Number.MAX_SAFE_INTEGER;
      const bSafe = Number.isFinite(bo) ? bo : Number.MAX_SAFE_INTEGER;
      return aSafe - bSafe;
    });
  }, [lessons]);

  const currentLesson = useMemo(
    () =>
      orderedLessons.find((l) => lessonIdOf(l) === String(currentLessonId || "")),
    [orderedLessons, currentLessonId],
  );

  const nextLesson = useMemo(() => {
    if (!currentLessonId || orderedLessons.length === 0) return null;
    const idx = orderedLessons.findIndex(
      (l) => lessonIdOf(l) === String(currentLessonId),
    );
    if (idx < 0 || idx >= orderedLessons.length - 1) return null;
    return orderedLessons[idx + 1] ?? null;
  }, [orderedLessons, currentLessonId]);

  const [currentSlideIndex, setCurrentSlideIndex] = useState(initialSlideIndex);
  const [activeTab, setActiveTab] = useState("content");
  const [copied, setCopied] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [showLessonComplete, setShowLessonComplete] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const hasLoadedInit = sessionStorage.getItem("ide_slides_loaded");
    if (!hasLoadedInit) {
      setShouldAnimate(true);
      sessionStorage.setItem("ide_slides_loaded", "true");
    }
  }, []);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (orderedSlides.length === 0) return;
    const nextIndex = Number.isFinite(initialSlideIndex) ? initialSlideIndex : 0;
    const clampedIndex = Math.max(
      0,
      Math.min(nextIndex, orderedSlides.length - 1),
    );
    setCurrentSlideIndex(clampedIndex);
  }, [initialSlideIndex, currentLessonId, orderedSlides.length]);

  // Reset celebration when switching lessons
  useEffect(() => {
    setShowLessonComplete(false);
  }, [currentLessonId]);

  const currentSlide = orderedSlides[currentSlideIndex] || {
    title: "Learning Material",
    content: "Please select a lesson to begin.",
  };

  const totalSlides = orderedSlides.length;
  const progress = showLessonComplete
    ? 100
    : totalSlides > 0
      ? ((currentSlideIndex + 1) / totalSlides) * 100
      : 0;

  const goToNextSlide = () => {
    if (currentSlideIndex < totalSlides - 1) {
      const newIndex = currentSlideIndex + 1;
      setCurrentSlideIndex(newIndex);
      onSlideChange?.(newIndex);
      return;
    }

    // Last slide: mark complete and show recognition
    if (totalSlides > 0) {
      onSlideChange?.(currentSlideIndex);
      setShowLessonComplete(true);
    }
  };

  const goToPreviousSlide = () => {
    if (showLessonComplete) {
      setShowLessonComplete(false);
      return;
    }
    if (currentSlideIndex > 0) {
      const newIndex = currentSlideIndex - 1;
      setCurrentSlideIndex(newIndex);
      onSlideChange?.(newIndex);
    }
  };

  const startNextLesson = () => {
    const id = lessonIdOf(nextLesson || undefined);
    if (!id || !onSelectLesson) return;
    setShowLessonComplete(false);
    onSelectLesson(id);
  };

  const extractCodeBlocks = (content: string) => {
    const codeRegex = /```[\s\S]*?```/g;
    return content.match(codeRegex) || [];
  };

  const codeBlocks = currentSlide.content
    ? extractCodeBlocks(currentSlide.content)
    : [];

  const { theme } = useTheme();
  const accentColor = theme === "dark" ? "#892FFF" : "#FF932C";
  const accentSoft =
    theme === "dark" ? "rgba(137, 47, 255, 0.14)" : "rgba(255, 147, 44, 0.14)";

  return (
    <Card className="h-full min-w-0 flex flex-col border rounded-xl shadow-sm overflow-hidden bg-background transition-all duration-300">
      <CardHeader className="p-3 border-b flex-row items-center justify-between space-y-0 bg-muted/20 backdrop-blur-sm min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <Drawer>
            <DrawerTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full hover:bg-muted/50 transition-colors"
                title="Lesson Menu"
              >
                <Menu
                  size={18}
                  className="text-muted-foreground hover:text-foreground"
                />
              </Button>
            </DrawerTrigger>
            <DrawerContent
              className="max-h-[85vh] overflow-hidden flex flex-col p-0 border-t-2"
              style={{ borderTopColor: accentColor }}
            >
              <DrawerTitle className="sr-only">Lesson Navigator</DrawerTitle>
              <div className="p-6 border-b flex items-center justify-between bg-muted/10">
                <div>
                  <h3 className="text-xl font-bold tracking-tight">
                    Curriculum
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Select a lesson to navigate through the course.
                  </p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
                {lessons && onSelectLesson && currentLessonId ? (
                  <IdeLessonNavigator
                    currentLessonId={currentLessonId}
                    onSelectLesson={onSelectLesson}
                    lessons={lessons.map((lesson) => ({
                      _id: lessonIdOf(lesson),
                      title: lesson.title || "Untitled lesson",
                      description: lesson.description,
                      status: lesson.status,
                    }))}
                    courseProgress={courseProgress}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <BookOpen size={48} className="opacity-20 mb-4" />
                    <p>No other lessons available.</p>
                  </div>
                )}
              </div>
            </DrawerContent>
          </Drawer>

          <div className="flex items-center gap-2 px-3 py-1 bg-background/50 rounded-full">
            <BookOpen size={14} style={{ color: accentColor }} />
            <span className="text-xs font-bold tracking-tight truncate">
              Slides
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
            {showLessonComplete
              ? "Complete"
              : `${currentSlideIndex + 1} / ${totalSlides || 1}`}
          </span>
        </div>
      </CardHeader>

      <AnimatePresence mode="wait">
        {showLessonComplete ? (
          <motion.div
            key="lesson-complete"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="flex-1 min-h-0 overflow-y-auto"
          >
            <div
              className="relative h-full flex flex-col items-center justify-center px-6 py-10 text-center"
              style={{
                backgroundImage: `radial-gradient(ellipse 80% 60% at 50% 0%, ${accentSoft}, transparent 70%)`,
              }}
            >
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 260,
                  damping: 18,
                  delay: 0.05,
                }}
                className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-border/40 bg-background shadow-lg"
                style={{ boxShadow: `0 12px 40px ${accentSoft}` }}
              >
                {nextLesson ? (
                  <PartyPopper
                    className="h-7 w-7"
                    style={{ color: accentColor }}
                  />
                ) : (
                  <Trophy className="h-7 w-7" style={{ color: accentColor }} />
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.12 }}
                className="space-y-2 max-w-sm"
              >
                <div className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-background/80 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  <CheckCircle2
                    className="h-3 w-3"
                    style={{ color: accentColor }}
                  />
                  {nextLesson ? "Lesson complete" : "Course complete"}
                </div>
                <h2 className="text-2xl font-black tracking-tight text-foreground">
                  {nextLesson
                    ? "Nice work, you finished this lesson"
                    : "You finished the course"}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {currentLesson?.title ? (
                    <>
                      <span className="font-semibold text-foreground/80">
                        {currentLesson.title}
                      </span>
                      {nextLesson
                        ? " is done. Keep the momentum going."
                        : " wraps up the full curriculum. Great persistence."}
                    </>
                  ) : nextLesson ? (
                    "You’ve completed every slide in this lesson."
                  ) : (
                    "Every lesson in this course is behind you."
                  )}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="mt-8 w-full max-w-sm space-y-3"
              >
                {nextLesson ? (
                  <>
                    <div className="rounded-2xl border border-border/50 bg-background/70 px-4 py-3 text-left backdrop-blur-sm">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                        Up next
                      </p>
                      <p className="mt-1 text-sm font-bold tracking-tight text-foreground">
                        {nextLesson.title || "Next lesson"}
                      </p>
                      {nextLesson.description ? (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {nextLesson.description}
                        </p>
                      ) : null}
                    </div>
                    <Button
                      variant="brand"
                      size="lg"
                      onClick={startNextLesson}
                      disabled={!onSelectLesson}
                      style={{ backgroundColor: accentColor }}
                      className="w-full h-11 rounded-full font-bold text-sm shadow-md border-none group"
                    >
                      Start next lesson
                      <ArrowRight
                        size={16}
                        className="ml-2 group-hover:translate-x-0.5 transition-transform"
                      />
                    </Button>
                  </>
                ) : (
                  <div className="rounded-2xl border border-border/50 bg-background/70 px-5 py-4 backdrop-blur-sm">
                    <p className="text-sm font-bold text-foreground">
                      Course finished
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                      You’ve completed all lessons
                      {courseId ? " in this course" : ""}. Review any lesson
                      from the curriculum menu anytime.
                    </p>
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLessonComplete(false)}
                  style={{ color: accentColor, borderColor: `${accentColor}33` }}
                  className="w-full rounded-full h-9 font-bold text-xs hover:bg-background"
                >
                  Review slides
                </Button>
              </motion.div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="lesson-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col overflow-hidden min-w-0 min-h-0"
          >
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="flex-1 flex flex-col overflow-hidden min-w-0"
            >
              <div className="px-4 py-2 border-b bg-muted/5">
                <TabsList className="h-8 p-1 bg-muted/40 rounded-full w-fit gap-1 border border-border/40">
                  <TabsTrigger
                    value="content"
                    className="text-xs px-4 rounded-full data-[state=active]:text-white transition-all duration-300 font-bold"
                    style={{
                      backgroundColor:
                        activeTab === "content" ? accentColor : "transparent",
                    }}
                  >
                    Content
                  </TabsTrigger>
                  {(codeBlocks.length > 0 || currentSlide.startingCode) && (
                    <TabsTrigger
                      value="code"
                      className="text-xs px-4 rounded-full data-[state=active]:text-white transition-all duration-300 font-bold"
                      style={{
                        backgroundColor:
                          activeTab === "code" ? accentColor : "transparent",
                      }}
                    >
                      Examples
                    </TabsTrigger>
                  )}
                  <TabsTrigger
                    value="challenges"
                    className="text-xs px-4 rounded-full data-[state=active]:text-white transition-all duration-300 font-bold"
                    style={{
                      backgroundColor:
                        activeTab === "challenges"
                          ? accentColor
                          : "transparent",
                    }}
                  >
                    Challenges
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent
                value="content"
                className={cn(
                  "flex-1 overflow-hidden m-0 p-0 min-w-0",
                  shouldAnimate && "animate-in fade-in duration-300",
                )}
              >
                <div className="h-full scrollbar-hide">
                  <IdeMarkdownPreview content={currentSlide.content || ""} />
                </div>
              </TabsContent>

              <TabsContent
                value="code"
                className={cn(
                  "flex-1 overflow-hidden m-0 p-0 min-w-0",
                  shouldAnimate && "animate-in fade-in duration-300",
                )}
              >
                <div className="h-full overflow-y-auto scrollbar-hide p-4 space-y-4">
                  <h3 className="text-sm font-bold flex items-center gap-2 text-muted-foreground pb-2 border-b border-border/40">
                    <Code size={16} style={{ color: accentColor }} />
                    CODE SNIPPETS
                  </h3>

                  {currentSlide.startingCode && (
                    <div
                      className="group relative rounded-xl overflow-hidden border border-border/40 bg-muted/5 transition-all"
                      style={{ borderColor: copied ? accentColor : undefined }}
                    >
                      <div className="flex items-center justify-between px-4 py-2 bg-muted/20 border-b border-border/40">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground tracking-tighter uppercase">
                          <Play size={10} style={{ color: accentColor }} />
                          Starting Code
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded-md hover:bg-background transition-colors"
                          onClick={() => {
                            navigator.clipboard.writeText(
                              currentSlide.startingCode || "",
                            );
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                        >
                          {copied ? (
                            <Check size={14} className="text-green-500" />
                          ) : (
                            <Copy
                              size={14}
                              className="text-muted-foreground"
                            />
                          )}
                        </Button>
                      </div>
                      <pre className="p-4 text-xs font-mono overflow-x-auto whitespace-pre">
                        <code>{currentSlide.startingCode}</code>
                      </pre>
                    </div>
                  )}

                  {!currentSlide.startingCode && codeBlocks.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 opacity-40">
                      <Code size={32} />
                      <p className="text-xs font-bold mt-2">
                        No code snippets available
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent
                value="challenges"
                className={cn(
                  "flex-1 overflow-hidden m-0 p-0 min-w-0",
                  shouldAnimate && "animate-in fade-in duration-300",
                )}
              >
                <IdeChallengePath
                  courseId={courseId}
                  lessonId={currentLessonId}
                  code={code}
                />
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4 bg-muted/5 border-t space-y-4 flex-shrink-0 min-w-0">
        {!showLessonComplete && (
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousSlide}
              disabled={currentSlideIndex === 0}
              style={{ color: accentColor, borderColor: `${accentColor}33` }}
              className="rounded-full flex-1 h-9 font-bold text-xs hover:bg-background transition-all group"
            >
              <ChevronLeft
                size={16}
                className="mr-1 group-hover:-translate-x-0.5 transition-transform"
              />
              Back
            </Button>

            <Button
              variant="brand"
              size="sm"
              onClick={goToNextSlide}
              style={{ backgroundColor: accentColor }}
              className="rounded-full flex-[1.5] h-9 font-bold text-xs shadow-md transition-all group border-none"
            >
              {currentSlideIndex === totalSlides - 1 ? "Finished" : "Next Step"}
              <ChevronRight
                size={16}
                className="ml-1 group-hover:translate-x-0.5 transition-transform"
              />
            </Button>
          </div>
        )}

        <div className="relative pt-1">
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-500 ease-out shadow-sm"
              style={{
                width: `${progress}%`,
                backgroundImage: `linear-gradient(to right, ${accentColor}, ${theme === "dark" ? "#b794f4" : "#f6ad55"})`,
              }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
