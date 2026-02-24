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
    enabled: !!studentId && studentId !== "guest",
    staleTime: 60 * 1000,
  });

  const conversations: Conversation[] = useMemo(() => {
    const list = conversationsQuery.data ?? [];
    return list
      .filter(
        (conv): conv is IAiConversation & { _id: string } =>
          !!conv &&
          !!conv._id &&
          typeof conv._id === "string" &&
          conv._id.length > 0
      )
      .map((conv) => ({
        _id: conv._id!,
        title:
          conv.title ||
          (conv.messages && conv.messages.length > 0
            ? "New Conversation"
            : "Untitled Conversation"),
        lastActivity: new Date(conv.lastActivity).toISOString(),
        courseId: conv.courseId.toString(),
        messages: conv.messages,
      }));
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

  // Sync messages when selecting a conversation from the cached list
  useEffect(() => {
    if (conversations.length === 0) {
      setSelectedConversationId("");
      setMessages([]);
      return;
    }
    if (selectedConversationId) {
      const conv = conversations.find((c) => c._id === selectedConversationId);
      if (conv?.messages) setMessages(conv.messages);
    }
  }, [conversations, selectedConversationId]);

  const invalidateConversations = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.ai.conversations(studentId),
    });
  const invalidateAnalysisHistory = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.ai.analysisHistory(studentId),
    });

  // Create new conversation
  // Handle new chat button - only clear messages, don't create conversation
  const handleNewChat = () => {
    setSelectedConversationId("");
    setMessages([]);
    setIsConversationSidebarOpen(false);
  };

  const createConversationMutation = useMutation({
    mutationFn: () =>
      aiConversationApi.create({
        courseId,
        studentId,
        title: "",
        lessonId: lessonId,
        initialMessage: inputValue,
      }),
    onSuccess: (newConversation) => {
      invalidateConversations();
      const conversation = {
        _id: newConversation._id || `temp-${Date.now()}`,
        title: "New Conversation",
        lastActivity: new Date(newConversation.lastActivity).toISOString(),
        courseId: newConversation.courseId.toString(),
        messages: newConversation.messages || [],
      };
      setSelectedConversationId(conversation._id);
      setMessages(conversation.messages);
      setIsConversationSidebarOpen(false);
    },
    onSettled: () => {
      setIsCreatingConversation(false);
    },
  });

  const createNewConversation = async () => {
    if (isCreatingConversation) return;
    setIsCreatingConversation(true);
    createConversationMutation.mutate();
  };

  const handleSendMessage = async (value?: string) => {
    const messageContent = (value ?? inputValue).trim();
    if (!messageContent || isCreatingConversation) return;

    // If no conversation is selected, create one first
    if (!selectedConversationId) {
      await createNewConversation();
      // Don't proceed if conversation creation failed
      if (!selectedConversationId) {
        return;
      }
    }

    // Add user message to UI immediately
    const userMessage: IChatMessage = {
      role: "user",
      content: messageContent,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsThinking(true);

    try {
      // Send message to API
      const updatedConversation = await aiConversationApi.sendMessage(
        selectedConversationId,
        {
          message: messageContent,
          lessonId: lessonId,
        }
      );

      setMessages(updatedConversation.messages);
      invalidateConversations();
    } catch (error) {
      if (error instanceof ApiError && error.body) {
        console.error("Send message API error:", error.status, error.message, error.body);
      } else {
        console.error("Failed to send message:", error);
      }

      // Fallback to mock response if API fails
      const timeoutId = setTimeout(() => {
        pendingTimeoutsRef.current = pendingTimeoutsRef.current.filter(
          (t) => t !== timeoutId
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
      // Step a: Find code analysis related to the student
      const existingAnalyses = await codeAnalysisApi.getByStudent(studentId);

      // Filter analyses by current lesson
      const lessonAnalyses = existingAnalyses.filter(
        (analysis) => String(analysis.lessonId) === String(lessonId)
      );

      let analysis: ICodeAnalysis;

      // Step b: If no code-analysis exists, create a new one
      if (lessonAnalyses.length === 0) {
        const progressArr = await progressApi.getByStudent(studentId);
        const progressId =
          Array.isArray(progressArr) && progressArr.length > 0
            ? (progressArr[0] as any)?._id || (progressArr[0] as any)?.id
            : undefined;

        analysis = await codeAnalysisApi.analyze({
          progressId: progressId,
          lessonId: lessonId,
          codeContent: code,
          language: detectLanguage(code),
        });
      } else {
        // Step c: If code-analysis exists, load the latest one and do new analysis
        const latestAnalysis = lessonAnalyses.sort(
          (a, b) =>
            new Date(b.analysisDate).getTime() -
            new Date(a.analysisDate).getTime()
        )[0];

        // Load the existing analysis first
        setCurrentAnalysis(latestAnalysis);
        setCodeFeedback(latestAnalysis.feedback);

        // Then perform a new analysis with the updated code
        const progressArr = await progressApi.getByStudent(studentId);
        const progressId =
          Array.isArray(progressArr) && progressArr.length > 0
            ? (progressArr[0] as any)?._id || (progressArr[0] as any)?.id
            : undefined;

        analysis = await codeAnalysisApi.analyze({
          progressId: progressId,
          lessonId: lessonId,
          codeContent: code,
          language: detectLanguage(code),
        });
      }

      // Update with the latest analysis result
      setCurrentAnalysis(analysis);
      setCodeFeedback(analysis.feedback);

      invalidateAnalysisHistory();
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
            const conversation = conversations.find(
              (c) => c._id === conversationId
            );
            if (conversation) {
              setSelectedConversationId(conversation._id);
              setMessages(conversation.messages || []);
              // Close sidebar after selection on mobile
              setIsConversationSidebarOpen(false);
            }
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
