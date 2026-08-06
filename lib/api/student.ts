import { apiCall } from "./utils";

// Student API calls — Bearer attached by apiCall from the auth-service session.
export const studentApi = {
  getByEmail: (email: string) =>
    apiCall<any>(`/students/email/${encodeURIComponent(email)}`),

  getByUserId: (userId: string) => apiCall<any>(`/students/user/${userId}`),

  getStreak: (id: string) => apiCall<number>(`/students/${id}/streak`),
  getCodingStreak: (id: string) =>
    apiCall<{ streak: number }>(`/students/${id}/coding-streak`),
  updateActivity: (id: string, data: Record<string, unknown>) =>
    apiCall<Record<string, unknown>>(`/students/${id}/activity`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  getTotalCoins: (id: string) =>
    apiCall<{ total: number }>(`/students/${id}/coins/total`),
  addCoins: (id: string, data: Record<string, unknown>) =>
    apiCall<Record<string, unknown>>(`/students/${id}/coins/add`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateTimeSpent: (id: string, data: Record<string, unknown>) =>
    apiCall<Record<string, unknown>>(`/students/${id}/time-spent`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};
