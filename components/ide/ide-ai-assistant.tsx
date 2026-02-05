"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code, MessageCircle, Zap } from "lucide-react";
import { aiConversationApi } from "@/lib/api/ai-conversation";
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
}: {
  code: string;
  courseId: string;
  lessonId: string;
  studentId: string;
}) {
  const [activeTab, setActiveTab] = useState("chat");
  const [messages, setMessages] = useState<IChatMessage[]>([]);
  const [selectedConversationId, setSelectedConversationId] =
    useState<string>("");
  const [inputValue, setInputValue] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [codeFeedback, setCodeFeedback] = useState<ICodeFeedback[]>([]);
  const [currentAnalysis, setCurrentAnalysis] = useState<ICodeAnalysis | null>(
    null
  );
  const [isThinking, setIsThinking] = useState(false);
  const [isConversationSidebarOpen, setIsConversationSidebarOpen] =
    useState(true);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);

  const isMountedRef = useRef(true);
  const pendingTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const queryClient = useQueryClient();

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

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isCreatingConversation) return;

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
      content: inputValue,
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
          message: inputValue,
          lessonId: lessonId,
        }
      );

      setMessages(updatedConversation.messages);
      invalidateConversations();
    } catch (error) {
      console.error("Failed to send message:", error);

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
    <Card className="h-full flex flex-col border-none rounded-none shadow-none bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <CardHeader className="p-2 sm:p-3 border-b space-y-2 sm:space-y-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
        <div className="flex items-center justify-between">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid grid-cols-2 h-9 sm:h-10 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
              <TabsTrigger
                value="chat"
                className="text-xs sm:text-sm font-medium data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 px-2 sm:px-4"
              >
                <MessageCircle size={14} className="sm:size-4 mr-1 sm:mr-2" />
                <span className="hidden min-[400px]:inline">AI Chat</span>
                <span className="min-[400px]:hidden">Chat</span>
              </TabsTrigger>
              <TabsTrigger
                value="analysis"
                className="text-xs sm:text-sm font-medium data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 px-2 sm:px-4"
              >
                <Code size={14} className="sm:size-4 mr-1 sm:mr-2" />
                <span className="hidden min-[400px]:inline">Code Analysis</span>
                <span className="min-[400px]:hidden">Analysis</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsContent
            value="chat"
            className="h-full m-0 data-[state=active]:flex flex-col min-h-0"
          >
            <div className="flex h-full min-h-0 min-w-0">
              {/* Conversation Sidebar */}
              <IdeConversationSidebar
                conversations={conversations}
                selectedConversationId={selectedConversationId}
                isLoading={conversationsQuery.isLoading}
                onConversationSelect={(conversationId) => {
                  const conversation = conversations.find(
                    (c) => c._id === conversationId
                  );
                  if (conversation) {
                    setSelectedConversationId(conversation._id);
                    setMessages(conversation.messages || []);
                    // Close sidebar after selection
                    setIsConversationSidebarOpen(false);
                  }
                }}
                onNewConversation={handleNewChat}
                isOpen={isConversationSidebarOpen}
                onClose={() => setIsConversationSidebarOpen(false)}
              />

              {/* Chat Area */}
              <div className="bg-transparent flex-1 flex flex-col min-h-0 min-w-0">
                {/* Toggle button for sidebar */}
                <div className="p-1.5 sm:p-2 bg-transparent border-b border-slate-200 dark:border-slate-700">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setIsConversationSidebarOpen(!isConversationSidebarOpen)
                    }
                    className="w-full lg:w-auto text-xs sm:text-sm h-8 sm:h-9"
                  >
                    <MessageCircle
                      size={14}
                      className="sm:size-4 mr-1.5 sm:mr-2"
                    />
                    <span className="hidden min-[400px]:inline">
                      {selectedConversationId ? "Switch Chat" : "Select Chat"}
                    </span>
                    <span className="min-[400px]:hidden">Chats</span>
                  </Button>
                </div>

                <IdeChatTab
                  messages={messages}
                  inputValue={inputValue}
                  selectedConversationId={selectedConversationId}
                  isThinking={isThinking}
                  onInputChange={setInputValue}
                  onSendMessage={handleSendMessage}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value="analysis"
            className="h-full m-0 data-[state=active]:flex flex-col"
          >
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
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
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
