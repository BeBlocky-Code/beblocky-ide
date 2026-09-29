export type CourseNoteItem = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  pinned: boolean;
};

function firstLine(text: string): string {
  const line = text.split(/\r?\n/, 1)[0]?.trim() ?? "";
  return line;
}

function asIso(value: unknown, fallback: string): string {
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) return value;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  return fallback;
}

export function createCourseNote(now = new Date()): CourseNoteItem {
  const iso = now.toISOString();
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `note-${now.getTime()}`,
    title: "",
    content: "",
    createdAt: iso,
    updatedAt: iso,
    pinned: false,
  };
}

export function isBlankNote(note: CourseNoteItem): boolean {
  return !note.title.trim() && !note.content.trim();
}

export function noteDisplayTitle(note: CourseNoteItem): string {
  const titled = note.title.trim();
  if (titled) return titled;
  const fromBody = firstLine(note.content);
  return fromBody || "Untitled note";
}

export function noteSnippet(note: CourseNoteItem, max = 72): string {
  const body = note.content.trim();
  if (!body) return "No extra text";
  const withoutTitle =
    note.title.trim() && body.startsWith(note.title.trim())
      ? body.slice(note.title.trim().length).trim()
      : body;
  const text = (withoutTitle || body).replace(/\s+/g, " ");
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}

export function parseCourseNotes(text: string): CourseNoteItem[] {
  if (!text.trim()) return [];
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!Array.isArray(parsed)) {
      const now = new Date().toISOString();
      return [
        {
          id: "legacy",
          title: firstLine(text),
          content: text,
          createdAt: now,
          updatedAt: now,
          pinned: false,
        },
      ];
    }
    return parsed.map((raw, index) => {
      const row = raw as Partial<CourseNoteItem> & { createdAt?: unknown };
      const content = typeof row.content === "string" ? row.content : "";
      const createdAt = asIso(row.createdAt, new Date().toISOString());
      return {
        id: typeof row.id === "string" && row.id ? row.id : `note-${index}`,
        title:
          typeof row.title === "string" && row.title.trim()
            ? row.title
            : firstLine(content),
        content,
        createdAt,
        updatedAt: asIso(row.updatedAt, createdAt),
        pinned: Boolean(row.pinned),
      };
    });
  } catch {
    const now = new Date().toISOString();
    return [
      {
        id: "legacy",
        title: firstLine(text),
        content: text,
        createdAt: now,
        updatedAt: now,
        pinned: false,
      },
    ];
  }
}

export function serializeCourseNotes(notes: CourseNoteItem[]): string {
  return JSON.stringify(
    notes.map((note) => ({
      id: note.id,
      title: note.title,
      content: note.content,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      pinned: note.pinned,
    })),
  );
}

export function filterCourseNotes(
  notes: CourseNoteItem[],
  query: string,
): CourseNoteItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return notes;
  return notes.filter((note) => {
    return (
      note.title.toLowerCase().includes(q) ||
      note.content.toLowerCase().includes(q)
    );
  });
}

export type NoteStatusFilter = "all" | "pinned";
export type NoteWhenFilter = "all" | "today" | "earlier";

export function noteWhenBadge(
  iso: string,
  now = new Date(),
): "Today" | "Yesterday" | "Earlier" {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "Earlier";
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const startYesterday = new Date(startToday);
  startYesterday.setDate(startYesterday.getDate() - 1);
  if (then >= startToday) return "Today";
  if (then >= startYesterday) return "Yesterday";
  return "Earlier";
}

export function filterNotesBoard(
  notes: CourseNoteItem[],
  opts: {
    query?: string;
    status?: NoteStatusFilter;
    when?: NoteWhenFilter;
    now?: Date;
  },
): CourseNoteItem[] {
  const now = opts.now ?? new Date();
  let next = filterCourseNotes(notes, opts.query ?? "");
  if (opts.status === "pinned") {
    next = next.filter((note) => note.pinned);
  }
  if (opts.when === "today") {
    next = next.filter((note) => noteWhenBadge(note.updatedAt, now) === "Today");
  }
  if (opts.when === "earlier") {
    next = next.filter((note) => noteWhenBadge(note.updatedAt, now) !== "Today");
  }
  return sortCourseNotes(next);
}

export function sortCourseNotes(notes: CourseNoteItem[]): CourseNoteItem[] {
  return [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
  });
}

export function formatNoteTime(iso: string, now = new Date()): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  return then.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function insertChecklistLine(content: string, cursor: number): {
  content: string;
  cursor: number;
} {
  const line = "- [ ] ";
  const before = content.slice(0, cursor);
  const after = content.slice(cursor);
  const needsBreak = before.length > 0 && !before.endsWith("\n");
  const inserted = `${needsBreak ? "\n" : ""}${line}`;
  return {
    content: `${before}${inserted}${after}`,
    cursor: before.length + inserted.length,
  };
}
