import assert from "node:assert/strict";
import test from "node:test";
import {
  idePageError,
  isLearnerRole,
  primaryUserRole,
  shouldFetchStudentProfile,
} from "./ide-access.ts";

test("a teacher is not a learner", () => {
  assert.equal(isLearnerRole(["teacher"]), false);
  assert.equal(primaryUserRole(["teacher"]), "teacher");
});

test("a student is a learner", () => {
  assert.equal(isLearnerRole(["student"]), true);
  assert.equal(primaryUserRole(["student"]), "student");
});

test("unknown or empty roles are not learners", () => {
  assert.equal(isLearnerRole(undefined), false);
  assert.equal(isLearnerRole([]), false);
});

test("skip student lookup for known non-learners; try when roles are unknown", () => {
  assert.equal(
    shouldFetchStudentProfile({ userId: "t1", roles: ["teacher"] }),
    false,
  );
  assert.equal(
    shouldFetchStudentProfile({ userId: "s1", roles: ["student"] }),
    true,
  );
  assert.equal(shouldFetchStudentProfile({ userId: "u1" }), true);
  assert.equal(shouldFetchStudentProfile({ roles: ["student"] }), false);
});

test("missing student profile does not blank the IDE", () => {
  assert.equal(
    idePageError({
      invalidCourseId: false,
      signedOut: false,
      courseFailed: false,
    }),
    null,
  );
});

test("signed-out and bad course links still fail closed", () => {
  assert.match(
    idePageError({
      invalidCourseId: true,
      signedOut: false,
      courseFailed: false,
    }) ?? "",
    /Invalid course link/,
  );
  assert.match(
    idePageError({
      invalidCourseId: false,
      signedOut: true,
      courseFailed: false,
    }) ?? "",
    /sign in/i,
  );
});
