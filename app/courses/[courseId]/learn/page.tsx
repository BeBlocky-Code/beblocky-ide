"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import IdeWorkspace from "@/components/ide/ide-workspace";
import IdeKeyboardShortcuts from "@/components/ide/ide-keyboard-shortcuts";
import { ThemeProvider } from "@/components/ide/context/theme-provider";
import { CoinProvider } from "@/components/ide/context/coin-context";
import { SettingsProvider } from "@/components/ide/context/settings-context";
import { AIProvider } from "@/components/ide/context/ai-context";
import IdeHeader from "@/components/ide/ide-header";
import IdeSettingsPanel from "@/components/ide/ide-settings-panel";
import { AuthProvider } from "@/components/context/auth-context";
import { getCourseWithContent } from "@/lib/api";
import { progressApi } from "@/lib/api/progress";
import { ILesson, ISlide } from "@/types";
import { generateInitials, decryptCourseId } from "@/lib/utils";
import { UserRole } from "@/types/user";
import { IStudentProgress, IProgress } from "@/types/progress";
import IdeLoadingSkeleton from "@/components/ide/ide-loading";
import { studentApi } from "@/lib/api/student";
import { useSession } from "@/lib/auth-client";
import { queryKeys } from "@/lib/query-keys";

interface UserData {
  _id: string;
  id: string;
  name: string;
  email: string;
  initials: string;
  role: UserRole;
  progress: Record<string, unknown>;
  preferences: Record<string, unknown>;
  emailVerified: boolean;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

export default function LearnPage() {
  const params = useParams();
  const encryptedCourseId = params.courseId as string;
  const realCourseId = useMemo(
    () =>
      encryptedCourseId ? decryptCourseId(encryptedCourseId) : "",
    [encryptedCourseId],
  );
  const { data: session, isPending: isSessionPending } = useSession();
  const { toast } = useToast();

  const [mainCode, setMainCode] = useState<string>("");
  const [courseLanguage, setCourseLanguage] = useState<string>("web");
  const [currentLayout, setCurrentLayout] = useState<string>("standard");
  const [currentLessonId, setCurrentLessonId] = useState<string>("");
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [currentSlides, setCurrentSlides] = useState<ISlide[]>([]);
  const [allLessons, setAllLessons] = useState<ILesson[]>([]);
  const [currentCourseTitle, setCurrentCourseTitle] = useState<string>("");
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [userProgress, setUserProgress] = useState<IStudentProgress | null>(
    null,
  );
  const [ideMode, setIdeMode] = useState<"ide" | "ai">("ide");
  const [studentId, setStudentId] = useState<string | null>(null);
  const [timeSpent, setTimeSpent] = useState<number>(0);
  const [lastSavedCode, setLastSavedCode] = useState<string>("");
  const userProgressRef = useRef(userProgress);
  userProgressRef.current = userProgress;
  const isMountedRef = useRef(true);
  const layoutTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInitializedFromQueries = useRef(false);
  const queryClient = useQueryClient();

  // Refs to avoid stale closures in interval callback
  const resolvedStudentIdRef = useRef<string | null>(null);
  const courseIdRef = useRef<string>(realCourseId);
  // Accumulate minutes in a ref to avoid re-renders every 60s; only sync to state periodically when visible
  const timeSpentMinutesRef = useRef(0);

  // Cached queries: course by realCourseId, student by session user id
  const courseQuery = useQuery({
    queryKey: queryKeys.courses.withContent(realCourseId),
    queryFn: () => getCourseWithContent(realCourseId),
    enabled: !!realCourseId,
    staleTime: 5 * 60 * 1000,
  });
  const studentQuery = useQuery({
    queryKey: queryKeys.students.byUserId(session?.user?.id ?? ""),
    queryFn: () => studentApi.getByUserId(session!.user!.id),
    enabled: !!session?.user?.id,
  });
  const resolvedStudentId = studentQuery.data?._id?.toString() ?? null;

  // Keep refs in sync with current values to avoid stale closures in interval
  useEffect(() => {
    resolvedStudentIdRef.current = resolvedStudentId;
  }, [resolvedStudentId]);

  useEffect(() => {
    courseIdRef.current = realCourseId;
  }, [realCourseId]);

  const progressQuery = useQuery({
    queryKey: queryKeys.progress.byStudentAndCourse(
      resolvedStudentId ?? "",
      realCourseId,
    ),
    queryFn: () =>
      progressApi.getByStudentAndCourse(resolvedStudentId!, realCourseId),
    enabled: !!resolvedStudentId && !!realCourseId,
    staleTime: 5 * 60 * 1000, // 5 minutes - reduce refetches and re-renders
  });

  const sortSlidesByOrder = (slides: ISlide[]) => {
    const toOrder = (s: any) => {
      const n = Number(s?.order);
      return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
    };
    const toTime = (s: any) => {
      const t = new Date(s?.updatedAt || s?.createdAt || 0).getTime();
      return Number.isFinite(t) ? t : 0;
    };

    return (slides || []).slice().sort((a, b) => {
      const orderDiff = toOrder(a) - toOrder(b);
      if (orderDiff !== 0) return orderDiff;
      const timeDiff = toTime(a) - toTime(b);
      if (timeDiff !== 0) return timeDiff;
      return String((a as any)?._id || "").localeCompare(
        String((b as any)?._id || ""),
      );
    });
  };

  // Sync timeSpentMinutesRef when we load progress so display is correct
  useEffect(() => {
    if (progressQuery.data?.timeSpent != null) {
      const minutes = Number(progressQuery.data.timeSpent);
      if (Number.isFinite(minutes)) timeSpentMinutesRef.current = minutes;
    }
  }, [progressQuery.data?.timeSpent]);

  // Time tracking: only re-render when tab is visible and at most every 5 minutes
  useEffect(() => {
    const tickMs = 60000; // 1 minute
    const updateDisplayInterval = 5; // only setState every 5 minutes to avoid 60s re-renders

    const interval = setInterval(() => {
      const isVisible =
        typeof document !== "undefined" &&
        document.visibilityState === "visible";
      timeSpentMinutesRef.current += 1;
      const minutes = timeSpentMinutesRef.current;
      const progress = userProgressRef.current;

      // API: update progress every 60 minutes (unchanged)
      if (progress?._id && minutes % 60 === 0) {
        progressApi
          .updateTimeSpent(progress._id, {
            minutes: 1,
            lastAccessed: new Date().toISOString(),
          })
          .then(() => {
            const currentStudentId = resolvedStudentIdRef.current;
            const currentCourseId = courseIdRef.current;
            if (currentStudentId && currentCourseId) {
              queryClient.invalidateQueries({
                queryKey: queryKeys.progress.byStudentAndCourse(
                  currentStudentId,
                  currentCourseId,
                ),
              });
            }
          })
          .catch(() => {});
      }

      // Only trigger re-render when tab is visible and every 5 minutes (timeSpent is in seconds)
      if (isVisible && minutes % updateDisplayInterval === 0) {
        setTimeSpent(minutes * 60);
      }
    }, tickMs);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        setTimeSpent(timeSpentMinutesRef.current * 60);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [queryClient]);

  const invalidCourseId = !!encryptedCourseId && !realCourseId;
  const noSession = !isSessionPending && !session?.user;
  const isLoadingInitial =
    isSessionPending ||
    (courseQuery.isLoading && !!realCourseId) ||
    (!!session?.user?.id && studentQuery.isLoading) ||
    (!!resolvedStudentId && progressQuery.isLoading);
  const hasError =
    invalidCourseId ||
    noSession ||
    courseQuery.isError ||
    (!!session?.user && studentQuery.isError && !studentQuery.data);
  const errorMessage = invalidCourseId
    ? "Invalid course link. Please open the course from the learning portal."
    : noSession
      ? "Please sign in to continue. Open the course from the learning portal."
      : courseQuery.error != null
        ? "Failed to load course."
        : !!session?.user && studentQuery.error != null
          ? "Failed to load your profile."
          : null;

  // Sync state from query data and derive userData
  const courseData = courseQuery.data;
  const progressData = progressQuery.data as IStudentProgress | undefined;

  // Derive user data from session + student (no email in URL)
  const derivedUserData = useMemo<UserData | null>(() => {
    if (session?.user && studentQuery.data) {
      const u = session.user;
      return {
        _id: resolvedStudentId || u.id,
        id: resolvedStudentId || u.id,
        name: u.name ?? "",
        email: u.email ?? "",
        initials: generateInitials(u.name ?? u.email ?? "", u.email),
        role: UserRole.STUDENT,
        progress: {},
        preferences: {},
        emailVerified: true,
        createdAt: new Date(0),
        updatedAt: new Date(0),
      };
    }
    if (session?.user && !studentQuery.isLoading && studentQuery.isError) {
      const u = session.user;
      return {
        _id: u.id,
        id: u.id,
        name: u.name ?? "",
        email: u.email ?? "",
        initials: generateInitials(u.name ?? u.email ?? "", u.email),
        role: UserRole.STUDENT,
        progress: {},
        preferences: {},
        emailVerified: true,
        createdAt: new Date(0),
        updatedAt: new Date(0),
      };
    }
    return null;
  }, [
    session?.user,
    studentQuery.data,
    studentQuery.isLoading,
    studentQuery.isError,
    resolvedStudentId,
  ]);

  // Sync initial UI state from queries (once per realCourseId + user ready)
  useEffect(() => {
    if (
      !realCourseId ||
      !courseData ||
      hasInitializedFromQueries.current
    )
      return;
    const userReady =
      derivedUserData != null ||
      (!!session?.user && studentQuery.isError);
    const progressReady =
      !resolvedStudentId || progressQuery.isSuccess || progressQuery.isError;
    if (!userReady || !progressReady) return;

    hasInitializedFromQueries.current = true;

    setCurrentCourseTitle(courseData.courseTitle ?? "");
    setAllLessons((courseData.lessons as unknown as ILesson[]) || []);
    const languageCandidate = String(
      (courseData as any)?.courseLanguage ||
        (courseData as any)?.language ||
        "web",
    ).toLowerCase();
    setCourseLanguage(
      ["python", "javascript", "typescript", "html", "web"].includes(
        languageCandidate,
      )
        ? languageCandidate
        : "web",
    );

    if (courseData.lessons && courseData.lessons.length > 0) {
      let targetLesson = courseData.lessons[0];
      let targetSlideIndex = 0;
      const initialSlides =
        (courseData.lessons[0].slides as unknown as ISlide[]) || [];
      const sortedInitialSlides = sortSlidesByOrder(initialSlides);
      let targetCode = sortedInitialSlides?.[0]?.startingCode || "";

      if (progressData?.progress && progressData.progress.length > 0) {
        const lastProgress =
          progressData.progress[progressData.progress.length - 1];
        if (lastProgress.lessonId) {
          const lessonId = lastProgress.lessonId.toString();
          const targetLessonFound = courseData.lessons?.find(
            (l: any) => l._id?.toString() === lessonId,
          );
          if (targetLessonFound) {
            const slides =
              (targetLessonFound.slides as unknown as ISlide[]) || [];
            const sortedSlides = sortSlidesByOrder(slides);
            targetLesson = targetLessonFound;
            setCurrentLessonId(lessonId);
            setCurrentSlides(sortedSlides);
            if (lastProgress.slideId) {
              const slideIndex = sortedSlides.findIndex(
                (s) => s._id?.toString() === lastProgress.slideId?.toString(),
              );
              if (slideIndex !== -1) {
                targetSlideIndex = slideIndex;
                targetCode =
                  (lastProgress as any).code ||
                  sortedSlides[slideIndex]?.startingCode ||
                  "";
              } else {
                targetCode =
                  (lastProgress as any).code ||
                  sortedSlides[0]?.startingCode ||
                  "";
              }
            } else {
              targetCode =
                (lastProgress as any).code ||
                sortedSlides[0]?.startingCode ||
                "";
            }
          }
        }
      } else {
        setCurrentLessonId(targetLesson._id?.toString() || "");
        setCurrentSlides(sortedInitialSlides);
      }

      setCurrentSlideIndex(targetSlideIndex);
      setMainCode(targetCode);
      setLastSavedCode(targetCode);
    }

    if (derivedUserData) setUserData(derivedUserData);
    setStudentId(resolvedStudentId);
    if (progressData) {
      setUserProgress(progressData);
      if (progressData.timeSpent != null) {
        const mins = Number(progressData.timeSpent);
        if (Number.isFinite(mins)) {
          timeSpentMinutesRef.current = mins;
          setTimeSpent(mins * 60);
        }
      }
    }
  }, [
    realCourseId,
    courseData,
    progressData,
    derivedUserData?.id,
    resolvedStudentId,
    session?.user,
    studentQuery.isError,
    progressQuery.isSuccess,
    progressQuery.isError,
  ]);

  // Reset init flag when course changes so we re-sync
  useEffect(() => {
    hasInitializedFromQueries.current = false;
  }, [realCourseId]);

  // Keep userProgress in sync when progress query refetches (e.g. after mutation)
  useEffect(() => {
    if (progressQuery.data)
      setUserProgress(progressQuery.data as IStudentProgress);
  }, [progressQuery.data]);

  // Update student activity on load (fire-and-forget)
  useEffect(() => {
    if (
      !derivedUserData ||
      derivedUserData.id === "guest" ||
      !resolvedStudentId
    )
      return;
    studentApi
      .updateActivity(resolvedStudentId, {
        lastCodingActivity: new Date().toISOString(),
      })
      .catch(() => {});
  }, [derivedUserData?.id, resolvedStudentId]);

  const invalidateProgress = () => {
    if (resolvedStudentId && realCourseId)
      queryClient.invalidateQueries({
        queryKey: queryKeys.progress.byStudentAndCourse(
          resolvedStudentId,
          realCourseId,
        ),
      });
  };

  const progressUpdateTimeSpentMutation = useMutation({
    mutationFn: (args: {
      id: string;
      data: { slideId?: string; timeSpent?: number; lastAccessed?: string };
    }) => progressApi.updateTimeSpent(args.id, args.data),
    onSuccess: invalidateProgress,
  });
  const progressCreateMutation = useMutation({
    mutationFn: (data: Parameters<typeof progressApi.create>[0]) =>
      progressApi.create(data),
    onSuccess: invalidateProgress,
  });

  // Clear layout-change timeout on unmount
  useEffect(() => {
    return () => {
      if (layoutTimeoutRef.current) {
        clearTimeout(layoutTimeoutRef.current);
        layoutTimeoutRef.current = null;
      }
    };
  }, []);

  // Handle slide changes
  const handleSlideChange = async (slideIndex: number) => {
    setCurrentSlideIndex(slideIndex);

    if (userData?.id !== "guest" && userData?.role === UserRole.STUDENT) {
      const currentSlide = currentSlides[slideIndex];
      if (!currentSlide) return;
      const existingProgress = userProgress?.progress?.find(
        (p: { lessonId?: { toString: () => string } }) =>
          p.lessonId?.toString() === currentLessonId,
      );

      if (existingProgress) {
        progressUpdateTimeSpentMutation.mutate({
          id: existingProgress._id?.toString() || "",
          data: {
            slideId: currentSlide._id?.toString(),
            timeSpent: existingProgress.timeSpent || 0,
            lastAccessed: new Date().toISOString(),
          },
        });
      } else {
        progressCreateMutation.mutate({
          studentId: userData.id,
          courseId: realCourseId,
          lessonId: currentLessonId,
          slideId: currentSlide._id?.toString(),
          code: mainCode,
          timeSpent: 0,
          completed: false,
        });
      }
    }
  };

  // Handle lesson selection
  const handleSelectLesson = async (lessonId: string) => {
    setCurrentLessonId(lessonId);

    const selectedLesson = allLessons.find(
      (lesson) => lesson._id?.toString() === lessonId,
    );

    if (selectedLesson) {
      const slides = (selectedLesson.slides as unknown as ISlide[]) || [];
      const sortedSlides = sortSlidesByOrder(slides);
      setCurrentSlides(sortedSlides);
      setCurrentSlideIndex(0);
      const startingCode = sortedSlides[0]?.startingCode || "";
      setMainCode(startingCode);
      setLastSavedCode(startingCode);

      if (userData?.id !== "guest" && userData?.role === UserRole.STUDENT) {
        const existingProgress = userProgress?.progress?.find(
          (p: { lessonId?: { toString: () => string } }) =>
            p.lessonId?.toString() === lessonId,
        );

        if (existingProgress) {
          progressUpdateTimeSpentMutation.mutate({
            id: existingProgress._id?.toString() || "",
            data: {
              timeSpent: existingProgress.timeSpent || 0,
              lastAccessed: new Date().toISOString(),
            },
          });
        } else {
          progressCreateMutation.mutate({
            studentId: userData.id,
            courseId: realCourseId,
            lessonId: lessonId,
            code:
              (selectedLesson.slides as unknown as ISlide[])?.[0]
                ?.startingCode || "",
            timeSpent: 0,
            completed: false,
          });
        }
      }
    }
  };

  // Update the handleRunCode function to actually run the code
  const handleRunCode = () => {
    const consoleButton = document.querySelector(
      '[data-console-toggle="true"]',
    );
    if (consoleButton) {
      (consoleButton as HTMLElement).click();
    }
  };

  // Simple language detection based on code patterns
  const detectLanguage = (code: string): string => {
    const trimmedCode = code.trim().toLowerCase();

    // Check for Python patterns
    if (
      trimmedCode.includes("def ") &&
      trimmedCode.includes(":") &&
      trimmedCode.includes("import ")
    ) {
      return "python";
    }

    // Check for Java patterns
    if (
      trimmedCode.includes("public class") ||
      trimmedCode.includes("system.out.print")
    ) {
      return "java";
    }

    // Check for C/C++ patterns
    if (
      trimmedCode.includes("#include") ||
      trimmedCode.includes("printf(") ||
      trimmedCode.includes("cout")
    ) {
      return "cpp";
    }

    // Check for HTML patterns
    if (
      trimmedCode.includes("<html") ||
      trimmedCode.includes("<div") ||
      trimmedCode.includes("<script")
    ) {
      return "html";
    }

    // Check for CSS patterns
    if (
      trimmedCode.includes("{") &&
      trimmedCode.includes("}") &&
      trimmedCode.includes(":")
    ) {
      return "css";
    }

    // Default to JavaScript for web-based IDE
    return "javascript";
  };

  // Handle saving code with progress API integration
  const handleSaveCode = async (): Promise<void> => {
    const saveKey = `code-${realCourseId}-${currentLessonId}`;
    localStorage.setItem(saveKey, mainCode);

    const studentId = resolvedStudentId ?? undefined;
    const progress: IProgress | null =
      userProgress as unknown as IProgress | null;

    try {
      if (!studentId) {
        throw new Error("Student ID not found");
      }

      if (progress && progress._id) {
        // Step 3: Detect programming language
        const detectedLanguage = detectLanguage(mainCode);

        // Step 3.5: Update progress completion status
        try {
          // Mark lesson as completed and update time spent
          await progressApi.completeLesson(progress._id, {
            lessonId: currentLessonId,
            timeSpent: Math.floor(timeSpent / 60), // Convert seconds to minutes
          });

          // Update student total time spent
          if (studentId && studentId !== "guest") {
            await studentApi.updateTimeSpent(studentId, {
              minutes: Math.floor(timeSpent / 60),
            });
          }
        } catch (progressError) {
          // Continue with saving code even if progress update fails
        }

        // Step 4: Save code to progress API
        await progressApi.saveCode(progress._id, {
          lessonId: currentLessonId,
          language: detectedLanguage,
          code: mainCode,
        });

        // Show success feedback
        toast({
          title: "Progress Saved",
          description: `Your ${detectedLanguage} code has been saved to your progress.`,
        });

        // Update last saved code to track unsaved changes
        setLastSavedCode(mainCode);
        invalidateProgress();
      } else {
        throw new Error("Failed to get or create progress record");
      }
    } catch (error) {
      // Show error feedback but don't fail the entire save operation
      toast({
        title: "Progress Sync Failed",
        description:
          "Your code was saved locally, but couldn't sync with progress server. Please check your connection.",
        variant: "destructive",
      });

      // Don't throw error - allow localStorage save to succeed
    }

    // Update last saved code even if API save failed (localStorage save succeeded)
    setLastSavedCode(mainCode);
  };

  // Handle format code (placeholder for future implementation)
  const handleFormatCode = () => {
    // TODO: Implement code formatting
  };

  // Track unsaved changes and warn user before closing tab
  useEffect(() => {
    // Initialize lastSavedCode when mainCode is first set
    if (mainCode && !lastSavedCode) {
      setLastSavedCode(mainCode);
    }

    // Also check if current code matches what's saved in localStorage
    // This handles the case when "Load My Code" is used
    if (mainCode && currentLessonId) {
      const saveKey = `code-${realCourseId}-${currentLessonId}`;
      const savedCode = localStorage.getItem(saveKey);
      if (savedCode && mainCode === savedCode && mainCode !== lastSavedCode) {
        // Code matches what's in localStorage, so it's considered saved
        setLastSavedCode(mainCode);
      }
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Check if there are unsaved changes
      const hasUnsavedChanges =
        mainCode !== lastSavedCode && mainCode.trim() !== "";

      if (hasUnsavedChanges) {
        // Modern browsers ignore custom messages and show their own
        // But we still need to set returnValue to trigger the dialog
        e.preventDefault();
        e.returnValue = ""; // Required for Chrome
        return ""; // Required for some other browsers
      }
    };

    // Add event listener
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Cleanup
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [mainCode, lastSavedCode, currentLessonId, realCourseId]);

  const handleLayoutChange = (layout: string) => {
    setCurrentLayout(layout);
    if (layoutTimeoutRef.current) {
      clearTimeout(layoutTimeoutRef.current);
      layoutTimeoutRef.current = null;
    }
    const workspace = document.querySelector('[data-ide-workspace="true"]');
    if (workspace) {
      workspace.classList.add("layout-change");
      layoutTimeoutRef.current = setTimeout(() => {
        layoutTimeoutRef.current = null;
        workspace.classList.remove("layout-change");
      }, 10);
    }
  };

  return (
    <AuthProvider>
      <ThemeProvider>
        <CoinProvider>
          <SettingsProvider>
            <AIProvider>
              {isLoadingInitial ? (
                <IdeLoadingSkeleton />
              ) : hasError && errorMessage ? (
                <div className="flex items-center justify-center h-screen">
                  <div className="text-center">
                    <p className="text-destructive mb-4">{errorMessage}</p>
                    <button
                      onClick={() => window.location.reload()}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ) : (
              <div className="flex flex-col h-screen w-screen overflow-hidden">
                <IdeHeader
                  courseTitle={currentCourseTitle}
                  userData={userData || undefined}
                  studentId={studentId || undefined}
                  onSettingsClick={() => setIsSettingsOpen(true)}
                  ideMode={ideMode}
                  onModeChange={setIdeMode}
                  onSaveCode={handleSaveCode}
                  mainCode={mainCode}
                  courseLanguage={courseLanguage}
                />
                <div className="flex-1 overflow-hidden relative">
                  <IdeWorkspace
                    slides={currentSlides}
                    courseId={realCourseId}
                    courseLanguage={courseLanguage}
                    mainCode={mainCode}
                    setMainCode={setMainCode}
                    lessons={allLessons}
                    currentLessonId={currentLessonId}
                    onSelectLesson={handleSelectLesson}
                    currentLayout={currentLayout}
                    initialSlideIndex={currentSlideIndex}
                    onSlideChange={handleSlideChange}
                    studentId={studentId || "guest"}
                    ideMode={ideMode}
                    onIdeModeChange={setIdeMode}
                  />
                </div>
                <IdeKeyboardShortcuts
                  onRunCode={handleRunCode}
                  onSaveCode={handleSaveCode}
                  onFormatCode={handleFormatCode}
                />
              </div>
              )}
              <IdeSettingsPanel
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                currentLayout={currentLayout}
                onChangeLayout={handleLayoutChange}
              />
            </AIProvider>
          </SettingsProvider>
        </CoinProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
