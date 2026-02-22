import { redirect } from "next/navigation";

export default async function LearnPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  // Server-side redirect before any response is sent - avoids ERR_HTTP_HEADERS_SENT
  redirect(`/courses/${courseId}/learn/user/guest`);
}
