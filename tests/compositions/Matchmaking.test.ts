import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { assembleApplication } from "../../src/assembly.ts";
import { BottingConcept } from "../../src/concepts/Botting.ts";
import { DominoPlayingConcept } from "../../src/concepts/DominoPlaying.ts";
import { GuestSessioningConcept } from "../../src/concepts/GuestSessioning.ts";
import { MatchmakingConcept } from "../../src/concepts/Matchmaking.ts";
import { policy } from "../../src/http.ts";
import { tick } from "../../src/ticker.ts";
import { openTestDb, type TestDb } from "../test-db.ts";

let testDb: TestDb;
let api: (request: Request) => Promise<Response>;
let gateway: ReturnType<typeof createGateway>;
// A short countdown, so tests can wait it out.
const COUNTDOWN_MS = 300;

beforeAll(async () => {
  testDb = await openTestDb();
  const application = assembleApplication(testDb.db, { matchmakingCountdownMs: COUNTDOWN_MS });
  gateway = createGateway({ application });
  api = createHttpHandler({ application, gateway, policy });
}, 120_000);

beforeEach(async () => {
  await testDb.db.dropDatabase();
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

type Guest = { session: string; token: string };

async function guests(...names: string[]) {
  const result: Guest[] = [];
  for (const displayName of names) result.push((await call("/guests/start", { displayName })).body);
  return result;
}

const queueOf = async (guest: Guest) => (await call("/matchmaking/view", { token: guest.token })).body.queue.lobbies[0];
const tableOf = async (guest: Guest) => (await call("/tables/lobby", { token: guest.token })).body.lobby.tables[0];
const gameOf = async (guest: Guest) => (await call("/games/view", { token: guest.token })).body.view.games[0];
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** What the server's one-second timer does, run once: it launches lobbies whose countdown is over. */
const runTicker = () =>
  tick(gateway, {
    games: new DominoPlayingConcept(testDb.db),
    sessions: new GuestSessioningConcept(testDb.db),
    bots: new BottingConcept(testDb.db),
    matchmaking: new MatchmakingConcept(testDb.db, undefined, undefined, COUNTDOWN_MS),
  });

test("four strangers fill a lobby, count down, and are seated at a new table with a game started", async () => {
  const players = await guests("Abuelo", "Papo", "Nando", "Cheo");
  const lobbies = [];
  for (const guest of players) lobbies.push((await call("/matchmaking/enqueue", { token: guest.token, rules: "DEFAULT", midway: false })).body.lobby);
  expect(new Set(lobbies).size).toBe(1);

  const waiting = await queueOf(players[0]);
  expect(waiting.full).toBe(true);
  expect(waiting.rules).toBe("DEFAULT");
  expect(waiting.players.map((p: { displayName: string }) => p.displayName).sort()).toEqual(["Abuelo", "Cheo", "Nando", "Papo"]);

  // Too early: the server's timer leaves the lobby alone, and asking from outside is refused.
  await runTicker();
  expect(await queueOf(players[1])).toBeDefined();
  expect((await call("/matchmaking/launch", { lobby: waiting.lobby })).body).toEqual({ error: "CONFLICT" });
  expect(await queueOf(players[1])).toBeDefined();

  // Once the countdown is over the server launches it, with no page asking.
  await wait(COUNTDOWN_MS + 50);
  await runTicker();

  // Nobody waits any more; all four sit at the same table, with a game being played.
  const table = await tableOf(players[0]);
  expect(table.seats).toHaveLength(4);
  expect(table.seats.map((s: { player: string }) => s.player).sort()).toEqual(players.map((p) => p.session).sort());
  for (const guest of players) {
    expect(await queueOf(guest)).toBeUndefined();
    expect((await tableOf(guest)).table).toBe(table.table);
  }
  const game = await gameOf(players[3]);
  expect(game.status).toBe("ACTIVE");
  // The game's turn order is the table's seat order.
  const bySeat = [...table.seats].sort((a: { position: number }, b: { position: number }) => a.position - b.position);
  expect(game.players.map((p: { player: string }) => p.player)).toEqual(bySeat.map((s: { player: string }) => s.player));

  // A second launch finds nothing to launch, and the timer has nothing left to do.
  expect((await call("/matchmaking/launch", { lobby: waiting.lobby })).body).toEqual({ error: "NOT_FOUND" });
  await runTicker();
  expect((await tableOf(players[0])).table).toBe(table.table);
});

test("a guest can leave the queue before the game starts, which stops the countdown", async () => {
  const players = await guests("A", "B", "C", "D", "E");
  for (const guest of players.slice(0, 4)) await call("/matchmaking/enqueue", { token: guest.token, rules: "DEFAULT", midway: false });
  expect((await call("/matchmaking/leave", { token: players[3].token })).status).toBe(200);
  expect(await queueOf(players[3])).toBeUndefined();
  const waiting = await queueOf(players[0]);
  expect(waiting.full).toBe(false);
  expect(waiting.players).toHaveLength(3);

  // Without a fourth player the lobby cannot launch, however long they wait.
  await wait(COUNTDOWN_MS + 50);
  await runTicker();
  expect((await queueOf(players[0])).players).toHaveLength(3);
  expect((await call("/matchmaking/launch", { lobby: waiting.lobby })).body).toEqual({ error: "CONFLICT" });

  // A newcomer fills the seat and the countdown starts again.
  await call("/matchmaking/enqueue", { token: players[4].token, rules: "DEFAULT", midway: false });
  expect((await queueOf(players[4])).full).toBe(true);
  expect((await call("/matchmaking/leave", { token: players[3].token })).body).toEqual({ error: "NOT_FOUND" });
});

test("ending a session leaves the queue", async () => {
  const [a, b] = await guests("A", "B");
  await call("/matchmaking/enqueue", { token: a.token, rules: "DEFAULT", midway: false });
  await call("/matchmaking/enqueue", { token: b.token, rules: "DEFAULT", midway: false });
  await call("/guests/leave", { token: a.token });
  const waiting = await queueOf(b);
  expect(waiting.players.map((p: { player: string }) => p.player)).toEqual([b.session]);
});

test("queueing and sitting at a table exclude each other", async () => {
  const [host, queued] = await guests("Host", "Queued");
  const { code } = (await call("/tables/open", { token: host.token, rules: "DEFAULT" })).body;
  // A seated guest cannot queue.
  expect((await call("/matchmaking/enqueue", { token: host.token, rules: "DEFAULT", midway: false })).body).toEqual({ error: "CONFLICT" });
  expect(await queueOf(host)).toBeUndefined();

  // A queued guest can neither open nor join a table.
  await call("/matchmaking/enqueue", { token: queued.token, rules: "DEFAULT", midway: false });
  expect((await call("/tables/open", { token: queued.token, rules: "DEFAULT" })).body).toEqual({ error: "CONFLICT" });
  expect((await call("/tables/join", { token: queued.token, code })).body).toEqual({ error: "CONFLICT" });
  expect(await tableOf(queued)).toBeUndefined();
  // Queueing twice is refused too.
  expect((await call("/matchmaking/enqueue", { token: queued.token, rules: "DEFAULT", midway: false })).body).toEqual({ error: "CONFLICT" });
});

test("launching only needs the lobby, and asking for an unknown one or with no lobby is refused", async () => {
  const players = await guests("A", "B", "C", "D");
  for (const guest of players) await call("/matchmaking/enqueue", { token: guest.token, rules: "DEFAULT", midway: false });
  expect((await call("/matchmaking/launch", { lobby: "no-such-lobby" })).body).toEqual({ error: "NOT_FOUND" });
  expect((await call("/matchmaking/launch", {})).status).toBe(400);
  expect((await call("/matchmaking/launch", { lobby: 7 })).status).toBe(400);
  expect((await queueOf(players[0])).players).toHaveLength(4);
  expect((await call("/matchmaking/enqueue", { token: "not-a-token", rules: "DEFAULT", midway: false })).status).toBe(401);
});

test("the server launches every ready lobby in one go, each into its own game", async () => {
  const players = await guests("A", "B", "C", "D", "E", "F", "G", "H");
  for (const [i, guest] of players.entries()) {
    await call("/matchmaking/enqueue", { token: guest.token, rules: i < 4 ? "DEFAULT" : "SHORT", midway: false });
  }
  await wait(COUNTDOWN_MS + 50);
  await runTicker();
  expect(await gameOf(players[0])).toMatchObject({ rules: "DEFAULT", status: "ACTIVE" });
  expect(await gameOf(players[7])).toMatchObject({ rules: "SHORT", status: "ACTIVE" });
  expect((await tableOf(players[0])).table).not.toBe((await tableOf(players[7])).table);
});

test("players are only matched with others who chose the same rules", async () => {
  const players = await guests("A", "B", "C", "D", "E", "F", "G", "H");
  const choices = ["DEFAULT", "LONG", "DEFAULT", "LONG", "SHORT", "DEFAULT", "LONG", "DEFAULT"];
  const lobbyFor: Record<string, string[]> = {};
  for (const [i, guest] of players.entries()) {
    const { lobby } = (await call("/matchmaking/enqueue", { token: guest.token, rules: choices[i], midway: false })).body;
    (lobbyFor[choices[i]] ??= []).push(lobby);
  }
  // Each rule set has one lobby of its own.
  for (const lobbies of Object.values(lobbyFor)) expect(new Set(lobbies).size).toBe(1);
  expect(new Set(Object.values(lobbyFor).map((lobbies) => lobbies[0])).size).toBe(3);

  // The four DEFAULT players fill their lobby; the others keep waiting.
  expect(await queueOf(players[0])).toMatchObject({ rules: "DEFAULT", full: true });
  expect(await queueOf(players[1])).toMatchObject({ rules: "LONG", full: false });
  expect((await queueOf(players[1])).players).toHaveLength(3);
  expect(await queueOf(players[4])).toMatchObject({ rules: "SHORT", full: false });

  // Once launched, the DEFAULT game plays to 200.
  await wait(COUNTDOWN_MS + 50);
  await runTicker();
  expect(await gameOf(players[0])).toMatchObject({ rules: "DEFAULT", target: 200 });
  expect(await queueOf(players[1])).toMatchObject({ rules: "LONG", full: false });
  expect((await tableOf(players[0])).rules).toBe("DEFAULT");
});

test("a launched LONG lobby starts a game to 500", async () => {
  const players = await guests("A", "B", "C", "D");
  for (const guest of players) await call("/matchmaking/enqueue", { token: guest.token, rules: "LONG", midway: false });
  await wait(COUNTDOWN_MS + 50);
  await runTicker();
  expect(await gameOf(players[2])).toMatchObject({ rules: "LONG", target: 500, status: "ACTIVE" });
});

test("queueing with unknown or missing rules is refused", async () => {
  const [a] = await guests("A");
  expect(await call("/matchmaking/enqueue", { token: a.token, rules: "BLITZ", midway: false })).toEqual({
    status: 400,
    body: { error: "INVALID_REQUEST" },
  });
  expect((await call("/matchmaking/enqueue", { token: a.token })).status).toBe(400);
  expect(await queueOf(a)).toBeUndefined();
});
