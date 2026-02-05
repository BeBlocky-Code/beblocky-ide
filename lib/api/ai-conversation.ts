import { IAiConversation, IChatMessage } from "@/types/ai";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://api.beblocky.com";

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new ApiError(
        response.status,
        `API call failed: ${response.statusText}`
      );
    }

    return response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // For development, return mock data if API is not available
    if (process.env.NODE_ENV === "development") {
      return getMockResponse(endpoint, options.method) as T;
    }

    throw new ApiError(
      0,
      `Network error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// Mock responses for development when backend is not available
function getMockResponse(endpoint: string, method?: string): any {
  if (method === "POST" && endpoint === "/ai-conversations") {
    return {
      _id: "mock-conversation-id",
      courseId: "mock-course-id",
      studentId: "mock-student-id",
      title: "Mock Conversation",
      messages: [
        {
          role: "system",
          content: "You are an AI coding tutor specializing in JavaScript...",
          timestamp: new Date().toISOString(),
          metadata: {
            courseContext: {
              course: { title: "JavaScript Basics", language: "javascript" },
              lessons: [],
              slides: [],
            },
          },
        },
      ],
      isActive: true,
      lastActivity: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  if (endpoint.includes("/messages") && method === "POST") {
    // In this mock, simulate title generation logic without relying on a generateTitle property in the payload
    // For demonstration, we'll assume if the user's last message contains the word "title", generate a title
    let generateTitle = false;
    try {
      generateTitle = false;
    } catch (e) {
      console.error("Error generating title:", e);
    }

    const title = generateTitle
      ? "AI Generated Title Based on Your Question"
      : "Mock Conversation";

    return {
      _id: "mock-conversation-id",
      courseId: "mock-course-id",
      studentId: "mock-student-id",
      title,
      messages: [
        {
          role: "user",
          content: "Test message",
          timestamp: new Date().toISOString(),
        },
        {
          role: "assistant",
          content:
            "This is a mock AI response to help with your coding questions.",
          timestamp: new Date().toISOString(),
        },
      ],
      isActive: true,
      lastActivity: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  if (endpoint.includes("/student/")) {
    return [
      {
        _id: "mock-conversation-id",
        title: "Mock Conversation 1",
        lastActivity: new Date().toISOString(),
        courseId: "mock-course-id",
      },
    ];
  }

  return {};
}

// AI Conversation API calls
export const aiConversationApi = {
  // Create new conversation
  create: (data: {
    courseId: string;
    studentId: string;
    title?: string;
    initialMessage?: string;
    lessonId?: string;
    slideId?: string;
  }) =>
    apiCall<IAiConversation>("/ai-conversations", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Get conversation by ID
  getById: (id: string) => apiCall<IAiConversation>(`/ai-conversations/${id}`),

  // Get conversations for a student
  getByStudent: (studentId: string) =>
    apiCall<IAiConversation[]>(
      `/ai-conversations/student/${encodeURIComponent(studentId)}`
    ).catch((error) => {
      // If API fails, return empty array instead of throwing
      return [];
    }),

  // Get conversations for a course
  getByCourse: (courseId: string) =>
    apiCall<IAiConversation[]>(`/ai-conversations/course/${courseId}`),

  // Send message in conversation
  sendMessage: (
    conversationId: string,
    data: {
      message: string;
      lessonId?: string;
      slideId?: string;
    }
  ) =>
    apiCall<IAiConversation>(`/ai-conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Delete conversation
  delete: (id: string) =>
    apiCall<void>(`/ai-conversations/${id}`, {
      method: "DELETE",
    }),
};
