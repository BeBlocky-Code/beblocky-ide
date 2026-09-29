"use client";

import { useState, useEffect, useCallback } from "react";
import { StickyNote, Plus, Trash2 } from "lucide-react";
import { noteApi } from "@/lib/api/note";

interface Note {
  id: string;
  content: string;
  createdAt: Date;
}

interface IdeNotesPanelProps {
  courseId?: string;
  studentId?: string;
}

function parseNotes(text: string): Note[] {
  if (!text) return [];
  try {
    const parsed: Array<{ id: string; content: string; createdAt: string }> =
      JSON.parse(text);
    if (!Array.isArray(parsed)) {
      return [{ id: "legacy", content: text, createdAt: new Date() }];
    }
    return parsed.map((n) => ({ ...n, createdAt: new Date(n.createdAt) }));
  } catch {
    return [{ id: "legacy", content: text, createdAt: new Date() }];
  }
}

export default function IdeNotesPanel({
  courseId = "default",
}: IdeNotesPanelProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [ready, setReady] = useState(false);

  const persist = useCallback(
    async (next: Note[]) => {
      await noteApi.write(
        courseId,
        JSON.stringify(
          next.map((n) => ({
            id: n.id,
            content: n.content,
            createdAt: n.createdAt.toISOString(),
          }))
        )
      );
    },
    [courseId]
  );

  useEffect(() => {
    let cancelled = false;
    noteApi
      .read(courseId)
      .then((res) => {
        if (!cancelled) {
          setNotes(parseNotes(res.text));
          setReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const addNote = async () => {
    if (!newNote.trim()) return;
    const next = [
      {
        id: Date.now().toString(),
        content: newNote.trim(),
        createdAt: new Date(),
      },
      ...notes,
    ];
    setNotes(next);
    setNewNote("");
    await persist(next);
  };

  const deleteNote = async (id: string) => {
    const next = notes.filter((n) => n.id !== id);
    setNotes(next);
    await persist(next);
  };

  return (
    <div className="h-full flex flex-col bg-background border-l">
      <div className="flex items-center gap-2 px-5 py-4 border-b flex-shrink-0">
        <StickyNote
          size={18}
          style={{ color: "hsl(var(--notes-accent))" }}
        />
        <h2 className="text-sm font-semibold">My Notes</h2>
        <span className="ml-auto text-xs text-muted-foreground">
          {notes.length} {notes.length === 1 ? "note" : "notes"}
        </span>
      </div>

      <div className="px-4 py-3 border-b flex-shrink-0">
        <div className="flex gap-2">
          <input
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addNote()}
            placeholder="Write a note..."
            disabled={!ready}
            className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm outline-none placeholder:text-muted-foreground border border-transparent focus:border-primary/30 transition-colors"
          />
          <button
            onClick={addNote}
            disabled={!newNote.trim() || !ready}
            className="p-2 rounded-lg transition-colors disabled:opacity-30"
            style={{
              background: "hsl(var(--notes-accent) / 0.15)",
              color: "hsl(var(--notes-accent))",
            }}
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 py-3 space-y-2 custom-scrollbar">
        {notes.map((note) => (
          <div
            key={note.id}
            className="group bg-muted/60 rounded-xl px-4 py-3 relative"
          >
            <p className="text-sm leading-relaxed pr-7 break-words">
              {note.content}
            </p>
            <span className="text-xs text-muted-foreground mt-1 block">
              {note.createdAt.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <button
              onClick={() => deleteNote(note.id)}
              className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {notes.length === 0 && (
          <div className="text-center py-16 text-muted-foreground text-sm">
            <StickyNote
              size={32}
              className="mx-auto mb-3 opacity-30"
              style={{ color: "hsl(var(--notes-accent))" }}
            />
            <p>No notes yet.</p>
            <p className="text-xs mt-1 opacity-70">
              Jot down ideas as you learn!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
