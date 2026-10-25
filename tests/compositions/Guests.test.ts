import { afterAll, beforeAll, expect, test } from "bun:test";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { assembleApplication } from "../../src/assembly.ts";
import { CodeGeneratingConcept } from "../../src/concepts/CodeGenerating.ts";
import { policy } from "../../src/http.ts";
import { openTestDb, type TestDb } from "../test-db.ts";

let testDb: TestDb;
let api: (request: Request) => Promise<Response>;

beforeAll(async () => {
  testDb = await openTestDb();
  const application = assembleApplication(testDb.db);
  api = createHttpHandler({ application, gateway: createGateway({ application }), policy });
}, 120_000);

afterAll(async () => {
  await testDb.close();
});

// Sends one request the way the frontend would, and returns the status and JSON body.
async function call(path: string, body: unknown) {
  const response = await api(
    new Request(`http://127.0.0.1:3000/api${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
  return { status: response.status, body: await response.json() };
}

test("a guest starts a session, is recognized by token, and leaves", async () => {
  const started = await call("/guests/start", { displayName: "Abuelo" });
  expect(started.status).toBe(200);
  const { session, token } = started.body;
  expect(token).toMatch(/^[A-HJ-NP-Z2-9]{32}$/);
  const tokens = new CodeGeneratingConcept(testDb.db);
  expect(await tokens._isAvailable({ context: "SESSION_TOKENS", code: token })).toEqual({ available: false });

  expect(await call("/guests/me", { token })).toEqual({
    status: 200,
    body: { session, displayName: "Abuelo" },
  });

  expect((await call("/guests/leave", { token })).body).toEqual({ session });
  expect((await call("/guests/me", { token })).status).toBe(401);
  // FreeTokenOnSessionEnd gave the token back to CodeGenerating.
  expect(await tokens._isAvailable({ context: "SESSION_TOKENS", code: token })).toEqual({ available: true });
});

test("an empty name is a bad request, and a missing name is invalid input", async () => {
  expect((await call("/guests/start", { displayName: "  " })).status).toBe(400);
  expect((await call("/guests/start", {})).status).toBe(400);
  expect((await call("/guests/start", { displayName: 42 })).status).toBe(400);
});
