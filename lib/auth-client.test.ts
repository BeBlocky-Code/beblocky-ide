import assert from "node:assert/strict";
import test from "node:test";
import {
  clearSessionCache,
  getApiAuthHeaders,
  getSession,
  rememberSession,
} from "./auth-client.ts";

const remembered = {
  valid: true,
  token: "session-token",
  user: {
    id: "user-1",
    name: "Ada",
    email: "ada@example.com",
    roles: ["student"],
  },
};

test("a remembered session is reused without calling auth", async () => {
  const calls: string[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    calls.push(String(input));
    return new Response("unexpected", { status: 500 });
  }) as typeof fetch;

  try {
    rememberSession(remembered);
    const session = await getSession();
    const headers = await getApiAuthHeaders();

    assert.equal(session.data?.user?.id, "user-1");
    assert.equal(session.data?.user?.roles?.[0], "student");
    assert.equal(headers.Authorization, "Bearer session-token");
    assert.deepEqual(calls, []);
  } finally {
    globalThis.fetch = original;
    clearSessionCache();
  }
});

test("a session without a token is not reused", async () => {
  let calls = 0;
  const original = globalThis.fetch;
  globalThis.fetch = (async () => {
    calls += 1;
    return new Response(JSON.stringify({ valid: false }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  try {
    rememberSession({ valid: true, user: { id: "user-1" } });
    const session = await getSession();
    assert.ok(calls > 0);
    assert.equal(session.data?.valid, false);
  } finally {
    globalThis.fetch = original;
    clearSessionCache();
  }
});
