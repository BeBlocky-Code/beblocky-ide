import { QueryClient } from "@tanstack/react-query";

const staleTimeCourse = 5 * 60 * 1000; // 5 minutes for course/content
const staleTimeProgress = 60 * 1000; // 1 minute for progress
const gcTime = 30 * 60 * 1000; // 30 minutes

export const defaultQueryClientOptions = {
  defaultOptions: {
    queries: {
      staleTime: staleTimeProgress,
      gcTime,
      refetchOnWindowFocus: false,
      retry: 2,
      retryDelay: (attemptIndex: number) =>
        Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
};

export function makeQueryClient() {
  return new QueryClient(defaultQueryClientOptions);
}
