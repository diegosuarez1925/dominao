import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { assembleApplication } from "../../src/assembly.ts";
import { policy } from "../../src/http.ts";
import { openTestDb, type TestDb } from "../test-db.ts";

let testDb: TestDb;
let api: (request: Request) => Promise<Response>;

beforeAll(async () => {
  testDb = await openTestDb();
  const application = assembleApplication(testDb.db);
  api = createHttpHandler({ application, gateway: createGateway({ application }), policy });
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

/** Four guests sit at one table; the first is the host. */
async function fullTable() {
  const guests = [];
  for (const displayName of ["Abuelo", "Papo", "Nando", "Cheo"]) {
    guests.push((await call("/guests/start", { displayName })).body as { session: string; token: string });
  }
  const { table, code } = (await call("/tables/open", { token: guests[0].token })).body;
  for (const guest of guests.slice(1)) await call("/tables/join", { token: guest.token, code });
  return { guests, table, code };
}

const view = async (token: string) => (await call("/games/view", { token })).body.view.games[0];

test("only the host of a full table can start a game", async () => {
  const abuelo = (await call("/guests/start", { displayName: "Abuelo" })).body;
  const papo = (await call("/guests/start", { displayName: "Papo" })).body;
  expect((await call("/games/start", { token: abuelo.token })).body).toEqual({ error: "NOT_FOUND" });
  const { code } = (await call("/tables/open", { token: abuelo.token })).body;
  await call("/tables/join", { token: papo.token, code });
  expect((await call("/games/start", { token: abuelo.token })).status).toBe(409);
  expect((await call("/games/start", { token: papo.token })).status).toBe(403);
});

test("each player sees the same game but only their own hand", async () => {
  const { guests } = await fullTable();
  expect((await call("/games/start", { token: guests[0].token })).status).toBe(200);
  expect((await call("/games/start", { token: guests[0].token })).status).toBe(409);

  const views = await Promise.all(guests.map((guest) => view(guest.token)));
  expect(views[0].board).toEqual([{ tile: "6-6", left: 6, right: 6, fromFirst: 0 }]);
  expect(views[0].players.map((p: { displayName: string }) => p.displayName)).toEqual(["Abuelo", "Papo", "Nando", "Cheo"]);
  const hands = views.map((v) => v.hand.map((row: { tile: string }) => row.tile));
  // 27 tiles left after the double six, all different, none seen twice.
  expect(new Set(hands.flat()).size).toBe(27);
  for (const v of views) expect(v.game).toBe(views[0].game);
});

test("four guests play a whole game to 200 through the API", async () => {
  const { guests } = await fullTable();
  await call("/games/start", { token: guests[0].token });
  const bySession = new Map(guests.map((guest) => [guest.session, guest.token]));

  let plays = 0;
  for (let moves = 0; moves < 3000; moves++) {
    const state = await view(guests[0].token);
    if (state.status === "FINISHED") break;
    const token = bySession.get(state.turnPlayer)!;
    const mine = await view(token);
    const left = mine.board[0]?.left;
    const right = mine.board.at(-1)?.right;
    const move = mine.hand
      .map(({ tile }: { tile: string }) => {
        const [a, b] = tile.split("-").map(Number);
        if (mine.board.length === 0 || a === left || b === left) return { tile, side: "LEFT" };
        if (a === right || b === right) return { tile, side: "RIGHT" };
        return undefined;
      })
      .find(Boolean);
    const played = await call("/games/play", { token, game: mine.game, ...move });
    expect(played.status).toBe(200);
    plays++;
  }
  const final = await view(guests[2].token);
  expect(final.status).toBe("FINISHED");
  expect(Math.max(final.scoreA, final.scoreB)).toBeGreaterThanOrEqual(200);
  expect(final.lastResult).toHaveLength(1);
  // Every turn is in the log, even repeated skips: one row per play (plus the opening
  // double six, which plays itself), numbered 1, 2, 3, … with no gaps.
  const turns = final.log.map((row: { turn: number }) => row.turn).sort((a: number, b: number) => a - b);
  expect(turns).toEqual(turns.map((_: number, index: number) => index + 1));
  expect(final.log.filter((row: { move: string }) => row.move === "PLAYED")).toHaveLength(plays + 1);
  expect(final.log.some((row: { move: string }) => row.move === "SKIPPED")).toBe(true);
}, 60_000);

test("playing out of turn is refused", async () => {
  const { guests } = await fullTable();
  await call("/games/start", { token: guests[0].token });
  const state = await view(guests[0].token);
  const other = guests.find((guest) => guest.session !== state.turnPlayer)!;
  const tile = (await view(other.token)).hand[0].tile;
  expect((await call("/games/play", { token: other.token, game: state.game, tile, side: "LEFT" })).status).toBe(409);
  expect((await call("/games/play", { token: other.token, game: state.game, tile, side: "UP" })).status).toBe(400);
});

test("a player leaving the table abandons the game", async () => {
  const { guests, table } = await fullTable();
  await call("/games/start", { token: guests[0].token });
  await call("/tables/leave", { token: guests[3].token, table });
  expect((await view(guests[0].token)).status).toBe("ABANDONED");
  // Once the seat is filled again, the host can start a new game.
  const newcomer = (await call("/guests/start", { displayName: "Tío" })).body;
  const { code } = (await call("/tables/lobby", { token: guests[0].token })).body.lobby.tables[0];
  await call("/tables/join", { token: newcomer.token, code });
  expect((await call("/games/start", { token: guests[0].token })).status).toBe(200);
  expect((await view(newcomer.token)).status).toBe("ACTIVE");
});
