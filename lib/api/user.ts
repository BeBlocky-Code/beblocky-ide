import { IUser } from "@/types/user";
import { decryptEmail } from "@/lib/utils";

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
}

// User API calls
export const userApi = {
  getById: (id: string) => apiCall<IUser>(`/users/${id}`),
  getByEmail: (email: string) =>
    apiCall<IUser>(`/users/by-email?email=${decryptEmail(email)}`),
  update: (id: string, data: Record<string, unknown>) =>
    apiCall<IUser>(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};
