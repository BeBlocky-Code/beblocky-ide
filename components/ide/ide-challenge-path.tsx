"use client";

import { useEffect, useState } from "react";
import { apiCall } from "@/lib/api/utils";
import { Button } from "@/components/ui/button";

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
  const [challenges, setChallenges] = useState<PathChallenge[]>([]);
  const [selected, setSelected] = useState<Record<string, number[]>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [scores, setScores] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!lessonId) return;
    apiCall<PathChallenge[]>(
      `/courses/${courseId}/lessons/${lessonId}/challenges`
    )
      .then(setChallenges)
      .catch(() => setChallenges([]));
  }, [courseId, lessonId]);

  if (!lessonId || challenges.length === 0) {
    return null;
  }

  return (
    <div className="border-t p-3 space-y-3">
      <h3 className="text-sm font-semibold">Challenge path</h3>
      {challenges.map((challenge, index) => (
        <div key={challenge.id} className="rounded-lg bg-muted/50 p-3 space-y-2">
          <p className="text-sm font-medium">
            {index + 1}. {challenge.prompt}
          </p>
          {challenge.kind === "mcq" &&
            (challenge.choices ?? []).map((choice, choiceIndex) => (
              <label key={choiceIndex} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
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
              className="w-full min-h-24 rounded-md border bg-background p-2 font-mono text-xs"
              placeholder="Write your code"
              value={drafts[challenge.id] ?? code ?? ""}
              onChange={(e) =>
                setDrafts({ ...drafts, [challenge.id]: e.target.value })
              }
            />
          )}
          <Button
            size="sm"
            onClick={async () => {
              const result = await apiCall<{ score: number }>(
                `/challenges/${challenge.id}/attempts`,
                {
                  method: "POST",
                  body: JSON.stringify(
                    challenge.kind === "code"
                      ? { code: drafts[challenge.id] ?? code ?? "" }
                      : { selectedIndexes: selected[challenge.id] ?? [] }
                  ),
                }
              );
              setScores({ ...scores, [challenge.id]: result.score });
            }}
          >
            Submit
          </Button>
          {scores[challenge.id] !== undefined && (
            <p className="text-xs text-muted-foreground">
              Score: {scores[challenge.id]}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
