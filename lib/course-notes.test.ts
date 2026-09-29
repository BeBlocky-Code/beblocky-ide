import assert from "node:assert/strict";
import test from "node:test";
import {
  createCourseNote,
  filterCourseNotes,
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
} from "./course-notes.ts";

test("plain text from the old notebook becomes one note", () => {
  const notes = parseCourseNotes("remember the loop");
  assert.equal(notes.length, 1);
  assert.equal(notes[0]?.content, "remember the loop");
  assert.equal(noteDisplayTitle(notes[0]!), "remember the loop");
});

test("legacy JSON notes without titles still open", () => {
  const notes = parseCourseNotes(
    JSON.stringify([
      { id: "1", content: "CSS box model", createdAt: "2026-01-01T00:00:00.000Z" },
    ]),
  );
  assert.equal(notes[0]?.title, "CSS box model");
  assert.equal(notes[0]?.pinned, false);
});

test("round-trip keeps title, pin, and body", () => {
  const original = [
    {
      ...createCourseNote(new Date("2026-09-29T08:00:00.000Z")),
      title: "Selectors",
      content: "class vs id",
      pinned: true,
    },
  ];
  const again = parseCourseNotes(serializeCourseNotes(original));
  assert.equal(again[0]?.title, "Selectors");
  assert.equal(again[0]?.content, "class vs id");
  assert.equal(again[0]?.pinned, true);
});

test("search matches title or body", () => {
  const notes = parseCourseNotes(
    serializeCourseNotes([
      {
        ...createCourseNote(),
        title: "Loops",
        content: "for and while",
      },
      {
        ...createCourseNote(),
        title: "Colors",
        content: "background-color",
      },
    ]),
  );
  assert.equal(filterCourseNotes(notes, "while").length, 1);
  assert.equal(filterCourseNotes(notes, "color").length, 1);
});

test("pinned notes stay at the top", () => {
  const older = {
    ...createCourseNote(new Date("2026-09-01T00:00:00.000Z")),
    title: "Old pin",
    pinned: true,
  };
  const newer = {
    ...createCourseNote(new Date("2026-09-29T00:00:00.000Z")),
    title: "Fresh",
    pinned: false,
  };
  const sorted = sortCourseNotes([newer, older]);
  assert.equal(sorted[0]?.title, "Old pin");
});

test("blank notes are discarded", () => {
  assert.equal(isBlankNote(createCourseNote()), true);
});

test("snippets skip repeating the title", () => {
  const note = {
    ...createCourseNote(),
    title: "Flexbox",
    content: "row and column",
  };
  assert.equal(noteSnippet(note), "row and column");
});

test("relative time is readable", () => {
  const now = new Date("2026-09-29T12:00:00.000Z");
  assert.equal(formatNoteTime(now.toISOString(), now), "Just now");
  assert.equal(
    formatNoteTime("2026-09-29T11:50:00.000Z", now),
    "10m ago",
  );
  assert.equal(
    formatNoteTime("2026-09-28T12:00:00.000Z", now),
    "Yesterday",
  );
});

test("checklist inserts on its own line", () => {
  const result = insertChecklistLine("Buy milk", 8);
  assert.equal(result.content, "Buy milk\n- [ ] ");
});

test("board filters by pin and calendar day", () => {
  const now = new Date("2026-09-29T12:00:00.000Z");
  const today = {
    ...createCourseNote(now),
    title: "Today pin",
    pinned: true,
  };
  const earlier = {
    ...createCourseNote(new Date("2026-09-20T12:00:00.000Z")),
    title: "Old note",
    pinned: false,
  };
  const board = [today, earlier];
  assert.equal(filterNotesBoard(board, { status: "pinned" }).length, 1);
  assert.equal(filterNotesBoard(board, { when: "today", now }).length, 1);
  assert.equal(noteWhenBadge(today.updatedAt, now), "Today");
  assert.equal(noteWhenBadge(earlier.updatedAt, now), "Earlier");
});
