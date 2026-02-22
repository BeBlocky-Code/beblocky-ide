"use client";

import { useState } from "react";
import { useAuthContext } from "@/components/context/auth-context";
import { useTheme } from "./context/theme-provider";
import { useCoin } from "./context/coin-context";
import { useSettings } from "./context/settings-context";
import { UserRole } from "@/types/user";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import IdeModeToggle from "./ide-mode-toggle";
import { cn } from "@/lib/utils";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Coins, Moon, Settings, Sun, Flame, Save, Download, MoreVertical } from "lucide-react";
import { useEffect } from "react";
import { studentApi } from "@/lib/api/student";
import Logo from "@/public/assets/images/logo.png";
import { LoadingButton } from "@/components/ui/loading-button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface IdeHeaderProps {
  courseTitle?: string;
  userData?: {
    id: string;
    name: string;
    email: string;
    initials?: string;
    role?: UserRole;
  };
  studentId?: string;
  onSettingsClick?: () => void;
  ideMode?: "ide" | "ai";
  onModeChange?: (mode: "ide" | "ai") => void;
  onSaveCode?: () => Promise<void>;
  mainCode?: string;
  courseLanguage?: string;
}

export default function IdeHeader({
  courseTitle,
  userData,
  studentId,
  onSettingsClick,
  ideMode = "ide",
  onModeChange,
  onSaveCode,
  mainCode = "",
  courseLanguage,
}: IdeHeaderProps) {
  const { user } = useAuthContext();
  const { theme, setTheme } = useTheme();
  const { coins } = useCoin();
  const { openSettings } = useSettings();
  const { toast } = useToast();
  const [streak, setStreak] = useState(0);

  // Save / Download states
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Check if user should see coins (only student roles)
  const shouldShowCoins = userData?.role === UserRole.STUDENT;

  // Load coding streak
  useEffect(() => {
    if (shouldShowCoins && studentId) {
      studentApi
        .getStreak(studentId)
        .then((data) => {
          // Handle both number response and object response
          const streakValue =
            typeof data === "number" ? data : ((data as any)?.streak ?? 0);
          setStreak(streakValue || 0);
        })
        .catch(() => {
          setStreak(0);
        });
    }
  }, [shouldShowCoins, studentId]);

  // Determine navigation URL based on user role
  const getNavigationUrl = () => {
    const role = userData?.role;
    if (
      role === UserRole.ADMIN ||
      role === UserRole.TEACHER ||
      role === UserRole.ORGANIZATION
    ) {
      return "https://admin.beblocky.com";
    } else {
      return "https://code.beblocky.com";
    }
  };

  const extractCodeParts = (code: string) => {
    const htmlMatch = code.match(/<html[^>]*>([\s\S]*?)<\/html>/i);
    const headMatch = code.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
    const bodyMatch = code.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const styleMatch = code.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    const scriptMatch = code.match(/<script[^>]*>([\s\S]*?)<\/script>/i);

    let html = "";
    let css = "";
    let js = "";

    if (htmlMatch) {
      html = htmlMatch[1];
    } else if (headMatch && bodyMatch) {
      html = headMatch[1] + "\n" + bodyMatch[1];
    } else if (bodyMatch) {
      html = bodyMatch[1];
    }

    if (styleMatch) css = styleMatch[1];
    if (scriptMatch) js = scriptMatch[1];

    return { html, css, js };
  };

  const performDownload = async () => {
    setIsDownloading(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      const { html, css, js } = extractCodeParts(mainCode);

      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Project</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
${html}
<script src="script.js"></script>
</body>
</html>`;

      zip.file("index.html", htmlContent);
      zip.file("styles.css", css);
      zip.file("script.js", js);

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "my-project.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download Successful",
        description: "Your project files have been downloaded successfully.",
      });
    } catch (error) {
      console.error("Error creating zip file:", error);
      setErrorMessage("Failed to create download file. Please try again.");
      setErrorDialogOpen(true);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveCode?.();
      toast({
        title: "Code Saved",
        description: "Your code has been saved successfully.",
      });
    } catch (error) {
      setErrorMessage("Failed to save your code. Please try again.");
      setErrorDialogOpen(true);
    } finally {
      setIsSaving(false);
    }
  };

  // Custom 1140px mobile mode toggle
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const checkCompact = () => {
      setIsCompact(window.innerWidth < 1140);
    };
    checkCompact();
    window.addEventListener("resize", checkCompact);
    return () => window.removeEventListener("resize", checkCompact);
  }, []);

  const showSaveButtons = ideMode === "ide" && onSaveCode;
  const accentColor = theme === "dark" ? "#892FFF" : "#FF932C";

  return (
    <>
      <header className="h-14 md:h-16 w-full border-b flex items-center justify-between px-3 md:px-6 transition-all duration-200 bg-background relative shadow-sm">
        {/* Left: Logo + Course Title */}
        <div className="flex items-center gap-2 md:gap-6 flex-1 h-full min-w-0">
          <a href={getNavigationUrl()} className="h-full flex items-center transition-transform hover:scale-105 active:scale-95 shrink-0">
            <div className="relative">
              <Image
                src={Logo}
                alt="BeBlocky Logo"
                width={100}
                height={150}
                className="h-8 md:h-10 w-auto object-contain"
                priority
              />
              {theme === "dark" && (
                <div className="absolute inset-0 bg-[#892FFF]/10 blur-xl -z-10 rounded-full" />
              )}
            </div>
          </a>
          
          <div className="h-6 md:h-8 w-px bg-border/60 mx-1 hidden sm:block" />
          
          {courseTitle && (
            <div className={cn("hidden lg:block truncate max-w-[150px] xl:max-w-xs", isCompact && "lg:hidden")}>
              <h1 className="text-sm md:text-base font-bold text-foreground/90 tracking-tight truncate">
                {courseTitle}
              </h1>
            </div>
          )}
        </div>

        {/* Center: Mode Toggle — intelligently positioned */}
        {onModeChange && (
          <div className={cn("flex items-center justify-center transition-all duration-300", isCompact ? "flex-1" : "flex-none")}>
            <div className={cn("transition-all duration-300", !isCompact ? "sm:absolute sm:left-1/2 sm:-translate-x-1/2" : "flex items-center")}>
              <div className={cn("transition-transform origin-center", isCompact ? "scale-[0.85] xs:scale-90" : "scale-100")}>
                <IdeModeToggle mode={ideMode} onModeChange={onModeChange} />
              </div>
            </div>
          </div>
        )}

        {/* Right Section */}
        <div className="flex items-center gap-1.5 md:gap-3 flex-1 justify-end min-w-0">
          {/* Mobile Utility Actions — now triggered at 1140px */}
          {showSaveButtons && isCompact && (
            <div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border border-border/40 bg-muted/20">
                    <MoreVertical size={18} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 p-2 rounded-2xl border-border/40 shadow-xl backdrop-blur-md bg-background/95">
                  <DropdownMenuItem 
                    onClick={() => setSaveDialogOpen(true)}
                    className="flex items-center gap-3 p-3 rounded-xl cursor-pointer focus:bg-muted/50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-muted/30">
                      <Save size={16} style={{ color: accentColor }} />
                    </div>
                    <span className="font-bold text-sm">Save Code</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setDownloadDialogOpen(true)}
                    className="flex items-center gap-3 p-3 rounded-xl cursor-pointer focus:bg-muted/50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-muted/30">
                      <Download size={16} />
                    </div>
                    <span className="font-bold text-sm">Download ZIP</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Save & Download — Hidden if compact (width < 1140px) */}
          {showSaveButtons && !isCompact && (
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <LoadingButton
                      variant="brand"
                      size="sm"
                      onClick={() => setSaveDialogOpen(true)}
                      loading={isSaving}
                      loadingText=""
                      style={{ backgroundColor: accentColor }}
                      className="h-9 rounded-full px-5 font-bold transition-all hover:shadow-lg hover:scale-[1.02] border-none"
                    >
                      <Save size={16} />
                      <span className="ml-1.5 text-sm">Save Code</span>
                    </LoadingButton>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Save your code (Ctrl+S)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <LoadingButton
                      variant="outline"
                      size="sm"
                      onClick={() => setDownloadDialogOpen(true)}
                      loading={isDownloading}
                      loadingText=""
                      className="h-9 rounded-full px-4 font-bold transition-all hover:bg-muted/50 border-border/60"
                    >
                      <Download size={16} />
                      <span className="ml-1.5 text-sm">Download</span>
                    </LoadingButton>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Download project as ZIP</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}

          <div className="w-px h-6 bg-border/60 mx-0.5 md:mx-1 hidden md:block" />

          {shouldShowCoins && (
            <div className="hidden sm:flex items-center gap-1.5 md:gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 md:gap-1.5 bg-amber-50 text-amber-900 border border-amber-200/50 dark:bg-amber-900/10 dark:text-amber-300 px-2.5 py-1.5 rounded-full text-[10px] md:text-xs font-bold transition-transform hover:scale-105">
                      <span className="tabular-nums hidden xs:inline">{coins.toFixed(0)}</span>
                      <Coins size={14} className="text-amber-500 fill-amber-500/20" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Your learning coins</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 md:gap-1.5 bg-orange-50 text-orange-900 border border-orange-200/50 dark:bg-orange-900/10 dark:text-orange-300 px-2.5 py-1.5 rounded-full text-[10px] md:text-xs font-bold transition-transform hover:scale-105">
                      <Flame size={14} style={{ color: accentColor }} />
                      <span className="tabular-nums hidden xs:inline">{streak}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Your coding streak</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={onSettingsClick || openSettings}
            className="rounded-full h-8 w-8 md:h-9 md:w-9 text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <Settings className="h-4 w-4 md:h-5 md:w-5" />
          </Button>

          <div className="ml-1 flex items-center shrink-0 transition-transform hover:scale-105 active:scale-95 cursor-pointer">
            {userData?.initials ? (
              <div 
                className="w-7 h-7 md:w-8 md:h-8 text-white rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold shadow-sm border-2 border-background"
                style={{ background: `linear-gradient(to bottom right, ${accentColor}, ${theme === 'dark' ? '#b794f4' : '#ea580c'})` }}
              >
                {userData.initials}
              </div>
            ) : (
              <div className="w-7 h-7 md:w-8 md:h-8 bg-muted rounded-full animate-pulse" />
            )}
          </div>
        </div>
      </header>

      {/* Confirmation dialogs */}
      <ConfirmationDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        type="confirm"
        title="Save Code"
        description="Are you sure you want to save your current code? This will update your progress."
        confirmText="Save"
        cancelText="Cancel"
        onConfirm={handleSave}
        loading={isSaving}
      />
      <ConfirmationDialog
        open={downloadDialogOpen}
        onOpenChange={setDownloadDialogOpen}
        type="info"
        title="Download Project"
        description="Your project will be downloaded as a ZIP file containing HTML, CSS, and JavaScript files."
        confirmText="Download"
        onConfirm={performDownload}
        loading={isDownloading}
      />
      <ConfirmationDialog
        open={errorDialogOpen}
        onOpenChange={setErrorDialogOpen}
        type="error"
        title="Error"
        description={errorMessage}
        confirmText="OK"
      />
    </>
  );
}
