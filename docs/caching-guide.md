# Client-Side Caching Guide (TanStack Query)

This app uses **TanStack Query (React Query) v5** for client-side caching. Data is cached in memory and optionally persisted to `localStorage` so that navigation and full page refresh avoid redundant API calls until data is stale.

## Query keys

All cache keys are defined in **`lib/query-keys.ts`**. Use these keys everywhere so invalidation is consistent.

- **Courses**: `queryKeys.courses.withContent(courseId)`, `queryKeys.courses.detail(courseId)`
- **Users**: `queryKeys.users.byEmail(email)`
- **Students**: `queryKeys.students.byEmail(email)`
- **Progress**: `queryKeys.progress.byStudentAndCourse(studentId, courseId)`, `queryKeys.progress.byStudent(studentId)`
- **AI**: `queryKeys.ai.conversations(studentId)`, `queryKeys.ai.analysisHistory(studentId)`

## Adding a new read (query)

1. Add a key to `lib/query-keys.ts` if the resource is new (e.g. `myResource.byId(id)`).
2. Use `useQuery` with that key and a `queryFn` that calls your API:

```tsx
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { myApi } from "@/lib/api/my-api";

const { data, isLoading, error, refetch } = useQuery({
  queryKey: queryKeys.myResource.byId(id),
  queryFn: () => myApi.getById(id),
  enabled: !!id,
  staleTime: 60 * 1000, // 1 minute; optional, defaults from query-client.ts
});
```

3. Use `data`, `isLoading`, `error` (and optionally `refetch`) in your UI.

## Adding a new write (mutation) and invalidating cache

1. Use `useMutation` with a `mutationFn` that calls your API.
2. In `onSuccess` (or in a global mutation cache), invalidate the queries that are now stale:

```tsx
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

const queryClient = useQueryClient();

const myMutation = useMutation({
  mutationFn: (payload) => myApi.update(id, payload),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.myResource.byId(id) });
    // Or invalidate a list: queryKeys.myResource.all
  },
});
```

3. Call `myMutation.mutate(payload)` (or `mutateAsync`) from your handler.

## Best practices

- **Always use the query key factory** (`queryKeys.*`) so the same key is used for the same resource everywhere; invalidation then stays consistent.
- **Set `staleTime`** for reads so the cache is reused for that period (e.g. 5 minutes for course content, 1 minute for progress).
- **Invalidate after mutations** so the next read refetches and the UI stays in sync.
- **Use `enabled`** so queries only run when required (e.g. when `id` or `studentId` is present).
- **Optional: optimistic updates** – update the cache in `onMutate` and rollback in `onError` for snappier UI.

## Persistence

The app optionally persists the query cache to `localStorage` (see `components/providers/query-provider.tsx`) with a 30-minute `maxAge`. After a full page refresh, cached data is restored and used until it is stale or expired, reducing API calls on reload.

## Server-side caching (Redis-like)

Caching in this repo is **client-side only**. For server-side caching (e.g. Redis, Upstash, Vercel KV), add a cache layer in your backend or in Next.js API routes that proxy to your API. See the plan in `.cursor/plans/` for product suggestions and patterns.
