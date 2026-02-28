import { apiCallWithAuth } from "@/lib/api/utils";

// Student API calls (session-based: credentials + Bearer token)
export const studentApi = {
  getByEmail: (email: string) =>
    apiCallWithAuth<any>(`/students/email/${encodeURIComponent(email)}`),

  getByUserId: (userId: string) =>
    apiCallWithAuth<any>(`/students/user/${userId}`),

  getStreak: (id: string) => apiCallWithAuth<number>(`/students/${id}/streak`),
  getCodingStreak: (id: string) =>
    apiCallWithAuth<{ streak: number }>(`/students/${id}/coding-streak`),
  updateActivity: (id: string, data: Record<string, unknown>) =>
    apiCallWithAuth<Record<string, unknown>>(`/students/${id}/activity`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  getTotalCoins: (id: string) =>
    apiCallWithAuth<{ total: number }>(`/students/${id}/coins/total`),
  addCoins: (id: string, data: Record<string, unknown>) =>
    apiCallWithAuth<Record<string, unknown>>(`/students/${id}/coins/add`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateTimeSpent: (id: string, data: Record<string, unknown>) =>
    apiCallWithAuth<Record<string, unknown>>(`/students/${id}/time-spent`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};
