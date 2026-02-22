"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
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
import { useTheme } from "./context/theme-provider";

export default function IdeSlides({
  slides,
  courseId,
  lessons,
  currentLessonId,
  onSelectLesson,
  initialSlideIndex = 0,
  onSlideChange,
}: {
  slides: Slide[];
  courseId: string;
  lessons?: any[];
  currentLessonId?: string;
  onSelectLesson?: (lessonId: string) => void;
  initialSlideIndex?: number;
  onSlideChange?: (slideIndex: number) => void;
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

    return (slides || []).slice().sort((a: any, b: any) => {
      const orderDiff = toOrder(a) - toOrder(b);
      if (orderDiff !== 0) return orderDiff;
      const timeDiff = toTime(a) - toTime(b);
      if (timeDiff !== 0) return timeDiff;
      return String(a?._id || a?.id || "").localeCompare(
        String(b?._id || b?.id || ""),
      );
    });
  }, [slides]);

  const [currentSlideIndex, setCurrentSlideIndex] = useState(initialSlideIndex);
  const [activeTab, setActiveTab] = useState("content");
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const nextIndex = Number.isFinite(initialSlideIndex) ? initialSlideIndex : 0;
    const clampedIndex = Math.max(0, Math.min(nextIndex, orderedSlides.length - 1));
    setCurrentSlideIndex(clampedIndex);
  }, [initialSlideIndex, currentLessonId, orderedSlides.length]);

  const currentSlide = orderedSlides[currentSlideIndex] || {
    title: "Learning Material",
    content: "Please select a lesson to begin.",
  };

  const totalSlides = orderedSlides.length;
  const progress = totalSlides > 0 ? ((currentSlideIndex + 1) / totalSlides) * 100 : 0;

  const goToNextSlide = () => {
    if (currentSlideIndex < totalSlides - 1) {
      const newIndex = currentSlideIndex + 1;
      setCurrentSlideIndex(newIndex);
      onSlideChange?.(newIndex);
    }
  };

  const goToPreviousSlide = () => {
    if (currentSlideIndex > 0) {
      const newIndex = currentSlideIndex - 1;
      setCurrentSlideIndex(newIndex);
      onSlideChange?.(newIndex);
    }
  };

  const extractCodeBlocks = (content: string) => {
    const codeRegex = /```[\s\S]*?```/g;
    return content.match(codeRegex) || [];
  };

  const codeBlocks = currentSlide.content ? extractCodeBlocks(currentSlide.content) : [];

  const { theme } = useTheme();
  const accentColor = theme === "dark" ? "#892FFF" : "#FF932C";

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
                <Menu size={18} className="text-muted-foreground hover:text-foreground" />
              </Button>
            </DrawerTrigger>
            <DrawerContent 
              className="max-h-[85vh] overflow-hidden flex flex-col p-0 border-t-2"
              style={{ borderTopColor: accentColor }}
            >
              <DrawerTitle className="sr-only">Lesson Navigator</DrawerTitle>
              <div className="p-6 border-b flex items-center justify-between bg-muted/10">
                <div>
                  <h3 className="text-xl font-bold tracking-tight">Curriculum</h3>
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
                    lessons={lessons.map((lesson: any) => ({
                      _id: lesson._id?.toString(),
                      title: lesson.title,
                      description: lesson.description,
                    }))}
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
            <span className="text-xs font-bold tracking-tight truncate">Slides</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
            {currentSlideIndex + 1} / {totalSlides || 1}
          </span>
        </div>
      </CardHeader>

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
              style={{ backgroundColor: activeTab === "content" ? accentColor : "transparent" }}
            >
              Content
            </TabsTrigger>
            {(codeBlocks.length > 0 || currentSlide.startingCode) && (
              <TabsTrigger 
                value="code" 
                className="text-xs px-4 rounded-full data-[state=active]:text-white transition-all duration-300 font-bold"
                style={{ backgroundColor: activeTab === "code" ? accentColor : "transparent" }}
              >
                Examples
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <TabsContent
          value="content"
          className="flex-1 overflow-hidden m-0 p-0 min-w-0 animate-in fade-in duration-300"
        >
          <div className="h-full scrollbar-hide">
            <IdeMarkdownPreview content={currentSlide.content || ""} />
          </div>
        </TabsContent>

        <TabsContent
          value="code"
          className="flex-1 overflow-hidden m-0 p-0 min-w-0 animate-in fade-in duration-300"
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
                      navigator.clipboard.writeText(currentSlide.startingCode || "");
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-muted-foreground" />}
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
                <p className="text-xs font-bold mt-2">No code snippets available</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <div className="p-4 bg-muted/5 border-t space-y-4 flex-shrink-0 min-w-0">
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousSlide}
            disabled={currentSlideIndex === 0}
            style={{ color: accentColor, borderColor: `${accentColor}33` }}
            className="rounded-full flex-1 h-9 font-bold text-xs hover:bg-background transition-all group"
          >
            <ChevronLeft size={16} className="mr-1 group-hover:-translate-x-0.5 transition-transform" /> 
            Back
          </Button>

          <Button
            variant="brand"
            size="sm"
            onClick={goToNextSlide}
            disabled={currentSlideIndex === totalSlides - 1}
            style={{ backgroundColor: accentColor }}
            className="rounded-full flex-[1.5] h-9 font-bold text-xs shadow-md transition-all group border-none"
          >
            {currentSlideIndex === totalSlides - 1 ? "Finished" : "Next Step"}
            <ChevronRight size={16} className="ml-1 group-hover:translate-x-0.5 transition-transform" />
          </Button>
        </div>

        <div className="relative pt-1">
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full transition-all duration-500 ease-out shadow-sm"
              style={{ 
                width: `${progress}%`,
                backgroundImage: `linear-gradient(to right, ${accentColor}, ${theme === 'dark' ? '#b794f4' : '#f6ad55'})` 
              }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
