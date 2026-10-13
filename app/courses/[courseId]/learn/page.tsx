import { Suspense } from "react";
import { LearnLoading } from "@/components/ide/learn-loading";
import LearnClient from "@/components/ide/learn/learn-client";
import { decryptCourseId } from "@/lib/utils";

export default async function LearnPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId: encryptedCourseId } = await params;
  const courseId = encryptedCourseId ? decryptCourseId(encryptedCourseId) : "";

  return (
    <Suspense fallback={<LearnLoading />}>
      <LearnClient encryptedCourseId={encryptedCourseId} courseId={courseId} />
    </Suspense>
  );
}
