import { ICourse } from "@/types";
import { apiCall } from "./utils";

export const courseApi = {
  getAll: () => apiCall<ICourse[]>("/courses"),
  getById: (id: string) => apiCall<ICourse>(`/courses/${id}`),
  create: (data: Record<string, unknown>) =>
    apiCall<ICourse>("/courses", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Record<string, unknown>) =>
    apiCall<ICourse>(`/courses/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    apiCall<void>(`/courses/${id}`, {
      method: "DELETE",
    }),
};
