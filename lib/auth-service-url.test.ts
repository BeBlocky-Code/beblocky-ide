import assert from "node:assert/strict";
import test from "node:test";
import { authServiceServerBase } from "./auth-service-url.ts";

const KEYS = [
  "AUTH_SERVICE_INTERNAL_URL",
  "AUTH_SERVICE_URL",
  "NEXT_PUBLIC_APP_SERVICE_URL",
  "NEXT_PUBLIC_AUTH_SERVICE_URL",
  "NODE_ENV",
] as const;

function snapshot(): Record<(typeof KEYS)[number], string | undefined> {
  return {
    AUTH_SERVICE_INTERNAL_URL: process.env.AUTH_SERVICE_INTERNAL_URL,
    AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL,
    NEXT_PUBLIC_APP_SERVICE_URL: process.env.NEXT_PUBLIC_APP_SERVICE_URL,
    NEXT_PUBLIC_AUTH_SERVICE_URL: process.env.NEXT_PUBLIC_AUTH_SERVICE_URL,
    NODE_ENV: process.env.NODE_ENV,
  };
}

function writeEnv(key: (typeof KEYS)[number], value: string | undefined) {
  const env = process.env as Record<string, string | undefined>;
  if (value === undefined) delete env[key];
  else env[key] = value;
}

function restore(saved: Record<(typeof KEYS)[number], string | undefined>) {
  for (const key of KEYS) writeEnv(key, saved[key]);
}

function clearAuthEnv() {
  for (const key of KEYS) {
    if (key !== "NODE_ENV") delete process.env[key];
  }
}

test("the server prefers the internal auth address", () => {
  const saved = snapshot();
  try {
    clearAuthEnv();
    writeEnv("AUTH_SERVICE_INTERNAL_URL", "http://auth-api:8080/");
    writeEnv("NEXT_PUBLIC_AUTH_SERVICE_URL", "http://localhost:8080");
    assert.equal(authServiceServerBase(), "http://auth-api:8080");
  } finally {
    restore(saved);
  }
});

test("production ignores a loopback auth URL", () => {
  const saved = snapshot();
  try {
    clearAuthEnv();
    writeEnv("NODE_ENV", "production");
    writeEnv("NEXT_PUBLIC_AUTH_SERVICE_URL", "http://localhost:8080");
    assert.equal(authServiceServerBase(), "https://auth-service.beblocky.com");
  } finally {
    restore(saved);
  }
});

test("development uses the configured public auth URL", () => {
  const saved = snapshot();
  try {
    clearAuthEnv();
    writeEnv("NODE_ENV", "development");
    writeEnv("NEXT_PUBLIC_AUTH_SERVICE_URL", "http://localhost:8080/");
    assert.equal(authServiceServerBase(), "http://localhost:8080");
  } finally {
    restore(saved);
  }
});
