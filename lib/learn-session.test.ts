import assert from "node:assert/strict";
import test from "node:test";
import { sessionFromAccount } from "./learn-session.ts";

test("an account payload becomes a session the IDE can cache", () => {
  const session = sessionFromAccount("session-token", {
    user_id: "user-1",
    name: "Ada",
    email: "ada@example.com",
    image_url: "https://example.com/ada.png",
    roles: ["student"],
  });

  assert.deepEqual(session, {
    valid: true,
    token: "session-token",
    user: {
      id: "user-1",
      name: "Ada",
      email: "ada@example.com",
      image: "https://example.com/ada.png",
      roles: ["student"],
    },
  });
});

test("an account without a user id is not a session", () => {
  assert.equal(sessionFromAccount("session-token", { email: "ada@example.com" }), null);
  assert.equal(sessionFromAccount("", { user_id: "user-1" }), null);
});

test("missing roles become an empty list", () => {
  const session = sessionFromAccount("session-token", { user_id: "user-1" });
  assert.deepEqual(session?.user?.roles, []);
});
