import { Suspense } from "react";
import { LearnLoading } from "@/components/ide/learn-loading";
import { LearnSessionProvider } from "@/components/ide/learn-session-provider";
import { getLearnSession } from "@/lib/server/learn-session";

export default function LearnLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<LearnLoading />}>
      <LearnSessionGate>{children}</LearnSessionGate>
    </Suspense>
  );
}

async function LearnSessionGate({ children }: { children: React.ReactNode }) {
  const session = await getLearnSession();
  return <LearnSessionProvider session={session}>{children}</LearnSessionProvider>;
}
