"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  ListChecks,
  Pin,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { noteApi } from "@/lib/api/note";
import {
  createCourseNote,
  filterNotesBoard,
  formatNoteTime,
  insertChecklistLine,
  isBlankNote,
  noteDisplayTitle,
  noteSnippet,
  noteWhenBadge,
  parseCourseNotes,
  serializeCourseNotes,
  sortCourseNotes,
  type CourseNoteItem,
  type NoteStatusFilter,
  type NoteWhenFilter,
} from "@/lib/course-notes";
import { cn } from "@/lib/utils";

interface IdeNotesPanelProps {
  courseId?: string;
  studentId?: string;
}

type SaveState = "saved" | "saving" | "error";

function Chip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "h-8 shrink-0 rounded-full border px-3 text-xs font-medium",
        "transition-[color,background-color,border-color,transform] duration-150 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "active:scale-[0.96]",
        pressed
          ? "border-transparent bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:bg-muted/70",
      )}
    >
      {children}
    </button>
  );
}

function TimeBadge({ iso }: { iso: string }) {
  const label = noteWhenBadge(iso);
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-medium",
        label === "Today" &&
          "bg-[hsl(var(--notes-accent)/0.18)] text-[hsl(var(--notes-accent))]",
        label === "Yesterday" && "bg-primary/15 text-primary",
        label === "Earlier" && "bg-muted text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}

export default function IdeNotesPanel({
  courseId = "default",
}: IdeNotesPanelProps) {
  const [notes, setNotes] = useState<CourseNoteItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [when, setWhen] = useState<NoteWhenFilter>("all");
  const [status, setStatus] = useState<NoteStatusFilter>("all");
  const [ready, setReady] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const skipNextSave = useRef(true);
  const notesRef = useRef(notes);
  notesRef.current = notes;

  const persist = useCallback(async () => {
    const payload = notesRef.current.filter((note) => !isBlankNote(note));
    setSaveState("saving");
    try {
      await noteApi.write(courseId, serializeCourseNotes(payload));
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }, [courseId]);

  useEffect(() => {
    let cancelled = false;
    skipNextSave.current = true;
    setReady(false);
    setSelectedId(null);
    setConfirmDelete(false);
    noteApi
      .read(courseId)
      .then((res) => {
        if (cancelled) return;
        setNotes(sortCourseNotes(parseCourseNotes(res.text)));
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setNotes([]);
          setReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  useEffect(() => {
    if (!ready) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    const timer = setTimeout(() => {
      void persist();
    }, 450);
    return () => clearTimeout(timer);
  }, [notes, ready, persist]);

  useEffect(() => {
    return () => {
      const leftover = notesRef.current.filter((note) => !isBlankNote(note));
      if (leftover.length === 0) return;
      void noteApi.write(courseId, serializeCourseNotes(leftover));
    };
  }, [courseId]);

  const visibleNotes = useMemo(
    () => filterNotesBoard(notes, { status, when }),
    [notes, status, when],
  );
  const selected = notes.find((note) => note.id === selectedId) ?? null;
  const editing = selected != null;

  const patchSelected = (patch: Partial<CourseNoteItem>) => {
    if (!selectedId) return;
    setConfirmDelete(false);
    setNotes((prev) =>
      prev.map((note) =>
        note.id === selectedId
          ? { ...note, ...patch, updatedAt: new Date().toISOString() }
          : note,
      ),
    );
  };

  const startNote = () => {
    const next = createCourseNote();
    setWhen("all");
    setStatus("all");
    setConfirmDelete(false);
    setNotes((prev) => [next, ...prev.filter((note) => !isBlankNote(note))]);
    setSelectedId(next.id);
    requestAnimationFrame(() => titleRef.current?.focus());
  };

  const closeEditor = () => {
    setNotes((prev) => prev.filter((note) => !isBlankNote(note)));
    setSelectedId(null);
    setConfirmDelete(false);
  };

  const selectNote = (id: string) => {
    setNotes((prev) =>
      prev.filter((note) => note.id === id || !isBlankNote(note)),
    );
    setSelectedId(id);
    setConfirmDelete(false);
  };

  const togglePin = (id: string) => {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === id
          ? {
              ...note,
              pinned: !note.pinned,
              updatedAt: new Date().toISOString(),
            }
          : note,
      ),
    );
  };

  const removeSelected = () => {
    if (!selectedId) return;
    setNotes((prev) => prev.filter((note) => note.id !== selectedId));
    setSelectedId(null);
    setConfirmDelete(false);
  };

  const addChecklist = () => {
    if (!selected) return;
    const cursor = bodyRef.current?.selectionStart ?? selected.content.length;
    const result = insertChecklistLine(selected.content, cursor);
    patchSelected({ content: result.content });
    requestAnimationFrame(() => {
      bodyRef.current?.focus();
      bodyRef.current?.setSelectionRange(result.cursor, result.cursor);
    });
  };

  const saveLabel =
    saveState === "saving"
      ? "Saving…"
      : saveState === "error"
        ? "Couldn't save"
        : "Saved";

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex shrink-0 items-center gap-2 border-b px-3 py-2.5">
        {editing ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-10 w-10"
            aria-label="Back to notes"
            onClick={closeEditor}
          >
            <ChevronLeft
              aria-hidden="true"
              size={18}
              strokeWidth={2}
              className="rtl:-scale-x-100"
            />
          </Button>
        ) : (
          <FileText
            aria-hidden="true"
            size={18}
            strokeWidth={2}
            className="shrink-0"
            style={{ color: "hsl(var(--notes-accent))" }}
          />
        )}
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">
          {editing ? noteDisplayTitle(selected) : "Notes"}
        </h2>
        {!editing && (
          <Button
            type="button"
            variant="outline"
            className="h-10 gap-1.5 rounded-full ps-2.5 pe-3.5 transition-transform duration-150 ease-out active:scale-[0.96]"
            disabled={!ready}
            onClick={startNote}
          >
            <Plus aria-hidden="true" size={16} strokeWidth={2} />
            Add Notes
          </Button>
        )}
      </header>

      {editing && selected ? (
        <section
          className="flex min-h-0 flex-1 flex-col"
          aria-label="Note editor"
        >
          <div className="flex min-h-0 flex-1 flex-col px-3 pt-3">
            <input
              ref={titleRef}
              value={selected.title}
              onChange={(e) => patchSelected({ title: e.target.value })}
              placeholder="Title"
              aria-label="Note title"
              disabled={!ready}
              className="w-full rounded-md bg-transparent px-1 py-1 text-base font-semibold placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <textarea
              ref={bodyRef}
              value={selected.content}
              onChange={(e) => patchSelected({ content: e.target.value })}
              placeholder="Write the note. Use the checklist for steps you want to try."
              aria-label="Note body"
              disabled={!ready}
              className="mt-1 min-h-0 w-full flex-1 resize-none rounded-md bg-transparent px-1 py-1 text-sm leading-relaxed placeholder:text-muted-foreground custom-scrollbar focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <footer className="flex shrink-0 flex-wrap items-center gap-1 border-t px-2 py-1.5">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-10 w-10"
              aria-label="Add checklist item"
              onClick={addChecklist}
            >
              <ListChecks aria-hidden="true" size={16} strokeWidth={2} />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-10 w-10"
              aria-pressed={selected.pinned}
              aria-label={selected.pinned ? "Unpin note" : "Pin note"}
              onClick={() => togglePin(selected.id)}
            >
              <Pin
                aria-hidden="true"
                size={16}
                strokeWidth={2}
                className={selected.pinned ? "fill-current" : undefined}
                style={
                  selected.pinned
                    ? { color: "hsl(var(--notes-accent))" }
                    : undefined
                }
              />
            </Button>
            {confirmDelete ? (
              <div className="ml-auto flex items-center gap-1">
                <span className="px-1 text-xs text-muted-foreground">
                  Delete this note?
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmDelete(false)}
                >
                  Keep
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={removeSelected}
                >
                  Delete
                </Button>
              </div>
            ) : (
              <>
                <span
                  className={cn(
                    "ml-auto px-2 text-[11px] tabular-nums",
                    saveState === "error"
                      ? "text-destructive"
                      : "text-muted-foreground",
                  )}
                >
                  {saveLabel}
                </span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-10 w-10 text-muted-foreground hover:text-destructive"
                  aria-label="Delete note"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 aria-hidden="true" size={16} strokeWidth={2} />
                </Button>
              </>
            )}
          </footer>
        </section>
      ) : (
        <>
          <div
            className="flex shrink-0 gap-2 overflow-x-auto px-3 py-2.5"
            role="group"
            aria-label="Filter notes"
          >
            <Chip pressed={when === "all"} onClick={() => setWhen("all")}>
              Time: All
            </Chip>
            <Chip pressed={when === "today"} onClick={() => setWhen("today")}>
              Today
            </Chip>
            <Chip
              pressed={when === "earlier"}
              onClick={() => setWhen("earlier")}
            >
              Earlier
            </Chip>
            <Chip
              pressed={status === "all"}
              onClick={() => setStatus("all")}
            >
              Status: All
            </Chip>
            <Chip
              pressed={status === "pinned"}
              onClick={() => setStatus("pinned")}
            >
              Pinned
            </Chip>
          </div>

          <div className="min-h-0 flex-1 overflow-auto px-3 pb-3 custom-scrollbar">
            {!ready ? (
              <p className="px-1 py-6 text-sm text-muted-foreground">
                Opening your notes…
              </p>
            ) : visibleNotes.length === 0 ? (
              <div className="flex flex-col items-center px-2 py-10 text-center">
                <FileText
                  aria-hidden="true"
                  size={28}
                  strokeWidth={1.5}
                  className="mb-3 opacity-40"
                  style={{ color: "hsl(var(--notes-accent))" }}
                />
                <p className="text-sm font-medium">
                  {notes.some((note) => !isBlankNote(note))
                    ? "No notes match these filters"
                    : "No notes yet"}
                </p>
                <p className="mt-1 max-w-[16rem] text-xs text-muted-foreground text-pretty">
                  {notes.some((note) => !isBlankNote(note))
                    ? "Clear a filter, or add a new note."
                    : "Capture a step, a question, or something you want to try."}
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {visibleNotes.map((note) => (
                  <li key={note.id}>
                    <button
                      type="button"
                      onClick={() => selectNote(note.id)}
                      className={cn(
                        "flex w-full items-start gap-2 rounded-2xl bg-muted/50 p-3.5 text-left",
                        "transition-[background-color,transform] duration-150 ease-out hover:bg-muted",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        "active:scale-[0.96]",
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate text-sm font-semibold">
                            {noteDisplayTitle(note)}
                          </span>
                          <TimeBadge iso={note.updatedAt} />
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-medium",
                              note.pinned
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                : "bg-primary/10 text-primary",
                            )}
                          >
                            {note.pinned ? "Pinned" : "Open"}
                          </span>
                        </span>
                        <span className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {noteSnippet(note)}
                        </span>
                        <span className="mt-1.5 block text-[11px] tabular-nums text-muted-foreground">
                          {formatNoteTime(note.updatedAt)}
                        </span>
                      </span>
                      <ChevronRight
                        aria-hidden="true"
                        size={16}
                        strokeWidth={2}
                        className="mt-1 shrink-0 text-muted-foreground rtl:-scale-x-100"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
