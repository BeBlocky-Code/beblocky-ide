import assert from "node:assert/strict";
import test from "node:test";
import type { ILesson, ISlide } from "@/types";
import {
  normalizeCourseLanguage,
  resolveInitialPosition,
  slidesForLesson,
  sortSlidesByOrder,
} from "./slides.ts";

const slide = (id: string, order: number, startingCode = "") =>
  ({ _id: id, order, startingCode }) as unknown as ISlide;
const lesson = (id: string, slides: ISlide[]) =>
  ({ _id: id, slides }) as unknown as ILesson;

test("sortSlidesByOrder sorts by order and drops non-objects", () => {
  const sorted = sortSlidesByOrder([slide("b", 2), null as unknown as ISlide, slide("a", 1)]);
  assert.deepEqual(
    sorted.map((s) => s._id),
    ["a", "b"],
  );
});

test("normalizeCourseLanguage accepts known languages only", () => {
  assert.equal(normalizeCourseLanguage({ courseLanguage: "Python" }), "python");
  assert.equal(normalizeCourseLanguage({ language: "ruby" }), "web");
  assert.equal(normalizeCourseLanguage(undefined), "web");
});

test("slidesForLesson returns sorted slides or empty", () => {
  const lessons = [lesson("l1", [slide("b", 2), slide("a", 1)])];
  assert.equal(slidesForLesson(lessons, "l1")[0]._id, "a");
  assert.deepEqual(slidesForLesson(lessons, "nope"), []);
});

test("resolveInitialPosition starts at the first lesson without progress", () => {
  const lessons = [lesson("l1", [slide("a", 1, "x")]), lesson("l2", [])];
  assert.deepEqual(resolveInitialPosition(lessons, null), {
    lessonId: "l1",
    slideIndex: 0,
    code: "x",
  });
  assert.deepEqual(resolveInitialPosition([], null), {
    lessonId: "",
    slideIndex: 0,
    code: "",
  });
});

test("resolveInitialPosition resumes lesson, slide and saved code", () => {
  const lessons = [
    lesson("l1", [slide("a", 1, "x")]),
    lesson("l2", [slide("c", 1, "c0"), slide("d", 2, "d0")]),
  ];
  assert.deepEqual(
    resolveInitialPosition(lessons, { currentLesson: "l2", currentSlide: "d" }),
    { lessonId: "l2", slideIndex: 1, code: "d0" },
  );
  assert.equal(
    resolveInitialPosition(lessons, {
      currentLesson: "l2",
      lessonCode: { l2: { code: "mine" } },
    }).code,
    "mine",
  );
  assert.equal(
    resolveInitialPosition(lessons, { currentLesson: "gone" }).lessonId,
    "l1",
  );
});
