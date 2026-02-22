"use client";

import { useState, useMemo } from "react";
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
import IdeConsole from "./ide-console";
import IdeNotesPanel from "./ide-notes-panel";
import {
  Book,
  Code,
  Play,
  Bot,
  Terminal,
  Loader2,
} from "lucide-react";
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
}) {
  const { theme } = useTheme();
  const isMobile = useMediaQuery("(max-width: 1000px)");
  const normalizedCourseLanguage = (courseLanguage || "web").toLowerCase();
  const isPythonCourse = normalizedCourseLanguage === "python";
  const isHtmlCourse = !isPythonCourse; // HTML/web courses
  const [activeTab, setActiveTab] = useState("editor");
  const [externalCode, setExternalCode] = useState<string | null>(null);
  const [isLoadingSavedCode, setIsLoadingSavedCode] = useState(false);

  // Internal mode state (when parent doesn't provide it)
  const [internalMode, setInternalMode] = useState<"ide" | "ai">("ide");
  const currentMode = onIdeModeChange ? ideMode : internalMode;

  const { toast } = useToast();

  const progressQuery = useQuery({
    queryKey: queryKeys.progress.byStudentAndCourse(
      studentId ?? "",
      courseId
    ),
    queryFn: () =>
      progressApi.getByStudentAndCourse(studentId!, courseId),
    enabled:
      !!studentId && !!courseId && studentId !== "guest",
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
                (entry: { lessonId?: { toString: () => string }; code?: string }) =>
                  entry.lessonId?.toString() === currentLessonId
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
      <div
        className="flex-1 flex overflow-hidden"
        style={{
          animation: "fadeIn 0.25s ease",
        }}
      >
        {isMobile ? (
          // Mobile: tabs for AI chat vs Notes
          <div className=" flex-1 flex flex-col min-w-0 p-2">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="h-full flex flex-col w-full"
            >
              <TabsList className="w-full justify-between bg-muted/50 p-1.5 rounded-full mb-3 border border-border/40">
                <TabsTrigger 
                  value="editor" 
                  className="flex-1 flex items-center justify-center gap-2 rounded-full py-2 data-[state=active]:text-white transition-all duration-300"
                  style={{ backgroundColor: activeTab === "editor" ? accentColor : "transparent" }}
                >
                  <Bot size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider">AI Chat</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="notes" 
                  className="flex-1 flex items-center justify-center gap-2 rounded-full py-2 data-[state=active]:text-white transition-all duration-300"
                  style={{ backgroundColor: activeTab === "notes" ? accentColor : "transparent" }}
                >
                  <Book size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider">My Notes</span>
                </TabsTrigger>
              </TabsList>
              <div className="flex-1 overflow-hidden">
                <TabsContent value="editor" className="h-full m-0 p-0">
                  <IdeAiAssistant
                    code={mainCode}
                    courseId={courseId}
                    lessonId={currentLessonId || ""}
                    studentId={studentId || "guest"}
                  />
                </TabsContent>
                <TabsContent value="notes" className="h-full m-0 p-0">
                  <IdeNotesPanel courseId={courseId} studentId={studentId} />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        ) : (
          // Desktop: AI (65%) + Notes (35%) side by side
          <ResizablePanelGroup direction="horizontal" className="h-full w-full">
            <ResizablePanel defaultSize={65} minSize={45} className="overflow-hidden">
              <IdeAiAssistant
                code={mainCode}
                courseId={courseId}
                lessonId={currentLessonId || ""}
                studentId={studentId || "guest"}
              />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={35} minSize={25} className="overflow-hidden">
              <IdeNotesPanel courseId={courseId} studentId={studentId} />
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>
    );
  }

  // ─── IDE MODE SCREEN ───────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ animation: "fadeIn 0.25s ease" }}
    >
      <div className="flex-1 overflow-hidden relative min-w-0 p-2 bg-muted/10" data-ide-workspace="true">
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
                style={{ backgroundColor: activeTab === "slides" ? accentColor : "transparent" }}
              >
                <Book size={16} />
                <span className="text-[10px] font-bold uppercase tracking-tight">Slides</span>
              </TabsTrigger>
              <TabsTrigger 
                value="editor" 
                className="flex items-center justify-center gap-1.5 rounded-full py-2 data-[state=active]:text-white transition-all duration-300"
                style={{ backgroundColor: activeTab === "editor" ? accentColor : "transparent" }}
              >
                <Code size={16} />
                <span className="text-[10px] font-bold uppercase tracking-tight">Editor</span>
              </TabsTrigger>
              <TabsTrigger 
                value="preview" 
                className="flex items-center justify-center gap-1.5 rounded-full py-2 data-[state=active]:text-white transition-all duration-300"
                style={{ backgroundColor: activeTab === "preview" ? accentColor : "transparent" }}
              >
                {isPythonCourse ? <Terminal size={16} /> : <Play size={16} />}
                <span className="text-[10px] font-bold uppercase tracking-tight">
                  {isPythonCourse ? "Console" : "Preview"}
                </span>
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden">
              <TabsContent value="slides" className="h-full m-0 p-0">
                <IdeSlides
                  slides={slides}
                  courseId={courseId}
                  lessons={lessons}
                  currentLessonId={currentLessonId}
                  onSelectLesson={onSelectLesson}
                  initialSlideIndex={initialSlideIndex}
                  onSlideChange={onSlideChange}
                />
              </TabsContent>

              <TabsContent value="editor" className="h-full m-0 p-0">
                <IdeEditor
                  setMainCode={setMainCode}
                  startingCode={getStartingCode()}
                  externalCode={externalCode}
                  courseLanguage={courseLanguage}
                  onLoadMyCode={handleLoadMyCode}
                  isLoadingSavedCode={isLoadingSavedCode}
                />
              </TabsContent>

              <TabsContent value="preview" className="h-full m-0 p-0">
                {isPythonCourse ? (
                  <IdeConsole code={mainCode} courseLanguage={courseLanguage} />
                ) : (
                  <IdePreview mainCode={mainCode} />
                )}
              </TabsContent>
            </div>
          </Tabs>
        ) : (
          <ResizablePanelGroup direction="horizontal" className="h-full min-w-0 gap-2">
            {currentLayout !== "focus" && (
              <>
                <ResizablePanel
                  defaultSize={layoutSizes[0]}
                  minSize={15}
                  className="min-w-0 overflow-hidden"
                >
                  <IdeSlides
                    slides={slides}
                    courseId={courseId}
                    lessons={lessons}
                    currentLessonId={currentLessonId}
                    onSelectLesson={onSelectLesson}
                    initialSlideIndex={initialSlideIndex}
                    onSlideChange={onSlideChange}
                  />
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
