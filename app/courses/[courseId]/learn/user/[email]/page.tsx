"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import IdeToolbar from "@/components/ide/ide-toolbar";
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
import { generateInitials } from "@/lib/utils";
import { UserRole, IUser } from "@/types/user";
import { IStudentProgress, IProgress } from "@/types/progress";
import IdeLoadingSkeleton from "@/components/ide/ide-loading";
import { studentApi } from "@/lib/api/student";
import { userApi } from "@/lib/api/user";

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
  const courseId = params.courseId as string;
  const email = params.email as string;
  const { toast } = useToast();

  const [mainCode, setMainCode] = useState<string>("");
  const [courseLanguage, setCourseLanguage] = useState<string>("web");
  const [currentLayout, setCurrentLayout] = useState<string>("standard");
  const [currentLessonId, setCurrentLessonId] = useState<string>("");
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [currentSlides, setCurrentSlides] = useState<ISlide[]>([]);
  const [allLessons, setAllLessons] = useState<ILesson[]>([]);
  const [currentCourseTitle, setCurrentCourseTitle] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [userProgress, setUserProgress] = useState<IStudentProgress | null>(
    null
  );
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [timeSpent, setTimeSpent] = useState<number>(0);
  const [timeTrackerInterval, setTimeTrackerInterval] =
    useState<NodeJS.Timeout | null>(null);
  const [lastSavedCode, setLastSavedCode] = useState<string>("");

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
        String((b as any)?._id || "")
      );
    });
  };

  // Start time tracking when component mounts
  useEffect(() => {
    console.log("⏰ [TIME TRACKER] Starting time tracking...");

    const interval = setInterval(() => {
      setTimeSpent((prev) => {
        const newTime = prev + 1; // Increment by 1 minute

        // Update progress time every minute
        if (userProgress && userProgress._id && newTime % 60 === 0) {
          // Update every 60 seconds
          progressApi
            .updateTimeSpent(userProgress._id, {
              minutes: 1,
              lastAccessed: new Date().toISOString(),
            })
            .catch((error) => {
              console.warn(
                "⚠️ [TIME TRACKER] Failed to update time spent:",
                error
              );
            });
        }

        return newTime;
      });
    }, 60000); // Update every minute

    setTimeTrackerInterval(interval);

    return () => {
      console.log("⏰ [TIME TRACKER] Stopping time tracking...");
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [userProgress?._id]);

  // Cleanup time tracker on unmount
  useEffect(() => {
    return () => {
      if (timeTrackerInterval) {
        clearInterval(timeTrackerInterval);
        console.log("⏰ [TIME TRACKER] Cleaned up on unmount");
      }
    };
  }, []);

  // Fetch course data and user data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch course data
        const courseData = await getCourseWithContent(courseId);
        console.log("🔍 [FETCH DATA] Course data:", courseData);

        if (courseData) {
          setCurrentCourseTitle(courseData.courseTitle);
          setAllLessons((courseData.lessons as unknown as ILesson[]) || []);

          // Course programming language: use `courseLanguage` as source of truth.
          // (Some datasets may also include `language`; we only fall back to it if needed.)
          const languageCandidate = String(
            (courseData as any)?.courseLanguage ||
              (courseData as any)?.language ||
              "web"
          ).toLowerCase();
          const normalizedProgrammingLanguage = [
            "python",
            "javascript",
            "typescript",
            "html",
            "web",
          ].includes(languageCandidate)
            ? languageCandidate
            : "web";
          setCourseLanguage(normalizedProgrammingLanguage);

          if (courseData.lessons && courseData.lessons.length > 0) {
            // Default to first lesson if no progress exists
            let targetLesson = courseData.lessons[0];
            let targetSlideIndex = 0;
            const initialSlides =
              (courseData.lessons[0].slides as unknown as ISlide[]) || [];
            const sortedInitialSlides = sortSlidesByOrder(initialSlides);
            let targetCode = sortedInitialSlides?.[0]?.startingCode || "";

            setCurrentLessonId(targetLesson._id?.toString() || "");
            setCurrentSlides(sortedInitialSlides);
            console.log(
              "🔍 [FETCH DATA] Current slides (sorted):",
              sortedInitialSlides.map((s: any) => ({
                id: s?._id,
                title: s?.title,
                order: s?.order,
              }))
            );
            setCurrentSlideIndex(targetSlideIndex);
            setMainCode(targetCode);
            setLastSavedCode(targetCode);
          }
        }

        // Fetch user data based on email
        try {
          const userData = await userApi.getByEmail(email);
          const studentData = await studentApi.getByEmail(userData?.email);
          const studentId = studentData?._id?.toString();

          // Update student activity when page loads
          if (userData && userData._id) {
            try {
              await studentApi.updateActivity(studentId, {
                lastCodingActivity: new Date().toISOString(),
              });
              console.log(
                "✅ [ACTIVITY] Student activity updated on page load"
              );
            } catch (activityError) {
              console.warn(
                "⚠️ [ACTIVITY] Failed to update student activity:",
                activityError
              );
            }
          }

          // Generate initials for the user
          const initials = generateInitials(
            userData.name || userData.email,
            userData.email
          );

          setStudentId(studentId ?? null);

          const userWithData: UserData = {
            ...userData,
            _id: studentId || "guest",
            id: studentId || "guest",
            initials,
            role: userData.role || UserRole.STUDENT, // Default to student if no role
            progress: {},
            preferences: {},
          };

          setUserData(userWithData);

          // If user is a student, fetch their progress for this course
          if (userWithData.role === UserRole.STUDENT) {
            try {
              const progress = await progressApi.getByStudentAndCourse(
                userWithData.id,
                courseId
              );
              setUserProgress(progress);

              // Initialize time tracking with existing time spent
              if (progress.timeSpent) {
                setTimeSpent(progress.timeSpent * 60); // Convert minutes to seconds for internal tracking
              }

              console.log("✅ Found progress:", progress);

              if (progress.progress && progress.progress.length > 0) {
                // Load the last accessed lesson and slide from progress
                const lastProgress =
                  progress.progress[progress.progress.length - 1];
                if (lastProgress.lessonId) {
                  const lessonId = lastProgress.lessonId.toString();
                  const targetLesson = courseData.lessons?.find(
                    (lesson) => lesson._id?.toString() === lessonId
                  );

                  if (targetLesson) {
                    const slides =
                      (targetLesson.slides as unknown as ISlide[]) || [];
                    const sortedSlides = sortSlidesByOrder(slides);
                    setCurrentLessonId(lessonId);
                    setCurrentSlides(sortedSlides);

                    // Find the slide index based on slideId if available
                    if (lastProgress.slideId) {
                      const slideIndex = sortedSlides.findIndex(
                        (slide) =>
                          slide._id?.toString() ===
                          lastProgress.slideId?.toString()
                      );
                      if (slideIndex !== -1) {
                        setCurrentSlideIndex(slideIndex);
                        const loadedCode =
                          lastProgress.code ||
                          sortedSlides[slideIndex]?.startingCode ||
                          "";
                        setMainCode(loadedCode);
                        setLastSavedCode(loadedCode);
                      } else {
                        setCurrentSlideIndex(0);
                        const loadedCode =
                          lastProgress.code ||
                          sortedSlides[0]?.startingCode ||
                          "";
                        setMainCode(loadedCode);
                        setLastSavedCode(loadedCode);
                      }
                    } else {
                      setCurrentSlideIndex(0);
                      const loadedCode =
                        lastProgress.code ||
                        sortedSlides[0]?.startingCode ||
                        "";
                      setMainCode(loadedCode);
                      setLastSavedCode(loadedCode);
                    }
                  }
                }
              }
            } catch (progressError) {
              console.warn("Could not fetch user progress:", progressError);
              // Continue without progress data
            }
          }
        } catch (error) {
          console.warn("Could not fetch user data, using guest mode:", error);
          // Fallback to guest user data if API fails
          setUserData({
            id: "guest",
            name: "",
            email: email,
            initials: "GU",
            role: UserRole.STUDENT,
            progress: {},
            preferences: {},
            emailVerified: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            _id: "guest",
          });
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (courseId && email) {
      fetchData();
    }
  }, [courseId, email]);

  // Handle slide changes
  const handleSlideChange = async (slideIndex: number) => {
    setCurrentSlideIndex(slideIndex);

    // Update progress for the current slide (only for students)
    if (userData?.id !== "guest" && userData?.role === UserRole.STUDENT) {
      try {
        const currentSlide = currentSlides[slideIndex];
        if (currentSlide) {
          // Check if progress exists for this lesson
          const existingProgress = userProgress?.progress?.find(
            (p: { lessonId?: { toString: () => string } }) =>
              p.lessonId?.toString() === currentLessonId
          );

          if (existingProgress) {
            // Update existing progress with new slide
            await progressApi.updateTimeSpent(
              existingProgress._id?.toString() || "",
              {
                slideId: currentSlide._id?.toString(),
                timeSpent: existingProgress.timeSpent || 0,
                lastAccessed: new Date().toISOString(),
              }
            );
          } else {
            // Create new progress for this lesson and slide
            await progressApi.create({
              studentId: userData.id,
              courseId: courseId,
              lessonId: currentLessonId,
              slideId: currentSlide._id?.toString(),
              code: mainCode,
              timeSpent: 0,
              completed: false,
            });
          }

          // Refresh progress data
          const updatedProgress = await progressApi.getByStudentAndCourse(
            userData.id,
            courseId
          );
          setUserProgress(updatedProgress);
        }
      } catch (error) {
        console.error("Failed to update progress for slide:", error);
      }
    }
  };

  // Handle lesson selection
  const handleSelectLesson = async (lessonId: string) => {
    setCurrentLessonId(lessonId);

    const selectedLesson = allLessons.find(
      (lesson) => lesson._id?.toString() === lessonId
    );

    if (selectedLesson) {
      const slides = (selectedLesson.slides as unknown as ISlide[]) || [];
      const sortedSlides = sortSlidesByOrder(slides);
      setCurrentSlides(sortedSlides);
      setCurrentSlideIndex(0); // Reset to first slide when changing lessons
      const startingCode = sortedSlides[0]?.startingCode || "";
      setMainCode(startingCode);
      setLastSavedCode(startingCode);

      // Update progress for the selected lesson (only for students)
      if (userData?.id !== "guest" && userData?.role === UserRole.STUDENT) {
        try {
          // Check if progress exists for this lesson
          const existingProgress = userProgress?.progress?.find(
            (p: { lessonId?: { toString: () => string } }) =>
              p.lessonId?.toString() === lessonId
          );

          if (existingProgress) {
            // Update existing progress with new lastAccessed time
            await progressApi.updateTimeSpent(
              existingProgress._id?.toString() || "",
              {
                timeSpent: existingProgress.timeSpent || 0,
                lastAccessed: new Date().toISOString(),
              }
            );
          } else {
            // Create new progress for this lesson
            await progressApi.create({
              studentId: userData.id,
              courseId: courseId,
              lessonId: lessonId,
              code:
                (selectedLesson.slides as unknown as ISlide[])?.[0]
                  ?.startingCode || "",
              timeSpent: 0,
              completed: false,
            });

            // Refresh progress data
            const updatedProgress = await progressApi.getByStudentAndCourse(
              userData.id,
              courseId
            );
            setUserProgress(updatedProgress);
          }
        } catch (error) {
          console.error("Failed to update progress for lesson:", error);
        }
      }
    }
  };

  // Update the handleRunCode function to actually run the code
  const handleRunCode = () => {
    const consoleButton = document.querySelector(
      '[data-console-toggle="true"]'
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
    console.log("🚀 [SAVE API] Starting save process...");
    console.log("📋 [SAVE API] Course ID:", courseId);
    console.log("📋 [SAVE API] Lesson ID:", currentLessonId);
    console.log("📋 [SAVE API] Code length:", mainCode.length);

    const saveKey = `code-${courseId}-${currentLessonId}`;
    localStorage.setItem(saveKey, mainCode);
    console.log("💾 [SAVE API] Saved to localStorage:", saveKey);

    let studentId: string | undefined;

    try {
      // Step 1: Get existing progress record for student-course pair
      console.log("🔍 [SAVE API] Fetching existing progress record...");
      let progress: IProgress | null = null;

      try {
        console.log("🔍 [SAVE API] Getting user data for email:", email);

        // Get user data by email
        const userData = await userApi.getByEmail(email);
        console.log("✅ [SAVE API] Found user:", userData?._id);

        // For now, use user ID as student ID (assuming 1:1 relationship)
        // In a real implementation, you'd look up the student record
        const studentData = await studentApi.getByEmail(userData?.email);
        studentId = studentData?._id; // Extract just the student ID
        console.log("✅ [SAVE API] Found student ID:", studentId);

        // Try to get existing progress first (guaranteed to exist for students)
        if (!studentId) {
          throw new Error("Student ID not found");
        }
        const existingProgress = await progressApi.getByStudentAndCourse(
          studentId,
          courseId
        );
        progress = existingProgress as unknown as IProgress;
        console.log("✅ [SAVE API] Found existing progress:", progress?._id);
      } catch (getError) {
        console.log(
          "❌ [SAVE API] No existing progress found, will create new one"
        );
        progress = null;
      }

      if (progress && progress._id) {
        // Step 3: Detect programming language
        console.log("🔍 [SAVE API] Detecting programming language...");
        const detectedLanguage = detectLanguage(mainCode);
        console.log("🎯 [SAVE API] Detected language:", detectedLanguage);

        // Step 3.5: Update progress completion status
        console.log("📈 [SAVE API] Updating progress completion status...");
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

          console.log("✅ [SAVE API] Progress and time updated successfully");
        } catch (progressError) {
          console.warn(
            "⚠️ [SAVE API] Failed to update progress:",
            progressError
          );
          // Continue with saving code even if progress update fails
        }

        // Step 4: Save code to progress API
        console.log("💾 [SAVE API] Saving code to progress API...");
        await progressApi.saveCode(progress._id, {
          lessonId: currentLessonId,
          language: detectedLanguage,
          code: mainCode,
        });

        console.log("✅ [SAVE API] Code saved to progress successfully");
        console.log("📋 [SAVE API] Progress ID:", progress._id);
        console.log("📋 [SAVE API] Language:", detectedLanguage);
        console.log("📋 [SAVE API] Lesson ID:", currentLessonId);

        // Show success feedback
        toast({
          title: "Progress Saved",
          description: `Your ${detectedLanguage} code has been saved to your progress.`,
        });

        // Update last saved code to track unsaved changes
        setLastSavedCode(mainCode);
      } else {
        throw new Error("Failed to get or create progress record");
      }
    } catch (error) {
      console.error(
        "❌ [SAVE API] Failed to save code to progress backend:",
        error
      );
      console.error("📋 [SAVE API] Error details:", {
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : "No stack trace",
        courseId,
        currentLessonId,
        email,
        studentId: studentId || "not found",
        hasProgress: !!userProgress,
      });

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

    console.log("🏁 [SAVE API] Save process completed");
  };

  // Handle format code (placeholder for future implementation)
  const handleFormatCode = () => {
    // TODO: Implement code formatting
    console.log("Format code functionality to be implemented");
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
      const saveKey = `code-${courseId}-${currentLessonId}`;
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
  }, [mainCode, lastSavedCode, currentLessonId, courseId]);

  // Handle AI assistant toggle
  const handleToggleAiAssistant = () => {
    setShowAiAssistant(!showAiAssistant);
  };

  if (loading) {
    return <IdeLoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <AuthProvider>
      <ThemeProvider>
        <CoinProvider>
          <SettingsProvider>
            <AIProvider>
              <div className="flex flex-col h-screen w-screen overflow-hidden">
                <IdeHeader
                  courseTitle={currentCourseTitle}
                  userData={userData || undefined}
                  studentId={studentId || undefined}
                  onSettingsClick={() => setIsSettingsOpen(true)}
                />
                <IdeToolbar
                  onRunCode={handleRunCode}
                  onSaveCode={handleSaveCode}
                  mainCode={mainCode}
                  onChangeLayout={(layout) => {
                    setCurrentLayout(layout);
                    const workspace = document.querySelector(
                      '[data-ide-workspace="true"]'
                    );
                    if (workspace) {
                      workspace.classList.add("layout-change");
                      setTimeout(() => {
                        workspace.classList.remove("layout-change");
                      }, 10);
                    }
                  }}
                  currentLayout={currentLayout}
                  onToggleAiAssistant={handleToggleAiAssistant}
                  showAiAssistant={showAiAssistant}
                />
                <div className="flex-1 overflow-hidden relative">
                  <IdeWorkspace
                    slides={currentSlides}
                    courseId={courseId}
                    courseLanguage={courseLanguage}
                    mainCode={mainCode}
                    setMainCode={setMainCode}
                    lessons={allLessons}
                    currentLessonId={currentLessonId}
                    onSelectLesson={handleSelectLesson}
                    currentLayout={currentLayout}
                    showAiAssistant={showAiAssistant}
                    onToggleAiAssistant={handleToggleAiAssistant}
                    initialSlideIndex={currentSlideIndex}
                    onSlideChange={handleSlideChange}
                    studentId={studentId || "guest"}
                  />
                </div>
                <IdeKeyboardShortcuts
                  onRunCode={handleRunCode}
                  onSaveCode={handleSaveCode}
                  onFormatCode={handleFormatCode}
                />
              </div>

              <IdeSettingsPanel
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
              />
            </AIProvider>
          </SettingsProvider>
        </CoinProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
