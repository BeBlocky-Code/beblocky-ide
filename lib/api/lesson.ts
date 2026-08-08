import { ILesson } from "@/types";
import { apiCall } from "./utils";

export const lessonApi = {
  getAll: () => apiCall<ILesson[]>("/lessons"),
  getById: (id: string) => apiCall<ILesson>(`/lessons/${id}`),
  getByCourseId: (courseId: string) =>
    apiCall<ILesson[]>(`/lessons?courseId=${courseId}`),
  create: (data: Record<string, unknown>) =>
    apiCall<ILesson>("/lessons", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Record<string, unknown>) =>
    apiCall<ILesson>(`/lessons/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    apiCall<void>(`/lessons/${id}`, {
      method: "DELETE",
    }),
};
