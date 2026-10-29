import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { assembleApplication } from "../../src/assembly.ts";
import { CodeGeneratingConcept } from "../../src/concepts/CodeGenerating.ts";
import { GuestingConcept } from "../../src/concepts/Guesting.ts";
import { SessioningConcept } from "../../src/concepts/Sessioning.ts";
import { policy } from "../../src/http.ts";
import { GUEST_SESSION_MS } from "../../src/timing.ts";
import { openTestDb, type TestDb } from "../test-db.ts";

let testDb: TestDb;
let now: Date;
let api: (request: Request) => Promise<Response>;
const clock = () => now;

beforeAll(async () => {
  testDb = await openTestDb();
  const application = assembleApplication(testDb.db, { clock });
  api = createHttpHandler({ application, gateway: createGateway({ application }), policy });
}, 120_000);

beforeEach(async () => {
  await testDb.db.dropDatabase();
  now = new Date("2026-10-27T12:00:00Z");
});

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

const tokens = () => new CodeGeneratingConcept(testDb.db);
const names = () => new GuestingConcept(testDb.db);
const sessions = () => new SessioningConcept(testDb.db, clock);
const tokenFree = async (code: string) =>
  (await tokens()._isAvailable({ context: "SESSION_TOKENS", code })).available;

test("a guest starts a session, is recognized by token, and signs out", async () => {
  const started = await call("/guests/start", { displayName: "Abuelo" });
  expect(started.status).toBe(200);
  const { player, token } = started.body;
  expect(Object.keys(started.body).sort()).toEqual(["player", "token"]);
  expect(token).toMatch(/^[A-HJ-NP-Z2-9]{32}$/);
  expect(await tokenFree(token)).toBe(false);

  expect(await call("/sessions/me", { token })).toEqual({ status: 200, body: { player, displayName: "Abuelo" } });

  expect(await call("/sessions/end", { token })).toEqual({ status: 200, body: { player } });
  expect((await call("/sessions/me", { token })).status).toBe(401);
  // FreeTokenOnSessionEnd gave the token back to CodeGenerating.
  expect(await tokenFree(token)).toBe(true);
});

test("the player is the guest, and the guest keeps the trimmed name", async () => {
  const { player } = (await call("/guests/start", { displayName: "  Abuelo  " })).body;
  expect(await names()._name({ guest: player })).toEqual([{ displayName: "Abuelo" }]);
  expect(await sessions()._tokens({ player })).toHaveLength(1);
});

test("an empty name is a bad request, and a missing name is invalid input", async () => {
  expect((await call("/guests/start", { displayName: "  " })).status).toBe(400);
  expect((await call("/guests/start", { displayName: "x".repeat(21) })).status).toBe(400);
  expect((await call("/guests/start", {})).status).toBe(400);
  expect((await call("/guests/start", { displayName: 42 })).status).toBe(400);
});

test("a refused name leaves nothing behind: no guest, no session, no token", async () => {
  await call("/guests/start", { displayName: "  " });
  expect(await testDb.db.collection("guesting.guests").countDocuments()).toBe(0);
  expect(await testDb.db.collection("sessioning.sessions").countDocuments()).toBe(0);
  expect(await testDb.db.collection("codeGenerating.codes").countDocuments()).toBe(0);
});

test("two guests may share a name and are still two players with two tokens", async () => {
  const a = (await call("/guests/start", { displayName: "Papo" })).body;
  const b = (await call("/guests/start", { displayName: "Papo" })).body;
  expect(a.player).not.toBe(b.player);
  expect(a.token).not.toBe(b.token);
  expect((await call("/sessions/me", { token: a.token })).body.player).toBe(a.player);
  expect((await call("/sessions/me", { token: b.token })).body.player).toBe(b.player);
});

test("signing out forgets the guest, so their name is gone and other guests are untouched", async () => {
  const abuelo = (await call("/guests/start", { displayName: "Abuelo" })).body;
  const papo = (await call("/guests/start", { displayName: "Papo" })).body;
  await call("/sessions/end", { token: abuelo.token });
  expect(await names()._name({ guest: abuelo.player })).toEqual([]);
  expect(await names()._name({ guest: papo.player })).toEqual([{ displayName: "Papo" }]);
  expect((await call("/sessions/me", { token: papo.token })).status).toBe(200);
});

test("signing out twice, or with a made-up token, is unauthorized and changes nothing", async () => {
  const abuelo = (await call("/guests/start", { displayName: "Abuelo" })).body;
  await call("/sessions/end", { token: abuelo.token });
  expect(await call("/sessions/end", { token: abuelo.token })).toEqual({ status: 401, body: { error: "UNAUTHORIZED" } });
  expect(await call("/sessions/end", { token: "NOT-A-TOKEN" })).toEqual({ status: 401, body: { error: "UNAUTHORIZED" } });
  expect((await call("/sessions/end", {})).status).toBe(400);
  expect((await call("/sessions/me", {})).status).toBe(400);
  expect((await call("/sessions/me", { token: 7 })).status).toBe(400);
});

test("checking in keeps a guest's session alive past what its lifetime would be from the start", async () => {
  const { token } = (await call("/guests/start", { displayName: "Abuelo" })).body;
  for (let i = 0; i < 3; i++) {
    now = new Date(now.getTime() + GUEST_SESSION_MS - 60_000);
    expect((await call("/sessions/me", { token })).status).toBe(200);
  }
  now = new Date(now.getTime() + GUEST_SESSION_MS + 1);
  expect((await call("/sessions/me", { token })).status).toBe(401);
});

test("a token that went stale is not resumed, but it stays taken until the session expires", async () => {
  const { token } = (await call("/guests/start", { displayName: "Abuelo" })).body;
  now = new Date(now.getTime() + GUEST_SESSION_MS + 1);
  expect((await call("/sessions/me", { token })).status).toBe(401);
  expect(await tokenFree(token)).toBe(false);
});

test("a session id or player id is not a token", async () => {
  const { player } = (await call("/guests/start", { displayName: "Abuelo" })).body;
  const session = (await testDb.db.collection<{ _id: string; player: string }>("sessioning.sessions").findOne({ player }))!._id;
  expect((await call("/sessions/me", { token: player })).status).toBe(401);
  expect((await call("/sessions/me", { token: session })).status).toBe(401);
  expect((await call("/sessions/end", { token: session })).status).toBe(401);
});

test("signing out frees the guest's seat and queue place", async () => {
  const abuelo = (await call("/guests/start", { displayName: "Abuelo" })).body;
  const papo = (await call("/guests/start", { displayName: "Papo" })).body;
  const nando = (await call("/guests/start", { displayName: "Nando" })).body;
  const { table, code } = (await call("/tables/open", { token: abuelo.token, rules: "DEFAULT" })).body;
  await call("/tables/join", { token: papo.token, code });
  await call("/matchmaking/enqueue", { token: nando.token, rules: "DEFAULT", midway: false });

  await call("/sessions/end", { token: abuelo.token });
  await call("/sessions/end", { token: nando.token });
  const lobby = (await call("/tables/lobby", { token: papo.token })).body.lobby.tables[0];
  expect(lobby.table).toBe(table);
  expect(lobby.host).toBe(papo.player);
  expect(lobby.seats.map((s: { player: string }) => s.player)).toEqual([papo.player]);
  expect(await testDb.db.collection("matchmaking.lobbies").countDocuments({ "entries.player": nando.player })).toBe(0);
});

// Guests only ever have one session, but the reactions are written for any player:
// someone signed in on two devices who signs out of one stays where they are.
test("a player who still has another session stays seated, queued and named when one ends", async () => {
  const abuelo = (await call("/guests/start", { displayName: "Abuelo" })).body;
  const papo = (await call("/guests/start", { displayName: "Papo" })).body;
  await sessions().start({ player: abuelo.player, token: "ABUELO-PHONE", lifetime: GUEST_SESSION_MS });
  await sessions().start({ player: papo.player, token: "PAPO-PHONE", lifetime: GUEST_SESSION_MS });
  const { code } = (await call("/tables/open", { token: abuelo.token, rules: "DEFAULT" })).body;
  await call("/matchmaking/enqueue", { token: papo.token, rules: "DEFAULT", midway: false });

  await call("/sessions/end", { token: abuelo.token });
  await call("/sessions/end", { token: papo.token });
  const lobby = (await call("/tables/lobby", { token: "ABUELO-PHONE" })).body.lobby.tables[0];
  expect(lobby.code).toBe(code);
  expect(lobby.seats).toEqual([{ position: 0, player: abuelo.player, displayName: "Abuelo" }]);
  expect((await call("/matchmaking/view", { token: "PAPO-PHONE" })).body.queue.lobbies).toHaveLength(1);
  expect(await names()._name({ guest: abuelo.player })).toEqual([{ displayName: "Abuelo" }]);
  // The ended session's token is still freed.
  expect(await tokenFree(abuelo.token)).toBe(true);

  // Ending the last one gets them up, out of the queue, and forgets them.
  await call("/sessions/end", { token: "ABUELO-PHONE" });
  await call("/sessions/end", { token: "PAPO-PHONE" });
  expect(await testDb.db.collection("table.tables").countDocuments()).toBe(0);
  expect(await testDb.db.collection("matchmaking.lobbies").countDocuments({ "entries.player": papo.player })).toBe(0);
  expect(await names()._name({ guest: abuelo.player })).toEqual([]);
});
