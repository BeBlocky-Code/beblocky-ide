"use client";

import { useEffect, useState } from "react";
import { apiCall } from "@/lib/api/utils";
import { Button } from "@/components/ui/button";

type PathNode = {
  id: string;
  kind: "mcq" | "code";
  prompt: string;
  order: number;
  choices?: string[];
};

export default function IdeChallengePath({
  courseId,
  lessonId,
}: {
  courseId: string;
  lessonId?: string;
}) {
  const [nodes, setNodes] = useState<PathNode[]>([]);
  const [selected, setSelected] = useState<Record<string, number[]>>({});
  const [scores, setScores] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!lessonId) return;
    apiCall<PathNode[]>(
      `/courses/${courseId}/lessons/${lessonId}/challenges`
    )
      .then(setNodes)
      .catch(() => setNodes([]));
  }, [courseId, lessonId]);

  if (!lessonId || nodes.length === 0) {
    return null;
  }

  return (
    <div className="border-t p-3 space-y-3">
      <h3 className="text-sm font-semibold">Challenge path</h3>
      {nodes.map((node, index) => (
        <div key={node.id} className="rounded-lg bg-muted/50 p-3 space-y-2">
          <p className="text-sm font-medium">
            {index + 1}. {node.prompt}
          </p>
          {node.kind === "mcq" &&
            (node.choices ?? []).map((choice, choiceIndex) => (
              <label key={choiceIndex} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={(selected[node.id] ?? []).includes(choiceIndex)}
                  onChange={(e) => {
                    const current = new Set(selected[node.id] ?? []);
                    if (e.target.checked) current.add(choiceIndex);
                    else current.delete(choiceIndex);
                    setSelected({ ...selected, [node.id]: [...current] });
                  }}
                />
                {choice}
              </label>
            ))}
          <Button
            size="sm"
            onClick={async () => {
              const result = await apiCall<{ score: number }>(
                `/challenges/${node.id}/attempts`,
                {
                  method: "POST",
                  body: JSON.stringify({
                    selectedIndexes: selected[node.id] ?? [],
                  }),
                }
              );
              setScores({ ...scores, [node.id]: result.score });
            }}
          >
            Submit
          </Button>
          {scores[node.id] !== undefined && (
            <p className="text-xs text-muted-foreground">
              Score: {scores[node.id]}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
