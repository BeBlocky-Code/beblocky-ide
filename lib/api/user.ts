import { IUser } from "@/types/user";
import { apiCallWithAuth } from "@/lib/api/utils";

// User API calls (session-based; use getById with Bearer token)
export const userApi = {
  getById: (id: string) => apiCallWithAuth<IUser>(`/users/${id}`),
  update: (id: string, data: Record<string, unknown>) =>
    apiCallWithAuth<IUser>(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};
