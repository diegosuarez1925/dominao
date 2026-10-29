import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { assembleApplication } from "../../src/assembly.ts";
import { BottingConcept } from "../../src/concepts/Botting.ts";
import { DominoPlayingConcept } from "../../src/concepts/DominoPlaying.ts";
import { MatchmakingConcept } from "../../src/concepts/Matchmaking.ts";
import { SessioningConcept } from "../../src/concepts/Sessioning.ts";
import { TableConcept } from "../../src/concepts/Table.ts";
import { TallyingConcept } from "../../src/concepts/Tallying.ts";
import { policy } from "../../src/http.ts";
import { tick } from "../../src/ticker.ts";
import { BOT_AFTER_MS, BOT_MOVE_MS } from "../../src/timing.ts";
import { openTestDb, type TestDb } from "../test-db.ts";

// Statistics end to end: whole games played through the API, by people and by bots,
// counted for the accounts seated at them and for nobody else. The clock only moves
// when a test moves it, and the server's ticker is run by hand.

let testDb: TestDb;
let now: number;
let gateway: ReturnType<typeof createGateway>;
let api: (request: Request) => Promise<Response>;
const clock = () => new Date(now);
const pass = (ms: number) => (now += ms);

const PASSWORD = "Fichas-de-1957";

beforeAll(async () => {
  testDb = await openTestDb();
  const application = assembleApplication(testDb.db, { clock, matchmakingCountdownMs: 0 });
  gateway = createGateway({ application });
  api = createHttpHandler({ application, gateway, policy });
}, 120_000);

beforeEach(async () => {
  await testDb.db.dropDatabase();
  now = Date.parse("2026-10-29T12:00:00Z");
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

type Player = { player: string; token: string };
const register = async (username: string) => (await call("/accounts/register", { username, password: PASSWORD })).body as Player;
const guest = async (displayName: string) => (await call("/guests/start", { displayName })).body as Player;
const stats = async (who: Player) => (await call("/stats/view", { token: who.token })).body.stats;
const view = async (who: Player) => (await call("/games/view", { token: who.token })).body.view.games[0];

const runTicker = () =>
  tick(gateway, {
    games: new DominoPlayingConcept(testDb.db, undefined, clock),
    sessions: new SessioningConcept(testDb.db, clock),
    bots: new BottingConcept(testDb.db),
    matchmaking: new MatchmakingConcept(testDb.db, clock, undefined, 0),
    tables: new TableConcept(testDb.db),
  });

/** The four sit at a new private table with these rules, the first as host, and start. */
async function startGame(players: Player[], rules: string) {
  const { table, code } = (await call("/tables/open", { token: players[0].token, rules })).body;
  for (const p of players.slice(1)) expect((await call("/tables/join", { token: p.token, code })).status).toBe(200);
  expect((await call("/games/start", { token: players[0].token })).status).toBe(200);
  return table as string;
}

/** The first tile in the hand that fits, and the side it fits on. */
function firstFit(mine: { board: { left: number; right: number }[]; hand: { tile: string }[] }) {
  const left = mine.board[0]?.left;
  const right = mine.board.at(-1)?.right;
  return mine.hand
    .map(({ tile }) => {
      const [a, b] = tile.split("-").map(Number);
      if (mine.board.length === 0 || a === left || b === left) return { tile, side: "LEFT" };
      if (a === right || b === right) return { tile, side: "RIGHT" };
      return undefined;
    })
    .find(Boolean);
}

/** Plays the game out: people play their first fitting tile, bots play when the ticker says so. */
async function playOut(people: Player[], watcher: Player) {
  const byPlayer = new Map(people.map((p) => [p.player, p]));
  for (let moves = 0; moves < 4000; moves++) {
    const state = await view(watcher);
    if (state.status === "FINISHED") return state;
    const person = byPlayer.get(state.turnPlayer);
    if (person === undefined) {
      pass(BOT_MOVE_MS);
      for (const p of people) await call("/sessions/me", { token: p.token });
      await runTicker();
      continue;
    }
    const mine = await view(person);
    expect((await call("/games/play", { token: person.token, game: mine.game, ...firstFit(mine) })).status).toBe(200);
  }
  throw new Error("the game did not finish");
}

type Result = { team: number; points: number };
/** What a player on this team should have from these results. */
function expected(results: Result[], team: number, gameWinner: number) {
  const decided = results.filter((r) => r.team !== -1);
  const won = decided.filter((r) => r.team === team);
  const matchesWon = won.length;
  const matchesLost = decided.length - won.length;
  const gamesWon = gameWinner === team ? 1 : 0;
  return {
    matchesWon,
    matchesLost,
    matchesPlayed: decided.length,
    matchWinrate: Math.round((matchesWon * 100) / decided.length),
    gamesWon,
    gamesLost: 1 - gamesWon,
    gamesPlayed: 1,
    gameWinrate: gamesWon * 100,
    bestMatchPoints: Math.max(0, ...won.map((r) => r.points)),
  };
}
const winnerOf = (final: { scoreA: number; scoreB: number }) => (final.scoreA > final.scoreB ? 0 : 1);
const overallOf = ({ bestMatchPoints, ...rest }: ReturnType<typeof expected>) => rest;

const NONE = {
  matchesWon: 0,
  matchesLost: 0,
  matchesPlayed: 0,
  matchWinrate: 0,
  gamesWon: 0,
  gamesLost: 0,
  gamesPlayed: 0,
  gameWinrate: 0,
};

test("an account with no games yet has no records and zero totals; a guest has no statistics", async () => {
  const titi = await register("titi");
  expect(await stats(titi)).toEqual({ records: [], overall: [NONE] });
  const papo = await guest("Papo");
  expect(await call("/stats/view", { token: papo.token })).toEqual({ status: 403, body: { error: "FORBIDDEN" } });
  expect(await call("/stats/view", { token: "made-up" })).toMatchObject({ status: 401 });
});

test("principle: a whole game counts every decided match and the game for each account seated, and nothing for guests", async () => {
  const abuelo = await register("abuelo");
  const papo = await register("papo");
  const nando = await guest("Nando");
  const cheo = await guest("Cheo");
  // Seats 0 and 2 (Abuelo and Nando) are one team, 1 and 3 (Papo and Cheo) the other.
  await startGame([abuelo, papo, nando, cheo], "DEFAULT");
  const final = await playOut([abuelo, papo, nando, cheo], abuelo);
  const results: Result[] = final.results;
  expect(results.length).toBeGreaterThan(1);

  const forAbuelo = expected(results, 0, winnerOf(final));
  const forPapo = expected(results, 1, winnerOf(final));
  expect(await stats(abuelo)).toEqual({ records: [{ rules: "DEFAULT", ...forAbuelo }], overall: [overallOf(forAbuelo)] });
  expect(await stats(papo)).toEqual({ records: [{ rules: "DEFAULT", ...forPapo }], overall: [overallOf(forPapo)] });
  // One side won the game, and every decided match was won by one side and lost by the other.
  expect(forAbuelo.gamesWon + forPapo.gamesWon).toBe(1);
  expect(forAbuelo.matchesWon).toBe(forPapo.matchesLost);
  // The winners' best match is their biggest win, prize and bonus included.
  expect(Math.max(forAbuelo.bestMatchPoints, forPapo.bestMatchPoints)).toBe(Math.max(...results.map((r) => r.points)));

  // Only the two accounts have records.
  const tallying = new TallyingConcept(testDb.db);
  expect(await tallying._records({ player: nando.player })).toEqual([]);
  expect(await tallying._records({ player: cheo.player })).toEqual([]);
  expect(await testDb.db.collection("tallying.records").countDocuments()).toBe(2);
}, 60_000);

test("rule sets are kept apart, and add up overall", async () => {
  const abuelo = await register("abuelo");
  const others = [await guest("Papo"), await guest("Nando"), await guest("Cheo")];
  const first = await startGame([abuelo, ...others], "DEFAULT");
  const one = await playOut([abuelo, ...others], abuelo);
  for (const p of [abuelo, ...others]) await call("/tables/leave", { token: p.token, table: first });
  await startGame([abuelo, ...others], "SHORT");
  const two = await playOut([abuelo, ...others], abuelo);

  const inDefault = expected(one.results, 0, winnerOf(one));
  const inShort = expected(two.results, 0, winnerOf(two));
  const mine = await stats(abuelo);
  expect(mine.records).toEqual([
    { rules: "DEFAULT", ...inDefault },
    { rules: "SHORT", ...inShort },
  ]);
  const matchesWon = inDefault.matchesWon + inShort.matchesWon;
  const matchesPlayed = inDefault.matchesPlayed + inShort.matchesPlayed;
  const gamesWon = inDefault.gamesWon + inShort.gamesWon;
  expect(mine.overall).toEqual([
    {
      matchesWon,
      matchesLost: matchesPlayed - matchesWon,
      matchesPlayed,
      matchWinrate: Math.round((matchesWon * 100) / matchesPlayed),
      gamesWon,
      gamesLost: 2 - gamesWon,
      gamesPlayed: 2,
      gameWinrate: gamesWon * 50,
    },
  ]);
}, 120_000);

test("matches ended by a bot's move count too; bots and an account that left before any match ended get nothing", async () => {
  const abuelo = await register("abuelo");
  const papo = await register("papo");
  const nando = await guest("Nando");
  const cheo = await guest("Cheo");
  const table = await startGame([abuelo, papo, nando, cheo], "SHORT");
  // Everyone but Abuelo gets up before the first move; after 30 seconds bots take over.
  for (const p of [papo, nando, cheo]) await call("/tables/leave", { token: p.token, table });
  pass(BOT_AFTER_MS);
  await call("/sessions/me", { token: abuelo.token });
  await runTicker();
  const started = await view(abuelo);
  expect(started.players.filter((p: { botName: string | null }) => p.botName !== null)).toHaveLength(3);

  const final = await playOut([abuelo], abuelo);
  const forAbuelo = expected(final.results, 0, winnerOf(final));
  expect((await stats(abuelo)).records).toEqual([{ rules: "SHORT", ...forAbuelo }]);
  expect((await stats(papo)).records).toEqual([]);
  // The bots, three of the four seats, made most of the moves, so some match ended on one.
  const log: { move: string; player: string }[] = final.log;
  const bots = new Set(started.players.filter((p: { botName: string | null }) => p.botName !== null).map((p: { player: string }) => p.player));
  expect(log.some((row) => bots.has(row.player))).toBe(true);
  expect(await testDb.db.collection("tallying.records").countDocuments()).toBe(1);
}, 60_000);

test("a deleted account leaves no statistics, and the username signed up again starts from nothing", async () => {
  const abuelo = await register("abuelo");
  const others = [await guest("Papo"), await guest("Nando"), await guest("Cheo")];
  await startGame([abuelo, ...others], "SHORT");
  await playOut([abuelo, ...others], abuelo);
  expect((await stats(abuelo)).records).toHaveLength(1);

  expect((await call("/accounts/delete", { token: abuelo.token, password: PASSWORD })).status).toBe(200);
  expect(await new TallyingConcept(testDb.db)._records({ player: abuelo.player })).toEqual([]);
  expect(await testDb.db.collection("tallying.counted").countDocuments()).toBe(0);
  const again = await register("abuelo");
  expect(await stats(again)).toEqual({ records: [], overall: [NONE] });
}, 60_000);
