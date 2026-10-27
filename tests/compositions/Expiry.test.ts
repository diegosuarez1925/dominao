import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { assembleApplication } from "../../src/assembly.ts";
import { CodeGeneratingConcept } from "../../src/concepts/CodeGenerating.ts";
import { GuestSessioningConcept, INACTIVITY_LIMIT_MS } from "../../src/concepts/GuestSessioning.ts";
import { expireIdleSessions } from "../../src/expiry.ts";
import { policy } from "../../src/http.ts";
import { openTestDb, type TestDb } from "../test-db.ts";

// A guest who stays away too long is expired by the server's timer, which frees their
// seat, their place in a lobby and their token, as if they had left.

let testDb: TestDb;
let now: Date;
let gateway: ReturnType<typeof createGateway>;
let api: (request: Request) => Promise<Response>;
const clock = () => now;

beforeAll(async () => {
  testDb = await openTestDb();
  const application = assembleApplication(testDb.db, { sessionClock: clock });
  gateway = createGateway({ application });
  api = createHttpHandler({ application, gateway, policy });
}, 120_000);

beforeEach(async () => {
  await testDb.db.dropDatabase();
  now = new Date("2026-10-27T12:00:00Z");
});

afterAll(async () => {
  await testDb.close();
});

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

async function guest(displayName: string) {
  return (await call("/guests/start", { displayName })).body as { session: string; token: string };
}

/** Moves the clock past the inactivity limit, keeping the given guests active. */
async function stayAway(...active: { token: string }[]) {
  now = new Date(now.getTime() + INACTIVITY_LIMIT_MS - 1000);
  for (const g of active) await call("/guests/me", { token: g.token });
  now = new Date(now.getTime() + 2000);
}

const sweep = () => expireIdleSessions(gateway, new GuestSessioningConcept(testDb.db, clock));
const tokenTaken = async (code: string) =>
  !(await new CodeGeneratingConcept(testDb.db)._isAvailable({ context: "SESSION_TOKENS", code })).available;

test("an idle host is expired: their seat and token are freed and the host passes on", async () => {
  const abuelo = await guest("Abuelo");
  const papo = await guest("Papo");
  const { table, code } = (await call("/tables/open", { token: abuelo.token, rules: "DEFAULT" })).body;
  await call("/tables/join", { token: papo.token, code });

  await stayAway(papo);
  expect((await call("/guests/me", { token: abuelo.token })).status).toBe(401);
  // Until the timer runs, the idle guest still holds the seat.
  expect((await call("/tables/lobby", { token: papo.token })).body.lobby.tables[0].host).toBe(abuelo.session);

  await sweep();
  const lobby = (await call("/tables/lobby", { token: papo.token })).body.lobby.tables[0];
  expect(lobby.table).toBe(table);
  expect(lobby.host).toBe(papo.session);
  expect(lobby.seats.map((s: { displayName: string }) => s.displayName)).toEqual(["Papo"]);
  expect(await tokenTaken(abuelo.token)).toBe(false);
  expect(await tokenTaken(papo.token)).toBe(true);
  // Papo, now host, can close the table.
  expect((await call("/tables/close", { token: papo.token, table })).status).toBe(200);
});

test("an idle player's game stops, and an idle guest stops waiting for strangers", async () => {
  const players = [];
  for (const name of ["Abuelo", "Papo", "Nando", "Cheo"]) players.push(await guest(name));
  const { code } = (await call("/tables/open", { token: players[0].token, rules: "DEFAULT" })).body;
  for (const p of players.slice(1)) await call("/tables/join", { token: p.token, code });
  await call("/games/start", { token: players[0].token });
  const waiting = await guest("Tío");
  await call("/matchmaking/enqueue", { token: waiting.token, rules: "DEFAULT" });

  await stayAway(...players.slice(0, 3));
  await sweep();
  // Cheo was idle: he left the table, which abandoned the game, as leaving does.
  expect((await call("/games/view", { token: players[0].token })).body.view.games[0].status).toBe("ABANDONED");
  expect((await call("/tables/lobby", { token: players[0].token })).body.lobby.tables[0].seats).toHaveLength(3);
  // Tío was idle too, and his lobby is gone with him.
  const fresh = await guest("Prima");
  const { lobby } = (await call("/matchmaking/enqueue", { token: fresh.token, rules: "DEFAULT" })).body;
  const queued = (await call("/matchmaking/view", { token: fresh.token })).body.queue.lobbies[0];
  expect(queued.lobby).toBe(lobby);
  expect(queued.players.map((p: { displayName: string }) => p.displayName)).toEqual(["Prima"]);
});

test("nobody can expire a session that is still in use", async () => {
  const abuelo = await guest("Abuelo");
  expect(await call("/guests/expire", { session: abuelo.session })).toEqual({ status: 409, body: { error: "CONFLICT" } });
  expect(await call("/guests/expire", { session: "made-up" })).toEqual({ status: 401, body: { error: "UNAUTHORIZED" } });
  expect((await call("/guests/me", { token: abuelo.token })).status).toBe(200);
  // The timer leaves active guests alone.
  await sweep();
  expect((await call("/guests/me", { token: abuelo.token })).status).toBe(200);
});
