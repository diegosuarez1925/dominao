import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { assembleApplication } from "../../src/assembly.ts";
import { BottingConcept } from "../../src/concepts/Botting.ts";
import { DominoPlayingConcept } from "../../src/concepts/DominoPlaying.ts";
import { GuestSessioningConcept } from "../../src/concepts/GuestSessioning.ts";
import { policy } from "../../src/http.ts";
import { tick } from "../../src/ticker.ts";
import { ABSENT_MS, BOT_AFTER_MS, BOT_MOVE_MS } from "../../src/timing.ts";
import { openTestDb, type TestDb } from "../test-db.ts";

// Someone getting up mid-game pauses it; a person who sits down carries on with their
// seat and hand; after a while a bot takes the seat, and a person can still take it
// from the bot. The clock only moves when a test moves it, and the server's ticker is
// run by hand, so every wait is exact.

let testDb: TestDb;
let now: number;
let gateway: ReturnType<typeof createGateway>;
let api: (request: Request) => Promise<Response>;
const clock = () => new Date(now);
const pass = (ms: number) => (now += ms);

beforeAll(async () => {
  testDb = await openTestDb();
  const application = assembleApplication(testDb.db, { clock, matchmakingCountdownMs: 0 });
  gateway = createGateway({ application });
  api = createHttpHandler({ application, gateway, policy });
}, 120_000);

beforeEach(async () => {
  await testDb.db.dropDatabase();
  now = Date.parse("2026-10-27T12:00:00Z");
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

type Guest = { session: string; token: string; name: string };
async function guest(name: string): Promise<Guest> {
  return { ...(await call("/guests/start", { displayName: name })).body, name };
}

/** What the server's one-second timer does, run once. */
const runTicker = () =>
  tick(gateway, {
    games: new DominoPlayingConcept(testDb.db, undefined, clock),
    sessions: new GuestSessioningConcept(testDb.db, clock),
    bots: new BottingConcept(testDb.db),
  });

const view = async (g: Guest) => (await call("/games/view", { token: g.token })).body.view.games[0];
const tableOf = async (g: Guest) => (await call("/tables/lobby", { token: g.token })).body.lobby.tables[0];
const queueOf = async (g: Guest) => (await call("/matchmaking/view", { token: g.token })).body.queue.lobbies[0];
const handOf = async (g: Guest) => (await view(g)).hand.map((h: { tile: string }) => h.tile);

/** Four friends at a private table with a game started; the first is the host. */
async function privateGame() {
  const guests = [];
  for (const name of ["Abuelo", "Papo", "Nando", "Cheo"]) guests.push(await guest(name));
  const { table, code } = (await call("/tables/open", { token: guests[0].token, rules: "DEFAULT" })).body;
  for (const g of guests.slice(1)) await call("/tables/join", { token: g.token, code });
  await call("/games/start", { token: guests[0].token });
  return { guests, table, code };
}

/** Four strangers matched into a game by Matchmaking. */
async function publicGame(rules = "DEFAULT") {
  const guests = [];
  for (const name of ["Uno", "Dos", "Tres", "Cuatro"]) guests.push(await guest(name));
  for (const g of guests) await call("/matchmaking/enqueue", { token: g.token, rules, midway: false });
  await call("/matchmaking/launch", { token: guests[0].token });
  const { table, code } = await tableOf(guests[0]);
  return { guests, table, code };
}

const enqueue = (g: Guest, rules: string, midway: boolean) => call("/matchmaking/enqueue", { token: g.token, rules, midway });

/** Keeps the given guests' pages checking in, as an open page does every two seconds. */
const checkIn = async (...guests: Guest[]) => {
  for (const g of guests) await call("/guests/me", { token: g.token });
};

// Private tables

test("principle: a leaver's seat waits 30 seconds, then a bot plays it, until a friend takes it over", async () => {
  const { guests, table, code } = await privateGame();
  const [abuelo, papo] = guests;
  const papoHand = await handOf(papo);
  await call("/tables/leave", { token: papo.token, table });

  // Paused, with Papo's seat empty and counting.
  pass(BOT_AFTER_MS - 1000);
  await checkIn(...guests);
  await runTicker();
  let game = await view(abuelo);
  expect(game.status).toBe("PAUSED");
  expect(game.vacancies).toEqual([
    { position: 1, player: papo.session, displayName: "Papo", botName: null, vacantMs: BOT_AFTER_MS - 1000 },
  ]);
  expect(game.botAfterMs).toBe(BOT_AFTER_MS);

  // After 30 seconds, a bot takes the seat, hand and all, and play goes on.
  pass(1000);
  await checkIn(...guests);
  await runTicker();
  game = await view(abuelo);
  expect(game.status).toBe("ACTIVE");
  expect(game.vacancies).toEqual([]);
  const seat = game.players[1];
  expect(seat.botName).toMatch(/^Bot /);
  expect(seat.displayName).toBeNull();
  expect(seat.tileCount).toBe(papoHand.length);
  expect(game.log.at(-1)).toMatchObject({ move: "SAT", player: seat.player, botName: seat.botName });
  // The bot is not at the table: its table seat is free for a friend.
  expect((await tableOf(abuelo)).seats.map((s: { position: number }) => s.position)).toEqual([0, 2, 3]);

  // Tío joins by code and takes over from the bot, with the bot's hand.
  const tio = await guest("Tío");
  const botHand = (await new DominoPlayingConcept(testDb.db)._hand({ game: game.game, player: seat.player })).map((h) => h.tile);
  expect((await call("/tables/join", { token: tio.token, code })).body.position).toBe(1);
  const after = await view(tio);
  expect(after).toMatchObject({ game: game.game, status: "ACTIVE", vacancies: [] });
  expect(after.hand.map((h: { tile: string }) => h.tile)).toEqual(botHand);
  expect(after.players[1]).toMatchObject({ player: tio.session, displayName: "Tío", botName: null });
  expect(after.log.slice(-2).map((t: { move: string; displayName: string | null; botName: string | null }) => [t.move, t.displayName ?? t.botName])).toEqual([
    ["LEFT", seat.botName],
    ["SAT", "Tío"],
  ]);
});

test("a friend who joins before the 30 seconds are up takes the empty seat, and no bot comes", async () => {
  const { guests, table, code } = await privateGame();
  const cheoHand = await handOf(guests[3]);
  await call("/tables/leave", { token: guests[3].token, table });
  pass(10_000);
  const tio = await guest("Tío");
  await call("/tables/join", { token: tio.token, code });
  expect(await handOf(tio)).toEqual(cheoHand);
  pass(BOT_AFTER_MS);
  await checkIn(...guests.slice(0, 3), tio);
  await runTicker();
  const game = await view(tio);
  expect(game.players.every((p: { botName: string | null }) => p.botName === null)).toBe(true);
});

test("a bot takes its turn after a moment to think, with a legal move", async () => {
  const { guests, table } = await privateGame();
  // Whoever's turn it is gets up, so the bot that replaces them moves first.
  const first = await view(guests[0]);
  const leaver = guests.find((g) => g.session === first.turnPlayer)!;
  const stay = guests.filter((g) => g !== leaver);
  await call("/tables/leave", { token: leaver.token, table });
  pass(BOT_AFTER_MS);
  await checkIn(...stay);
  await runTicker();
  const seated = await view(stay[0]);
  const bot = seated.players.find((p: { botName: string | null }) => p.botName !== null);
  expect(seated.turnPlayer).toBe(bot.player);

  // Too soon: the bot is still "thinking".
  pass(BOT_MOVE_MS - 500);
  await checkIn(...stay);
  await runTicker();
  expect((await view(stay[0])).log).toHaveLength(seated.log.length);
  pass(500);
  await checkIn(...stay);
  await runTicker();
  const moved = await view(stay[0]);
  expect(moved.log.length).toBeGreaterThan(seated.log.length);
  expect(moved.log[seated.log.length]).toMatchObject({ player: bot.player, botName: bot.botName, move: "PLAYED" });
  expect(moved.players.find((p: { player: string }) => p.player === bot.player).tileCount).toBe(bot.tileCount - 1);
});

test("one guest and three bots play a whole game to its end", async () => {
  const { guests, table } = await privateGame();
  const [abuelo, ...others] = guests;
  for (const g of others) await call("/tables/leave", { token: g.token, table });
  pass(BOT_AFTER_MS);
  await checkIn(abuelo);
  await runTicker();
  expect((await view(abuelo)).players.filter((p: { botName: string | null }) => p.botName !== null)).toHaveLength(3);

  for (let step = 0; step < 3000; step++) {
    const game = await view(abuelo);
    if (game.status !== "ACTIVE") break;
    if (game.turnPlayer === abuelo.session) {
      const ends = game.board.length === 0 ? undefined : { left: game.board[0].left, right: game.board.at(-1).right };
      const fits = (tile: string, end: number) => tile.split("-").map(Number).includes(end);
      const move = game.hand
        .map((h: { tile: string }) => h.tile)
        .flatMap((tile: string) =>
          ends === undefined ? [{ tile, side: "LEFT" }] : [fits(tile, ends.left) && { tile, side: "LEFT" }, fits(tile, ends.right) && { tile, side: "RIGHT" }],
        )
        .find(Boolean);
      expect((await call("/games/play", { token: abuelo.token, game: game.game, ...move })).status).toBe(200);
    } else {
      pass(BOT_MOVE_MS);
      await checkIn(abuelo);
      await runTicker();
    }
  }
  const end = await view(abuelo);
  expect(end.status).toBe("FINISHED");
  expect(Math.max(end.scoreA, end.scoreB)).toBeGreaterThanOrEqual(end.target);
}, 120_000);

test("the game ends early only when every person has left", async () => {
  const { guests, table, code } = await privateGame();
  for (const g of guests.slice(0, 3)) await call("/tables/leave", { token: g.token, table });
  const last = guests[3];
  expect((await view(last)).status).toBe("PAUSED");
  await call("/tables/leave", { token: last.token, table });
  // Nobody is left, so the table closed and its game was abandoned.
  const late = await guest("Tarde");
  expect((await call("/tables/join", { token: late.token, code })).status).toBe(404);
  const games = new DominoPlayingConcept(testDb.db);
  expect(await games._running()).toEqual([]);
});

test("a player whose page stops checking in is taken out of the game, which pauses for them", async () => {
  const { guests, code } = await privateGame();
  const [abuelo, papo, nando, cheo] = guests;
  // Cheo's page is gone; the others keep checking in.
  pass(ABSENT_MS - 1000);
  await checkIn(abuelo, papo, nando);
  await runTicker();
  const before = await view(abuelo);
  expect(before.status).toBe("ACTIVE");
  expect(before.players[3].idleMs).toBe(ABSENT_MS - 1000);
  expect(before.absentAfterMs).toBe(ABSENT_MS);

  pass(1000);
  await checkIn(abuelo, papo, nando);
  await runTicker();
  const after = await view(abuelo);
  expect(after.status).toBe("PAUSED");
  expect(after.vacancies).toMatchObject([{ position: 3, player: cheo.session, displayName: "Cheo" }]);
  expect((await tableOf(abuelo)).seats).toHaveLength(3);
  // Back again, Cheo can sit down with the code like anyone else, and gets his seat back.
  expect((await call("/tables/join", { token: cheo.token, code })).body.position).toBe(3);
  expect((await view(cheo)).status).toBe("ACTIVE");
});

// Tables of strangers

test("a stranger happy to join midway, under the same rules, is sent straight to an empty seat", async () => {
  const { guests, table } = await publicGame();
  const tresHand = await handOf(guests[2]);
  await call("/tables/leave", { token: guests[2].token, table });
  expect((await view(guests[0])).publicRules).toBe("DEFAULT");

  // Someone who wants a fresh game, and someone happy to join midway under other rules, just wait.
  const fresh = await guest("Fresco");
  const other = await guest("Otro");
  await enqueue(fresh, "DEFAULT", false);
  await enqueue(other, "LONG", true);
  expect(await tableOf(fresh)).toBeUndefined();
  expect(await tableOf(other)).toBeUndefined();
  expect((await view(guests[0])).status).toBe("PAUSED");

  // The one who chose the same rules and said yes takes the seat, hand and all.
  const midway = await guest("Medio");
  expect((await enqueue(midway, "DEFAULT", true)).status).toBe(200);
  expect((await tableOf(midway)).table).toBe(table);
  expect(await queueOf(midway)).toBeUndefined();
  expect(await handOf(midway)).toEqual(tresHand);
  expect((await view(midway)).status).toBe("ACTIVE");
  // The others are still waiting where they were.
  expect(await queueOf(fresh)).toBeDefined();
  expect(await queueOf(other)).toBeDefined();
});

test("when a seat empties, the stranger who has waited longest to join midway is sent to it", async () => {
  const { guests, table } = await publicGame();
  const first = await guest("Primero");
  const second = await guest("Segundo");
  await enqueue(first, "DEFAULT", true);
  pass(1000);
  await enqueue(second, "DEFAULT", true);
  await call("/tables/leave", { token: guests[1].token, table });
  expect((await tableOf(first)).table).toBe(table);
  expect(await queueOf(first)).toBeUndefined();
  expect(await tableOf(second)).toBeUndefined();
  expect((await view(first)).status).toBe("ACTIVE");
});

test("a stranger happy to join midway takes over a bot at a table of strangers", async () => {
  const { guests, table } = await publicGame();
  await call("/tables/leave", { token: guests[0].token, table });
  pass(BOT_AFTER_MS);
  await checkIn(...guests.slice(1));
  await runTicker();
  const bot = (await view(guests[1])).players.find((p: { botName: string | null }) => p.botName !== null);
  expect(bot.botName).toMatch(/^Bot /);

  const midway = await guest("Medio");
  await enqueue(midway, "DEFAULT", true);
  const game = await view(midway);
  expect(game.players[bot.position]).toMatchObject({ player: midway.session, displayName: "Medio", botName: null });
  expect(game.status).toBe("ACTIVE");
});

test("a table of strangers cannot be joined by its code", async () => {
  const { guests, table, code } = await publicGame();
  await call("/tables/leave", { token: guests[0].token, table });
  const friend = await guest("Amigo");
  expect(await call("/tables/join", { token: friend.token, code })).toEqual({ status: 403, body: { error: "FORBIDDEN" } });
  expect((await view(guests[1])).status).toBe("PAUSED");
});

test("once a table of strangers closes, nobody is sent to it", async () => {
  const { guests, table } = await publicGame();
  for (const g of guests) await call("/tables/leave", { token: g.token, table });
  const midway = await guest("Medio");
  await enqueue(midway, "DEFAULT", true);
  expect(await tableOf(midway)).toBeUndefined();
  expect(await queueOf(midway)).toBeDefined();
});

// The ticker's endpoints

test("the ticker's endpoints change nothing when asked early, or about the wrong seat or player", async () => {
  const { guests, table } = await privateGame();
  const [abuelo] = guests;
  const { game, turnPlayer } = await view(abuelo);
  // Someone other than the host and whoever's turn it is, so the turn is still theirs after.
  const papo = guests.find((g) => g !== abuelo && g.session !== turnPlayer)!;
  const conflict = { status: 409, body: { error: "CONFLICT" } };
  // A seat nobody left, a player who is here, and a person's turn.
  const seat = guests.indexOf(papo);
  expect(await call("/games/seat-bot", { game, position: seat })).toEqual(conflict);
  expect(await call("/games/drop-absent", { game, player: papo.session })).toEqual(conflict);
  expect(await call("/games/bot-move", { game })).toEqual(conflict);
  // A seat that has not waited long enough yet.
  await call("/tables/leave", { token: papo.token, table });
  pass(BOT_AFTER_MS - 1);
  await checkIn(...guests);
  expect(await call("/games/seat-bot", { game, position: seat })).toEqual(conflict);
  // Badly formed asks.
  expect((await call("/games/seat-bot", { game, position: 7 })).status).toBe(400);
  expect((await call("/games/seat-bot", { game, position: String(seat) })).status).toBe(400);
  expect((await call("/games/drop-absent", { game })).status).toBe(400);

  const unchanged = await view(abuelo);
  expect(unchanged.status).toBe("PAUSED");
  expect(unchanged.players.every((p: { botName: string | null }) => p.botName === null)).toBe(true);
  expect(unchanged.turnPlayer).toBe(turnPlayer);
});
