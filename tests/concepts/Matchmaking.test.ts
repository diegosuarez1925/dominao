import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import {
  AlreadyQueued,
  CountdownRunning,
  LobbyNotFull,
  MatchmakingConcept,
  NoSuchLobby,
  NotQueued,
} from "../../src/concepts/Matchmaking.ts";
import { openTestDb, type TestDb } from "../test-db.ts";

let testDb: TestDb;
let matchmaking: MatchmakingConcept;
let now: number;
// The clock only moves when a test moves it, so countdowns can be checked exactly.
const clock = () => new Date(now);
const advance = (ms: number) => (now += ms);
// Reversing stands in for shuffling, so the seating order is known.
const reverse = <T>(items: T[]) => [...items].reverse();
const COUNTDOWN = 10_000;

beforeAll(async () => {
  testDb = await openTestDb();
}, 120_000);

beforeEach(async () => {
  await testDb.db.dropDatabase();
  now = Date.parse("2026-10-25T12:00:00Z");
  matchmaking = new MatchmakingConcept(testDb.db, clock, reverse, COUNTDOWN);
});

afterAll(async () => {
  await testDb.close();
});

/** Queues players one second apart, so they join in a known order. */
async function queue(players: string[], rules = "STANDARD") {
  const lobbies: string[] = [];
  for (const player of players) {
    advance(1000);
    lobbies.push((await matchmaking.enqueue({ player, rules })).lobby);
  }
  return lobbies;
}

test("principle: four strangers fill a lobby, a leaver stops the countdown, and the full lobby launches", async () => {
  const [lobby, ...others] = await queue(["abuelo", "papo", "nando"]);
  expect(others).toEqual([lobby, lobby]);
  expect(await matchmaking._entries({ lobby })).toEqual([{ player: "abuelo" }, { player: "papo" }, { player: "nando" }]);
  expect(await matchmaking._status({ lobby })).toEqual([{ rules: "STANDARD", full: false, secondsLeft: 0 }]);

  // The fourth fills it and the countdown starts.
  await queue(["cheo"]);
  expect(await matchmaking._status({ lobby })).toEqual([{ rules: "STANDARD", full: true, secondsLeft: 10 }]);
  advance(4000);
  expect(await matchmaking._status({ lobby })).toEqual([{ rules: "STANDARD", full: true, secondsLeft: 6 }]);

  // Papo leaves: the countdown stops, and a newcomer takes his place and restarts it.
  expect(await matchmaking.cancel({ player: "papo" })).toEqual({ lobby });
  expect(await matchmaking._status({ lobby })).toEqual([{ rules: "STANDARD", full: false, secondsLeft: 0 }]);
  await queue(["tito"]);
  expect(await matchmaking._status({ lobby })).toEqual([{ rules: "STANDARD", full: true, secondsLeft: 10 }]);

  // Not yet: the countdown is still running.
  advance(9000);
  await expect(matchmaking.launch({ lobby })).rejects.toThrow(CountdownRunning);
  advance(1000);
  expect(await matchmaking._status({ lobby })).toEqual([{ rules: "STANDARD", full: true, secondsLeft: 0 }]);

  // Launching hands out the players in shuffled order (reversed here) and empties the queue.
  expect(await matchmaking.launch({ lobby })).toEqual({ first: "tito", second: "cheo", third: "nando", fourth: "abuelo" });
  expect(await matchmaking._status({ lobby })).toEqual([]);
  expect(await matchmaking._entries({ lobby })).toEqual([]);
  for (const player of ["abuelo", "nando", "cheo", "tito"]) expect(await matchmaking._lobbyOf({ player })).toEqual([]);
});

test("a fifth player starts a new lobby rather than overfilling a full one", async () => {
  const lobbies = await queue(["a", "b", "c", "d", "e"]);
  expect(new Set(lobbies.slice(0, 4)).size).toBe(1);
  expect(lobbies[4]).not.toBe(lobbies[0]);
  expect(await matchmaking._entries({ lobby: lobbies[4] })).toEqual([{ player: "e" }]);
  expect(await matchmaking._lobbyOf({ player: "e" })).toEqual([{ lobby: lobbies[4] }]);
});

test("players who leave free a seat, and the earliest lobby with room fills first", async () => {
  const lobbies = await queue(["a", "b", "c", "d", "e"]);
  await matchmaking.cancel({ player: "b" });
  // The first lobby is older, so the next player goes there, not with e.
  const [next] = await queue(["f"]);
  expect(next).toBe(lobbies[0]);
  expect(await matchmaking._entries({ lobby: lobbies[0] })).toEqual([
    { player: "a" },
    { player: "c" },
    { player: "d" },
    { player: "f" },
  ]);
});

test("only players asking for the same rules share a lobby", async () => {
  const [standard] = await queue(["a"], "STANDARD");
  const [short] = await queue(["b"], "TO_100");
  expect(short).not.toBe(standard);
  const [again] = await queue(["c"], "STANDARD");
  expect(again).toBe(standard);
  expect(await matchmaking._status({ lobby: short })).toEqual([{ rules: "TO_100", full: false, secondsLeft: 0 }]);
});

test("the last player to leave removes the lobby, and they can queue again", async () => {
  const [lobby] = await queue(["a"]);
  await matchmaking.cancel({ player: "a" });
  expect(await matchmaking._status({ lobby })).toEqual([]);
  const [fresh] = await queue(["a"]);
  expect(fresh).not.toBe(lobby);
});

test("many players queueing at once never put more than four in a lobby", async () => {
  const players = Array.from({ length: 12 }, (_, i) => `p${i}`);
  const results = await Promise.all(players.map((player) => matchmaking.enqueue({ player, rules: "STANDARD" })));
  const counts = new Map<string, number>();
  for (const { lobby } of results) counts.set(lobby, (counts.get(lobby) ?? 0) + 1);
  for (const [lobby, count] of counts) {
    expect(count).toBeLessThanOrEqual(4);
    expect((await matchmaking._entries({ lobby })).length).toBe(count);
  }
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  expect(total).toBe(12);
});

test("errors: queueing twice, leaving when not queued, and launching too early or a missing lobby", async () => {
  const [lobby] = await queue(["a"]);
  await expect(matchmaking.enqueue({ player: "a", rules: "STANDARD" })).rejects.toThrow(AlreadyQueued);
  await expect(matchmaking.enqueue({ player: "a", rules: "TO_100" })).rejects.toThrow(AlreadyQueued);
  expect(await matchmaking._entries({ lobby })).toEqual([{ player: "a" }]);

  await expect(matchmaking.cancel({ player: "nobody" })).rejects.toThrow(NotQueued);

  // Not full: refused, and nothing is removed.
  await expect(matchmaking.launch({ lobby })).rejects.toThrow(LobbyNotFull);
  expect(await matchmaking._lobbyOf({ player: "a" })).toEqual([{ lobby }]);

  await expect(matchmaking.launch({ lobby: "no-such-lobby" })).rejects.toThrow(NoSuchLobby);

  // Launching twice: the second finds the lobby gone.
  await queue(["b", "c", "d"]);
  advance(COUNTDOWN);
  await matchmaking.launch({ lobby });
  await expect(matchmaking.launch({ lobby })).rejects.toThrow(NoSuchLobby);
});

test("a full lobby launches once even when all four ask at the same moment", async () => {
  const [lobby] = await queue(["a", "b", "c", "d"]);
  advance(COUNTDOWN);
  const outcomes = await Promise.allSettled([1, 2, 3, 4].map(() => matchmaking.launch({ lobby })));
  expect(outcomes.filter((o) => o.status === "fulfilled")).toHaveLength(1);
  for (const o of outcomes) if (o.status === "rejected") expect(o.reason).toBeInstanceOf(NoSuchLobby);
});
