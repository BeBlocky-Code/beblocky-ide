"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Zap, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { aiConversationApi, ApiError } from "@/lib/api/ai-conversation";
import { codeAnalysisApi } from "@/lib/api/code-analysis";
import {
  IAiConversation,
  ICodeAnalysis,
  IChatMessage,
  ICodeFeedback,
} from "@/types/ai";
import IdeConversationSidebar from "./ide-conversation-sidebar";
import IdeMessageList from "./ide-message-list";
import IdeChatInput from "./ide-chat-input";
import IdeCodeAnalysis from "./ide-code-analysis";
import IdeChatTab from "./ide-chat-tab";
import { progressApi } from "@/lib/api/progress";
import { queryKeys } from "@/lib/query-keys";
import { useTheme } from "./context/theme-provider";

type Conversation = {
  _id: string;
  title: string;
  lastActivity: string;
  courseId: string;
  messages?: IChatMessage[];
};

function normalizeId(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (typeof value === "object" && value !== null && "_id" in value) {
    return normalizeId((value as { _id: unknown })._id);
  }
  return String(value);
}

function courseIdOf(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "object" && value !== null && "_id" in value) {
    return normalizeId((value as { _id: unknown })._id);
  }
  return normalizeId(value);
}

export default function IdeAiAssistant({
  code,
  courseId,
  lessonId,
  studentId,
  persistedState,
}: {
  code: string;
  courseId: string;
  lessonId: string;
  studentId: string;
  persistedState?: {
    activeTab: string;
    setActiveTab: React.Dispatch<React.SetStateAction<string>>;
    messages: IChatMessage[];
    setMessages: React.Dispatch<React.SetStateAction<IChatMessage[]>>;
    selectedConversationId: string;
    setSelectedConversationId: React.Dispatch<React.SetStateAction<string>>;
    isConversationSidebarOpen: boolean;
    setIsConversationSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
    inputValue: string;
    setInputValue: React.Dispatch<React.SetStateAction<string>>;
    isThinking: boolean;
    setIsThinking: React.Dispatch<React.SetStateAction<boolean>>;
    typedMessages: Set<string>;
    setTypedMessages: React.Dispatch<React.SetStateAction<Set<string>>>;
  };
}) {
  // Use persisted state or internal state as fallback
  const [internalActiveTab, setInternalActiveTab] = useState("chat");
  const [internalMessages, setInternalMessages] = useState<IChatMessage[]>([]);
  const [internalSelectedConversationId, setInternalSelectedConversationId] = useState<string>("");
  const [internalInputValue, setInternalInputValue] = useState("");
  const [internalIsThinking, setInternalIsThinking] = useState(false);
  const [internalIsConversationSidebarOpen, setInternalIsConversationSidebarOpen] = useState(true);
  const [internalTypedMessages, setInternalTypedMessages] = useState<Set<string>>(new Set());

  const activeTab = persistedState ? persistedState.activeTab : internalActiveTab;
  const setActiveTab = persistedState ? persistedState.setActiveTab : setInternalActiveTab;
  const messages = persistedState ? persistedState.messages : internalMessages;
  const setMessages = persistedState ? persistedState.setMessages : setInternalMessages;
  const selectedConversationId = persistedState ? persistedState.selectedConversationId : internalSelectedConversationId;
  const setSelectedConversationId = persistedState ? persistedState.setSelectedConversationId : setInternalSelectedConversationId;
  const inputValue = persistedState ? persistedState.inputValue : internalInputValue;
  const setInputValue = persistedState ? persistedState.setInputValue : setInternalInputValue;
  const isThinking = persistedState ? persistedState.isThinking : internalIsThinking;
  const setIsThinking = persistedState ? persistedState.setIsThinking : setInternalIsThinking;
  const isConversationSidebarOpen = persistedState ? persistedState.isConversationSidebarOpen : internalIsConversationSidebarOpen;
  const setIsConversationSidebarOpen = persistedState ? persistedState.setIsConversationSidebarOpen : setInternalIsConversationSidebarOpen;
  const typedMessages = persistedState ? persistedState.typedMessages : internalTypedMessages;
  const setTypedMessages = persistedState ? persistedState.setTypedMessages : setInternalTypedMessages;

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [codeFeedback, setCodeFeedback] = useState<ICodeFeedback[]>([]);
  const [currentAnalysis, setCurrentAnalysis] = useState<ICodeAnalysis | null>(null);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);

  const isMountedRef = useRef(true);
  const pendingTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const queryClient = useQueryClient();

  const { theme } = useTheme();
  const accentColor = theme === "dark" ? "#892FFF" : "#FF932C";

  const conversationsQuery = useQuery({
    queryKey: queryKeys.ai.conversations(studentId),
    queryFn: () => aiConversationApi.getByStudent(studentId),
    enabled: !!studentId && studentId !== "guest",
    staleTime: 60 * 1000,
  });
  const analysisHistoryQuery = useQuery({
    queryKey: queryKeys.ai.analysisHistory(studentId),
    queryFn: () => codeAnalysisApi.getByStudent(studentId),
    enabled: !!studentId && studentId !== "guest" && activeTab === "analysis",
    staleTime: 60 * 1000,
  });

  const courseProgressQuery = useQuery({
    queryKey: queryKeys.progress.byStudentAndCourse(studentId, courseId),
    queryFn: () => progressApi.getByStudentAndCourse(studentId, courseId),
    enabled: !!studentId && studentId !== "guest" && !!courseId,
    staleTime: 5 * 60 * 1000,
  });

  const conversations: Conversation[] = useMemo(() => {
    const list = conversationsQuery.data ?? [];
    const mapped: Conversation[] = [];
    for (const conv of list) {
      const id = normalizeId(conv?._id);
      if (!id) continue;
      mapped.push({
        _id: id,
        title:
          conv.title ||
          (conv.messages && conv.messages.length > 0
            ? "New Conversation"
            : "Untitled Conversation"),
        lastActivity: new Date(
          conv.lastActivity || Date.now(),
        ).toISOString(),
        courseId: courseIdOf(conv.courseId),
        messages: Array.isArray(conv.messages) ? conv.messages : undefined,
      });
    }
    return mapped;
  }, [conversationsQuery.data]);

  const analysisHistory = analysisHistoryQuery.data ?? [];

  // Clear timeouts and set unmounted on cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      pendingTimeoutsRef.current.forEach(clearTimeout);
      pendingTimeoutsRef.current = [];
    };
  }, []);

  const upsertConversationInCache = (conversation: IAiConversation) => {
    const id = normalizeId(conversation._id);
    queryClient.setQueryData(
      queryKeys.ai.conversations(studentId),
      (prev: IAiConversation[] | undefined) => {
        if (!prev) return [conversation];
        const exists = prev.some((c) => normalizeId(c._id) === id);
        if (!exists) return [conversation, ...prev];
        return prev.map((c) =>
          normalizeId(c._id) === id ? conversation : c,
        );
      },
    );
    queryClient.setQueryData(queryKeys.ai.conversation(id), conversation);
  };

  const loadConversationMessages = async (conversationId: string) => {
    const cached = conversations.find((c) => c._id === conversationId);
    if (cached?.messages && cached.messages.length > 0) {
      setMessages(cached.messages);
    }

    try {
      const full = await queryClient.fetchQuery({
        queryKey: queryKeys.ai.conversation(conversationId),
        queryFn: () => aiConversationApi.getById(conversationId),
        staleTime: 30 * 1000,
      });
      if (!isMountedRef.current) return;
      if (Array.isArray(full?.messages)) {
        setMessages(full.messages);
        upsertConversationInCache(full);
      }
    } catch (error) {
      console.error("Failed to load conversation:", error);
      if (!cached?.messages?.length && isMountedRef.current) {
        setMessages([]);
      }
    }
  };

  // Keep selected chat messages in sync when the list cache updates
  useEffect(() => {
    if (!selectedConversationId) return;
    if (conversationsQuery.isLoading) return;
    const conv = conversations.find((c) => c._id === selectedConversationId);
    if (conv?.messages && conv.messages.length > 0) {
      setMessages(conv.messages);
    }
  }, [conversations, selectedConversationId, conversationsQuery.isLoading]);

  const invalidateConversations = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.ai.conversations(studentId),
    });
  const invalidateAnalysisHistory = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.ai.analysisHistory(studentId),
    });

  const handleNewChat = () => {
    setSelectedConversationId("");
    setMessages([]);
    setIsConversationSidebarOpen(false);
  };

  const createConversationMutation = useMutation({
    mutationFn: (initialMessage: string) =>
      aiConversationApi.create({
        courseId,
        studentId,
        title: "",
        lessonId: lessonId,
        initialMessage,
      }),
    onSuccess: (newConversation) => {
      upsertConversationInCache(newConversation);
      invalidateConversations();
      const id = normalizeId(newConversation._id);
      setSelectedConversationId(id);
      setMessages(newConversation.messages || []);
      setIsConversationSidebarOpen(false);
    },
    onSettled: () => {
      setIsCreatingConversation(false);
    },
  });

  const handleSendMessage = async (value?: string) => {
    const messageContent = (value ?? inputValue).trim();
    if (!messageContent || isCreatingConversation || isThinking) return;

    // New chat: create with the first message (API already replies)
    if (!selectedConversationId) {
      setInputValue("");
      setIsThinking(true);
      setIsCreatingConversation(true);
      try {
        await createConversationMutation.mutateAsync(messageContent);
      } catch (error) {
        if (error instanceof ApiError) {
          console.error(
            "Create conversation API error:",
            error.status,
            error.message,
          );
        } else {
          console.error("Failed to create conversation:", error);
        }
        setMessages((prev) => [
          ...prev,
          {
            role: "user",
            content: messageContent,
            timestamp: new Date(),
          },
          {
            role: "assistant",
            content: generateAIResponse(),
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsThinking(false);
      }
      return;
    }

    const userMessage: IChatMessage = {
      role: "user",
      content: messageContent,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsThinking(true);

    try {
      const updatedConversation = await aiConversationApi.sendMessage(
        selectedConversationId,
        {
          message: messageContent,
          lessonId: lessonId,
        },
      );

      setMessages(updatedConversation.messages || []);
      upsertConversationInCache(updatedConversation);
    } catch (error) {
      if (error instanceof ApiError) {
        console.error(
          "Send message API error:",
          error.status,
          error.message,
        );
      } else {
        console.error("Failed to send message:", error);
      }

      const timeoutId = setTimeout(() => {
        pendingTimeoutsRef.current = pendingTimeoutsRef.current.filter(
          (t) => t !== timeoutId,
        );
        if (!isMountedRef.current) return;
        const aiResponse: IChatMessage = {
          role: "assistant",
          content: generateAIResponse(),
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiResponse]);
      }, 1500);
      pendingTimeoutsRef.current.push(timeoutId);
    } finally {
      setIsThinking(false);
    }
  };

  const analyzeCode = async () => {
    if (!code.trim()) return;

    setIsAnalyzing(true);
    setIsThinking(true);

    try {
      // Prefer cached history; fetch once if the analysis tab never opened.
      let existingAnalyses = analysisHistoryQuery.data;
      if (!existingAnalyses) {
        existingAnalyses = await queryClient.fetchQuery({
          queryKey: queryKeys.ai.analysisHistory(studentId),
          queryFn: () => codeAnalysisApi.getByStudent(studentId),
          staleTime: 60 * 1000,
        });
      }

      const lessonAnalyses = (existingAnalyses ?? []).filter(
        (analysis) => String(analysis.lessonId) === String(lessonId)
      );

      const progressDoc =
        (courseProgressQuery.data as { _id?: string } | undefined) ||
        (await queryClient.fetchQuery({
          queryKey: queryKeys.progress.byStudentAndCourse(studentId, courseId),
          queryFn: () =>
            progressApi.getByStudentAndCourse(studentId, courseId),
          staleTime: 5 * 60 * 1000,
        }));
      const progressId = progressDoc?._id ? String(progressDoc._id) : "";

      let analysis: ICodeAnalysis;

      if (lessonAnalyses.length === 0) {
        analysis = await codeAnalysisApi.analyze({
          progressId,
          lessonId: lessonId,
          codeContent: code,
          language: detectLanguage(code),
        });
      } else {
        const latestAnalysis = lessonAnalyses.sort(
          (a, b) =>
            new Date(b.analysisDate).getTime() -
            new Date(a.analysisDate).getTime()
        )[0];

        setCurrentAnalysis(latestAnalysis);
        setCodeFeedback(latestAnalysis.feedback);

        analysis = await codeAnalysisApi.analyze({
          progressId,
          lessonId: lessonId,
          codeContent: code,
          language: detectLanguage(code),
        });
      }

      setCurrentAnalysis(analysis);
      setCodeFeedback(analysis.feedback);

      queryClient.setQueryData(
        queryKeys.ai.analysisHistory(studentId),
        (prev: ICodeAnalysis[] | undefined) => {
          const list = prev ?? existingAnalyses ?? [];
          return [analysis, ...list.filter((a) => a._id !== analysis._id)];
        }
      );
    } catch (error) {
      console.error("Code analysis failed:", error);

      // Fallback to mock analysis if API fails
      const timeoutId = setTimeout(() => {
        pendingTimeoutsRef.current = pendingTimeoutsRef.current.filter(
          (t) => t !== timeoutId
        );
        if (!isMountedRef.current) return;
        setCodeFeedback([
          {
            type: "success",
            message: "Your HTML structure looks good!",
          },
          {
            type: "warning",
            message:
              "Consider adding more comments to your JavaScript code for better readability.",
            line: 5,
            code: "function calculateTotal() { /* missing comments */ }",
          },
          {
            type: "error",
            message: "Missing closing tag in your HTML.",
            line: 12,
            code: "<div>Content",
          },
        ]);
      }, 1500);
      pendingTimeoutsRef.current.push(timeoutId);
    } finally {
      setIsThinking(false);
      setIsAnalyzing(false);
    }
  };

  // Detect programming language from code
  const detectLanguage = (code: string): string => {
    const trimmedCode = code.trim().toLowerCase();

    if (trimmedCode.includes("def ") && trimmedCode.includes("import "))
      return "python";
    if (
      trimmedCode.includes("public class") ||
      trimmedCode.includes("system.out.print")
    )
      return "java";
    if (
      trimmedCode.includes("#include") ||
      trimmedCode.includes("printf(") ||
      trimmedCode.includes("cout")
    )
      return "cpp";
    if (trimmedCode.includes("<html") || trimmedCode.includes("<div"))
      return "html";
    if (
      trimmedCode.includes("{") &&
      trimmedCode.includes("}") &&
      trimmedCode.includes(":")
    )
      return "css";

    return "javascript";
  };

  return (
    <div className="h-full flex flex-col bg-transparent overflow-hidden">
      <div className="flex-1 p-0 overflow-hidden relative flex">
        {/* Click-away overlay for sidebar */}
        {isConversationSidebarOpen && (
          <div 
            className="absolute inset-0 bg-transparent z-[65]" 
            onClick={() => setIsConversationSidebarOpen(false)}
          />
        )}
        {/* Persistent Conversation/Utility Sidebar */}
        <IdeConversationSidebar
          conversations={conversations}
          selectedConversationId={selectedConversationId}
          isLoading={conversationsQuery.isLoading}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onConversationSelect={(conversationId) => {
            setSelectedConversationId(conversationId);
            setIsConversationSidebarOpen(false);
            void loadConversationMessages(conversationId);
          }}
          onNewConversation={handleNewChat}
          isOpen={isConversationSidebarOpen}
          onClose={() => setIsConversationSidebarOpen(false)}
        />

        {/* Dynamic Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-transparent relative overflow-hidden">
          {activeTab === "chat" ? (
            <div className="flex-1 flex flex-col min-h-0 relative">
              {/* Toggle button for sidebar - Floating version */}
              {!isConversationSidebarOpen && (
                <div className="absolute top-4 left-4 z-10">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      setIsConversationSidebarOpen(true)
                    }
                    className="rounded-full shadow-md bg-background/80 backdrop-blur-md border border-border/40 hover:scale-105 active:scale-95 transition-all group"
                  >
                    <MessageCircle
                      size={16}
                      className="mr-2 text-primary group-hover:rotate-12 transition-transform"
                    />
                    <span className="text-xs font-bold text-primary">
                      History
                    </span>
                  </Button>
                </div>
              )}

              <div className="flex-1 min-h-0 flex flex-col">
                <IdeChatTab
                  messages={messages}
                  inputValue={inputValue}
                  selectedConversationId={selectedConversationId}
                  isThinking={isThinking}
                  onInputChange={setInputValue}
                  onSendMessage={handleSendMessage}
                  typedMessages={typedMessages}
                  setTypedMessages={setTypedMessages}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 relative pl-0">
             {!isConversationSidebarOpen && (
                <div className="absolute top-4 left-4 z-10">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      setIsConversationSidebarOpen(true)
                    }
                    className="rounded-full shadow-md bg-background/80 backdrop-blur-md border border-border/40 hover:scale-105 active:scale-95 transition-all group"
                  >
                    <Zap
                      size={16}
                      className="mr-2 text-primary group-hover:rotate-12 transition-transform"
                    />
                    <span className="text-xs font-bold text-primary">
                      Tools
                    </span>
                  </Button>
                </div>
              )}
              {/* Left padding when Tools pill is visible so header is not covered */}
              <div className={cn("flex-1 flex flex-col min-h-0 min-w-0", !isConversationSidebarOpen && "pl-24 sm:pl-28")}>
              <IdeCodeAnalysis
                isAnalyzing={isAnalyzing}
                currentAnalysis={currentAnalysis}
                codeFeedback={codeFeedback}
                analysisHistory={analysisHistory}
                onAnalyzeCode={analyzeCode}
                onSelectAnalysis={(analysis) => {
                  setCurrentAnalysis(analysis);
                  setCodeFeedback(analysis.feedback);
                }}
              />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Generate mock AI response for fallback
function generateAIResponse(): string {
  const responses = [
    "I see you're working on HTML and CSS. The structure looks good, but you might want to consider adding more semantic HTML elements for better accessibility.",
    "That's a great question! In JavaScript, you can use event listeners to respond to user interactions. For example: `element.addEventListener('click', function() { /* your code */ });`",
    "Based on the current lesson, you should focus on understanding how CSS selectors work. They determine which elements your styles will apply to.",
    "Your code is coming along nicely! One tip: remember to test your website in different browsers to ensure compatibility.",
    "I'd recommend breaking down this problem into smaller steps. First, create the HTML structure, then style it with CSS, and finally add the JavaScript functionality.",
  ];

  return responses[Math.floor(Math.random() * responses.length)];
}
