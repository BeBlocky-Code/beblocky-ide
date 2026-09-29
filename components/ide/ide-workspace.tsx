"use client";

import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "./context/theme-provider";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import useMediaQuery from "@/hooks/use-mobile";
import IdeSlides from "./ide-slides";
import IdeEditor from "./ide-editor";
import IdePreview from "./ide-preview";
import IdeAiAssistant from "./ide-ai-assistant";
import IdeConsole, { type IdeConsoleHandle } from "./ide-console";
import IdeNotesPanel from "./ide-notes-panel";
import { Book, Code, Play, Bot, Terminal, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ILesson } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { progressApi } from "@/lib/api/progress";
import { queryKeys } from "@/lib/query-keys";

export default function IdeWorkspace({
  slides,
  courseId,
  courseLanguage,
  mainCode,
  setMainCode,
  lessons,
  currentLessonId,
  onSelectLesson,
  currentLayout,
  initialSlideIndex = 0,
  onSlideChange,
  studentId,
  ideMode = "ide",
  onIdeModeChange,
  consoleRef,
}: {
  slides: any[];
  courseId: string;
  courseLanguage?: string;
  mainCode: string;
  setMainCode: (code: string) => void;
  lessons?: ILesson[];
  currentLessonId?: string;
  onSelectLesson?: (lessonId: string) => void;
  currentLayout: string;
  initialSlideIndex?: number;
  onSlideChange?: (slideIndex: number) => void;
  studentId?: string;
  ideMode?: "ide" | "ai";
  onIdeModeChange?: (mode: "ide" | "ai") => void;
  consoleRef?: React.Ref<IdeConsoleHandle>;
}) {
  const { theme } = useTheme();
  const isMobile = useMediaQuery("(max-width: 1000px)");
  const normalizedCourseLanguage = (courseLanguage || "web").toLowerCase();
  const isPythonCourse = normalizedCourseLanguage === "python";
  const isHtmlCourse = !isPythonCourse; // HTML/web courses
  const [activeTab, setActiveTab] = useState("editor");
  const [aiMainActiveTab, setAiMainActiveTab] = useState("editor");
  const [externalCode, setExternalCode] = useState<string | null>(null);
  const [isLoadingSavedCode, setIsLoadingSavedCode] = useState(false);

  // Internal mode state (when parent doesn't provide it)
  const [internalMode, setInternalMode] = useState<"ide" | "ai">("ide");
  const currentMode = onIdeModeChange ? ideMode : internalMode;

  // Persisted AI State
  const [aiActiveTab, setAiActiveTab] = useState("chat");
  const [aiMessages, setAiMessages] = useState<any[]>([]);
  const [selectedConversationId, setSelectedConversationId] =
    useState<string>("");
  const [isConversationSidebarOpen, setIsConversationSidebarOpen] =
    useState(false);
  const [aiInputValue, setAiInputValue] = useState("");
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [typedMessages, setTypedMessages] = useState<Set<string>>(new Set());

  // Ref to prevent re-initialization of IdeEditor's internal code state
  const editorCodeRef = useRef(mainCode);
  useEffect(() => {
    editorCodeRef.current = mainCode;
  }, [mainCode]);

  const { toast } = useToast();

  const innerConsoleRef = useRef<IdeConsoleHandle>(null);

  const runFromShortcut = useCallback(() => {
    if (isMobile && isPythonCourse) {
      setActiveTab("preview");
    }
    innerConsoleRef.current?.run();
  }, [isMobile, isPythonCourse]);

  useEffect(() => {
    if (!consoleRef) return;
    const handle: IdeConsoleHandle = { run: runFromShortcut };
    if (typeof consoleRef === "function") {
      consoleRef(handle);
      return () => {
        void consoleRef(null);
      };
    }
    const refObj =
      consoleRef as React.MutableRefObject<IdeConsoleHandle | null>;
    refObj.current = handle;
    return () => {
      refObj.current = null;
    };
  }, [consoleRef, runFromShortcut]);

  const progressQuery = useQuery({
    queryKey: queryKeys.progress.byStudentAndCourse(studentId ?? "", courseId),
    queryFn: () => progressApi.getByStudentAndCourse(studentId!, courseId),
    enabled: !!studentId && !!courseId && studentId !== "guest",
    staleTime: 5 * 60 * 1000,
  });

  // IDE layout sizes
  const layoutSizes = useMemo(() => {
    if (isMobile) return [100];
    switch (currentLayout) {
      case "standard":
        return [35, 35, 30];
      case "split":
        return [18, 32, 50];
      case "focus":
        return [0, 85, 15];
      default:
        return [40, 35, 25];
    }
  }, [isMobile, currentLayout]);

  // Lessons with completion status from completedLessons / completedSlides
  const lessonsWithStatus = useMemo(() => {
    if (!lessons) return [];
    const progress = progressQuery.data as {
      completedLessons?:
        | Record<string, { isCompleted?: boolean }>
        | Map<string, { isCompleted?: boolean }>;
      completedSlides?:
        | Record<string, { isCompleted?: boolean; lessonId?: string }>
        | Map<string, { isCompleted?: boolean; lessonId?: string }>;
      completionPercentage?: number;
    } | null;

    const completedLessonsRaw = progress?.completedLessons;
    const completedLessonsRecord: Record<string, { isCompleted?: boolean }> =
      completedLessonsRaw instanceof Map
        ? Object.fromEntries(completedLessonsRaw.entries())
        : (completedLessonsRaw as Record<string, { isCompleted?: boolean }>) ||
          {};

    const completedSlidesRaw = progress?.completedSlides;
    const completedSlidesRecord: Record<
      string,
      { isCompleted?: boolean; lessonId?: string }
    > =
      completedSlidesRaw instanceof Map
        ? Object.fromEntries(completedSlidesRaw.entries())
        : (completedSlidesRaw as Record<
            string,
            { isCompleted?: boolean; lessonId?: string }
          >) || {};

    return lessons.map((lesson) => {
      const lessonId =
        (lesson as any)._id?.toString() || (lesson as any).id?.toString();

      const lessonMarkedComplete =
        !!completedLessonsRecord[lessonId]?.isCompleted;

      const lessonSlideIds = (
        ((lesson as any).slides as any[]) || []
      )
        .map((s) => s?._id?.toString?.() || s?.toString?.())
        .filter(Boolean) as string[];

      const allSlidesDone =
        lessonSlideIds.length > 0 &&
        lessonSlideIds.every(
          (slideId) => completedSlidesRecord[slideId]?.isCompleted,
        );

      let status: "completed" | "in-progress" | "locked" = "locked";
      if (lessonMarkedComplete || allSlidesDone) status = "completed";
      else if (lessonId === currentLessonId) status = "in-progress";
      else if (
        lessonSlideIds.some(
          (slideId) => completedSlidesRecord[slideId]?.isCompleted,
        )
      ) {
        status = "in-progress";
      }

      return {
        ...lesson,
        status,
      };
    });
  }, [lessons, progressQuery.data, currentLessonId]);

  const slideProgressStats = useMemo(() => {
    const progress = progressQuery.data as {
      completionPercentage?: number;
      completedSlides?: Record<string, { isCompleted?: boolean }> | Map<string, unknown>;
    } | null;

    const slidesRaw = progress?.completedSlides;
    const slidesRecord =
      slidesRaw instanceof Map
        ? Object.fromEntries(slidesRaw.entries())
        : slidesRaw || {};
    const completedSlides = Object.values(slidesRecord).filter(
      (s: any) => s?.isCompleted,
    ).length;

    const totalSlides = (lessons || []).reduce((sum, lesson) => {
      const count = ((lesson as any).slides as any[])?.length || 0;
      return sum + count;
    }, 0);

    const percentage =
      typeof progress?.completionPercentage === "number"
        ? progress.completionPercentage
        : totalSlides > 0
          ? (completedSlides / totalSlides) * 100
          : 0;

    return { percentage, completedSlides, totalSlides };
  }, [progressQuery.data, lessons]);

  const getStartingCode = () => {
    const firstSlide = slides?.[0];
    return firstSlide?.startingCode || "";
  };

  const handleLoadMyCode = async () => {
    if (!studentId || studentId === "guest") {
      toast({
        title: "Sign in required",
        description: "Please sign in to load your saved progress.",
        variant: "destructive",
      });
      return;
    }

    if (!currentLessonId) {
      toast({
        title: "Select a lesson",
        description: "Choose a lesson before loading saved code.",
      });
      return;
    }

    setIsLoadingSavedCode(true);

    try {
      const { data: progress } = await progressQuery.refetch();
      if (!progress) {
        toast({
          title: "No saved code",
          description: "We couldn't find any saved code for this lesson yet.",
        });
        return;
      }

      const lessonCode =
        (progress as any)?.lessonCode?.[currentLessonId]?.code ||
        (Array.isArray((progress as any)?.progress)
          ? (progress as any)?.progress
              ?.slice()
              ?.reverse()
              ?.find(
                (entry: {
                  lessonId?: { toString: () => string };
                  code?: string;
                }) => entry.lessonId?.toString() === currentLessonId,
              )?.code
          : "");

      if (lessonCode) {
        setExternalCode(lessonCode);
        setMainCode(lessonCode);
        toast({
          title: "Code loaded",
          description: "Your saved code has been restored in the editor.",
        });
      } else {
        toast({
          title: "No saved code",
          description: "We couldn't find any saved code for this lesson yet.",
        });
      }
    } catch (err) {
      console.error("Failed to load saved code:", err);
      toast({
        title: "Load failed",
        description: "We couldn't load your saved code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSavedCode(false);
    }
  };

  const accentColor = theme === "dark" ? "#892FFF" : "#FF932C";

  // ─── AI MODE SCREEN ────────────────────────────────────────────────────────
  if (currentMode === "ai") {
    return (
      <div className="h-full w-full flex flex-col overflow-hidden bg-muted/10 p-2">
        {isMobile ? (
          // Mobile: pill toggle outside card (like IDE mode), then bordered content
          <Tabs
            value={aiMainActiveTab}
            onValueChange={setAiMainActiveTab}
            className="h-full flex flex-col w-full min-w-0"
          >
            <TabsList className="w-full grid grid-cols-2 bg-muted/50 p-1.5 rounded-full mb-3 border border-border/40">
              <TabsTrigger
                value="editor"
                className="flex items-center justify-center gap-1.5 rounded-full py-2 data-[state=active]:text-white transition-all duration-300 font-bold"
                style={{
                  backgroundColor:
                    aiMainActiveTab === "editor" ? accentColor : "transparent",
                }}
              >
                <Bot size={16} />
                <span className="text-[10px] font-bold uppercase tracking-tight">
                  AI Utilities
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="notes"
                className="flex items-center justify-center gap-1.5 rounded-full py-2 data-[state=active]:text-white transition-all duration-300 font-bold"
                style={{
                  backgroundColor:
                    aiMainActiveTab === "notes" ? accentColor : "transparent",
                }}
              >
                <Book size={16} />
                <span className="text-[10px] font-bold uppercase tracking-tight">
                  My Notes
                </span>
              </TabsTrigger>
            </TabsList>
            <div className="flex-1 min-h-0 flex flex-col bg-card border border-border rounded-xl overflow-hidden shadow-sm">
              <TabsContent value="editor" className="h-full m-0 p-0 flex-1">
                <IdeAiAssistant
                  code={mainCode}
                  courseId={courseId}
                  lessonId={currentLessonId || ""}
                  studentId={studentId || "guest"}
                  persistedState={{
                    activeTab: aiActiveTab,
                    setActiveTab: setAiActiveTab,
                    messages: aiMessages,
                    setMessages: setAiMessages,
                    selectedConversationId,
                    setSelectedConversationId,
                    isConversationSidebarOpen,
                    setIsConversationSidebarOpen,
                    inputValue: aiInputValue,
                    setInputValue: setAiInputValue,
                    isThinking: isAiThinking,
                    setIsThinking: setIsAiThinking,
                    typedMessages,
                    setTypedMessages,
                  }}
                />
              </TabsContent>
              <TabsContent value="notes" className="h-full m-0 p-0 flex-1">
                <IdeNotesPanel courseId={courseId} studentId={studentId} />
              </TabsContent>
            </div>
          </Tabs>
        ) : (
          // Desktop: AI (65%) + Notes (35%) side by side
          <ResizablePanelGroup
            direction="horizontal"
            className="h-full w-full gap-2"
          >
            <ResizablePanel
              defaultSize={65}
              minSize={45}
              className="h-full bg-card border border-border rounded-xl overflow-hidden shadow-sm"
            >
              <IdeAiAssistant
                code={mainCode}
                courseId={courseId}
                lessonId={currentLessonId || ""}
                studentId={studentId || "guest"}
                persistedState={{
                  activeTab: aiActiveTab,
                  setActiveTab: setAiActiveTab,
                  messages: aiMessages,
                  setMessages: setAiMessages,
                  selectedConversationId,
                  setSelectedConversationId,
                  isConversationSidebarOpen,
                  setIsConversationSidebarOpen,
                  inputValue: aiInputValue,
                  setInputValue: setAiInputValue,
                  isThinking: isAiThinking,
                  setIsThinking: setIsAiThinking,
                  typedMessages,
                  setTypedMessages,
                }}
              />
            </ResizablePanel>
            <ResizableHandle
              withHandle
              className="bg-border/20 w-1 hover:bg-primary/20 transition-colors"
            />
            <ResizablePanel
              defaultSize={35}
              minSize={25}
              className="h-full bg-card border border-border rounded-xl overflow-hidden shadow-sm"
            >
              <IdeNotesPanel courseId={courseId} studentId={studentId} />
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>
    );
  }

  // ─── IDE MODE SCREEN ───────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div
        className="flex-1 overflow-hidden relative min-w-0 p-2 bg-muted/10"
        data-ide-workspace="true"
      >
        {isMobile ? (
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="h-full flex flex-col min-w-0"
          >
            <TabsList className="w-full grid grid-cols-3 bg-muted/50 p-1.5 rounded-full mb-3 border border-border/40">
              <TabsTrigger
                value="slides"
                className="flex items-center justify-center gap-1.5 rounded-full py-2 data-[state=active]:text-white transition-all duration-300"
                style={{
                  backgroundColor:
                    activeTab === "slides" ? accentColor : "transparent",
                }}
              >
                <Book size={16} />
                <span className="text-[10px] font-bold uppercase tracking-tight">
                  Slides
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="editor"
                className="flex items-center justify-center gap-1.5 rounded-full py-2 data-[state=active]:text-white transition-all duration-300"
                style={{
                  backgroundColor:
                    activeTab === "editor" ? accentColor : "transparent",
                }}
              >
                <Code size={16} />
                <span className="text-[10px] font-bold uppercase tracking-tight">
                  Editor
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="preview"
                className="flex items-center justify-center gap-1.5 rounded-full py-2 data-[state=active]:text-white transition-all duration-300"
                style={{
                  backgroundColor:
                    activeTab === "preview" ? accentColor : "transparent",
                }}
              >
                {isPythonCourse ? <Terminal size={16} /> : <Play size={16} />}
                <span className="text-[10px] font-bold uppercase tracking-tight">
                  {isPythonCourse ? "Console" : "Preview"}
                </span>
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden">
              <TabsContent value="slides" className="h-full m-0 p-0 overflow-auto">
                <IdeSlides
                  slides={slides}
                  courseId={courseId}
                  lessons={lessonsWithStatus}
                  currentLessonId={currentLessonId}
                  onSelectLesson={onSelectLesson}
                  initialSlideIndex={initialSlideIndex}
                  onSlideChange={onSlideChange}
                  courseProgress={slideProgressStats}
                />
              </TabsContent>

              <TabsContent value="editor" className="h-full m-0 p-0">
                <IdeEditor
                  setMainCode={setMainCode}
                  defaultValue={mainCode}
                  startingCode={getStartingCode()}
                  externalCode={externalCode}
                  courseLanguage={courseLanguage}
                  onLoadMyCode={handleLoadMyCode}
                  isLoadingSavedCode={isLoadingSavedCode}
                />
              </TabsContent>

              <TabsContent
                value="preview"
                className="h-full m-0 p-0"
                forceMount={isPythonCourse ? true : undefined}
              >
                {isPythonCourse ? (
                  <IdeConsole
                    ref={innerConsoleRef}
                    code={mainCode}
                    courseLanguage={courseLanguage}
                  />
                ) : (
                  <IdePreview mainCode={mainCode} />
                )}
              </TabsContent>
            </div>
          </Tabs>
        ) : (
          <ResizablePanelGroup
            direction="horizontal"
            className="h-full min-w-0 gap-2"
          >
            {currentLayout !== "focus" && (
              <>
                <ResizablePanel
                  defaultSize={layoutSizes[0]}
                  minSize={15}
                  className="min-w-0 overflow-hidden"
                >
                  <div className="h-full overflow-auto">
                  <IdeSlides
                    slides={slides}
                    courseId={courseId}
                    lessons={lessonsWithStatus}
                    currentLessonId={currentLessonId}
                    onSelectLesson={onSelectLesson}
                    initialSlideIndex={initialSlideIndex}
                    onSlideChange={onSlideChange}
                    courseProgress={slideProgressStats}
                  />
                  </div>
                </ResizablePanel>
                <ResizableHandle withHandle />
              </>
            )}

            <ResizablePanel
              defaultSize={layoutSizes[1]}
              minSize={25}
              className="min-w-0 overflow-hidden"
            >
              <IdeEditor
                setMainCode={setMainCode}
                defaultValue={mainCode}
                startingCode={getStartingCode()}
                externalCode={externalCode}
                courseLanguage={courseLanguage}
                onLoadMyCode={handleLoadMyCode}
                isLoadingSavedCode={isLoadingSavedCode}
              />
            </ResizablePanel>

            <ResizableHandle withHandle />
            <ResizablePanel
              defaultSize={layoutSizes[2]}
              minSize={15}
              className="min-w-0 overflow-hidden"
            >
              {isPythonCourse ? (
                <IdeConsole
                  ref={innerConsoleRef}
                  code={mainCode}
                  courseLanguage={courseLanguage}
                />
              ) : (
                <IdePreview mainCode={mainCode} />
              )}
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>
    </div>
  );
}
