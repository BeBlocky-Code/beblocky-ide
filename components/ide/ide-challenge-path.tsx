"use client";

import { useEffect, useState } from "react";
import { Flag } from "lucide-react";
import { apiCall } from "@/lib/api/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "./context/theme-provider";

type PathChallenge = {
  id: string;
  kind: "mcq" | "code";
  prompt: string;
  order: number;
  choices?: string[];
};

export default function IdeChallengePath({
  courseId,
  lessonId,
  code,
}: {
  courseId: string;
  lessonId?: string;
  code?: string;
}) {
  const { theme } = useTheme();
  const accentColor = theme === "dark" ? "#892FFF" : "#FF932C";
  const [fetched, setFetched] = useState<{
    lessonId: string;
    rows: PathChallenge[];
  } | null>(null);
  const [selected, setSelected] = useState<Record<string, number[]>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [scores, setScores] = useState<Record<string, number>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  useEffect(() => {
    if (!lessonId) return;
    let cancelled = false;
    apiCall<PathChallenge[]>(
      `/courses/${courseId}/lessons/${lessonId}/challenges`,
    )
      .then((rows) => {
        if (!cancelled) setFetched({ lessonId, rows });
      })
      .catch(() => {
        if (!cancelled) setFetched({ lessonId, rows: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [courseId, lessonId]);

  const challenges =
    lessonId && fetched?.lessonId === lessonId ? fetched.rows : [];
  const loaded = !lessonId || fetched?.lessonId === lessonId;

  if (!loaded) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
        Loading challenges…
      </div>
    );
  }

  if (!lessonId || challenges.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center py-10 opacity-40">
        <Flag size={32} aria-hidden="true" />
        <p className="text-xs font-bold mt-2">No challenges in this lesson</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-hide p-4 space-y-4">
      {challenges.map((challenge, index) => (
        <div
          key={challenge.id}
          className="rounded-xl border border-border/40 bg-muted/5 p-4 space-y-3"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium leading-relaxed">
              {index + 1}. {challenge.prompt}
            </p>
            <Badge variant="secondary" className="rounded-full shrink-0">
              {challenge.kind === "mcq" ? "MCQ" : "Code"}
            </Badge>
          </div>
          {challenge.kind === "mcq" &&
            (challenge.choices ?? []).map((choice, choiceIndex) => (
              <label
                key={choiceIndex}
                className="flex items-center gap-2 text-sm rounded-xl border border-transparent px-2 py-1.5 hover:bg-muted/50"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-current"
                  style={{ accentColor }}
                  checked={(selected[challenge.id] ?? []).includes(choiceIndex)}
                  onChange={(e) => {
                    const current = new Set(selected[challenge.id] ?? []);
                    if (e.target.checked) current.add(choiceIndex);
                    else current.delete(choiceIndex);
                    setSelected({ ...selected, [challenge.id]: [...current] });
                  }}
                />
                {choice}
              </label>
            ))}
          {challenge.kind === "code" && (
            <textarea
              className="w-full min-h-24 rounded-xl border border-border/40 bg-background p-3 font-mono text-xs"
              placeholder="Write your code"
              value={drafts[challenge.id] ?? code ?? ""}
              onChange={(e) =>
                setDrafts({ ...drafts, [challenge.id]: e.target.value })
              }
            />
          )}
          <div className="flex items-center gap-2">
            <Button
              variant="brand"
              size="sm"
              disabled={submittingId === challenge.id}
              style={{ backgroundColor: accentColor }}
              className="h-10 rounded-full px-5 text-xs font-bold border-none text-white"
              onClick={async () => {
                setSubmittingId(challenge.id);
                try {
                  const result = await apiCall<{ score: number }>(
                    `/challenges/${challenge.id}/attempts`,
                    {
                      method: "POST",
                      body: JSON.stringify(
                        challenge.kind === "code"
                          ? { code: drafts[challenge.id] ?? code ?? "" }
                          : { selectedIndexes: selected[challenge.id] ?? [] },
                      ),
                    },
                  );
                  setScores({ ...scores, [challenge.id]: result.score });
                } catch {
                  /* keep last score */
                } finally {
                  setSubmittingId(null);
                }
              }}
            >
              {submittingId === challenge.id ? "Submitting…" : "Submit"}
            </Button>
            {scores[challenge.id] !== undefined && (
              <Badge variant="secondary" className="rounded-full">
                Score {scores[challenge.id]}
              </Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
