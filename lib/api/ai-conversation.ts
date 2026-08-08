import { IAiConversation } from "@/types/ai";
import { apiCall, ApiError } from "./utils";

export { ApiError };

export const aiConversationApi = {
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

  getById: (id: string) => apiCall<IAiConversation>(`/ai-conversations/${id}`),

  getByStudent: (studentId: string) =>
    apiCall<IAiConversation[]>(
      `/ai-conversations/student/${encodeURIComponent(studentId)}`,
    ),

  getByCourse: (courseId: string) =>
    apiCall<IAiConversation[]>(`/ai-conversations/course/${courseId}`),

  sendMessage: (
    conversationId: string,
    data: {
      message: string;
      lessonId?: string;
      slideId?: string;
    },
  ) => {
    const body: Record<string, string> = { message: data.message };
    if (data.lessonId?.trim()) body.lessonId = data.lessonId.trim();
    if (data.slideId?.trim()) body.slideId = data.slideId.trim();
    return apiCall<IAiConversation>(
      `/ai-conversations/${conversationId}/messages`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );
  },

  delete: (id: string) =>
    apiCall<void>(`/ai-conversations/${id}`, {
      method: "DELETE",
    }),
};
