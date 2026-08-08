import { ISlide } from "@/types";
import { apiCall } from "./utils";

export const slideApi = {
  getAll: () => apiCall<ISlide[]>("/slides"),
  getById: (id: string) => apiCall<ISlide>(`/slides/${id}`),
  getByCourseId: (courseId: string) =>
    apiCall<ISlide[]>(`/slides?courseId=${courseId}`),
  getByLessonId: (lessonId: string) =>
    apiCall<ISlide[]>(`/slides?lessonId=${lessonId}`),
  create: (data: Record<string, unknown>) =>
    apiCall<ISlide>("/slides", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Record<string, unknown>) =>
    apiCall<ISlide>(`/slides/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    apiCall<void>(`/slides/${id}`, {
      method: "DELETE",
    }),
};
