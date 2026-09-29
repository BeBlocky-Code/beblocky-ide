import { apiCall } from "./utils";

export const noteApi = {
  read: (courseId: string) =>
    apiCall<{ courseId: string; text: string }>(`/notes/courses/${courseId}`),
  write: (courseId: string, text: string) =>
    apiCall<{ courseId: string; text: string }>(`/notes/courses/${courseId}`, {
      method: "PUT",
      body: JSON.stringify({ text }),
    }),
};
