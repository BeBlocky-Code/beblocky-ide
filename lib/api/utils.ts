import { getSession } from "@/lib/auth-client";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://api.beblocky.com";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

/** Get headers with Bearer token for beblocky-api when session exists */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const { data: session } = await getSession();
  if (session?.token) {
    headers["Authorization"] = `Bearer ${session.token}`;
  }
  return headers;
}

export async function apiCall<T>(
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

/** Call beblocky-api with credentials and Bearer token from session */
export async function apiCallWithAuth<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = await getAuthHeaders();

  const response = await fetch(url, {
    credentials: "include",
    headers: { ...headers, ...(options.headers as Record<string, string>) },
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
