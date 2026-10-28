import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { assembleApplication } from "../../src/assembly.ts";
import { policy } from "../../src/http.ts";
import { openTestDb, type TestDb } from "../test-db.ts";

// Who may do what, across every endpoint: a guest is only ever the guest whose token
// they hold, never someone named in the request, and nobody sees another guest's token.

let testDb: TestDb;
let api: (request: Request) => Promise<Response>;

beforeAll(async () => {
  testDb = await openTestDb();
  const application = assembleApplication(testDb.db, { matchmakingCountdownMs: 0 });
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

async function guest(displayName: string) {
  return (await call("/guests/start", { displayName })).body as { session: string; token: string };
}

/** Four guests at one table with a game started; the first is the host. */
async function playing() {
  const guests = [];
  for (const displayName of ["Abuelo", "Papo", "Nando", "Cheo"]) guests.push(await guest(displayName));
  const { table, code } = (await call("/tables/open", { token: guests[0].token, rules: "DEFAULT" })).body;
  for (const g of guests.slice(1)) await call("/tables/join", { token: g.token, code });
  await call("/games/start", { token: guests[0].token });
  return { guests, table, code };
}

/** The game the guest sees, without how long each player has been idle (which changes with every request). */
const view = async (token: string) => {
  const game = (await call("/games/view", { token })).body.view.games[0];
  for (const player of game?.players ?? []) delete player.idleMs;
  return game;
};

/** Every endpoint that acts for a guest, with a body that is otherwise well formed. */
const guestEndpoints = (table: string, game: string, code: string): [string, Record<string, string>][] => [
  ["/guests/me", {}],
  ["/guests/leave", {}],
  ["/tables/lobby", {}],
  ["/tables/open", { rules: "DEFAULT" }],
  ["/tables/join", { code }],
  ["/tables/leave", { table }],
  ["/tables/close", { table }],
  ["/games/view", {}],
  ["/games/start", {}],
  ["/games/play", { game, tile: "6-5", side: "LEFT" }],
  ["/matchmaking/view", {}],
  ["/matchmaking/enqueue", { rules: "DEFAULT", midway: false }],
  ["/matchmaking/leave", {}],
];

test("every guest endpoint turns away an invented token, a signed-out token, and a session id", async () => {
  const { guests, table, code } = await playing();
  const { game } = await view(guests[0].token);
  const gone = await guest("Tío");
  await call("/guests/leave", { token: gone.token });
  const before = await view(guests[0].token);

  for (const [path, body] of guestEndpoints(table, game, code)) {
    // Made up, ended, or another guest's session id (which views do show) in place of a token.
    for (const token of ["made-up", gone.token, guests[0].session]) {
      expect({ path, ...(await call(path, { ...body, token })) }).toEqual({
        path,
        status: 401,
        body: { error: "UNAUTHORIZED" },
      });
    }
    expect({ path, status: (await call(path, body)).status }).toEqual({ path, status: 400 });
  }
  // None of that touched the table or the game.
  expect(await view(guests[0].token)).toEqual(before);
});

test("naming another guest in the request does not act as them", async () => {
  const { guests, table } = await playing();
  const [abuelo, papo] = guests;
  const before = await view(abuelo.token);
  const turnPlayer = guests.find((g) => g.session === before.turnPlayer)!;
  const notTurn = guests.find((g) => g.session !== before.turnPlayer)!;
  const tile = (await view(turnPlayer.token)).hand[0].tile;

  // Papo claims to be the host, or names the host as the session.
  expect((await call("/tables/close", { token: papo.token, table, session: abuelo.session, host: papo.session })).status).toBe(403);
  // A player whose turn it is not names the one whose turn it is.
  const play = { token: notTurn.token, game: before.game, tile, side: "LEFT" };
  expect((await call("/games/play", { ...play, player: turnPlayer.session, session: turnPlayer.session })).status).toBe(409);
  // A non-host starts again naming the host.
  expect((await call("/games/start", { token: papo.token, session: abuelo.session })).status).toBe(403);

  expect(await view(abuelo.token)).toEqual(before);
  expect((await call("/tables/lobby", { token: abuelo.token })).body.lobby.tables[0].seats).toHaveLength(4);
});

test("no response ever carries another guest's token", async () => {
  const { guests, code } = await playing();
  const strangers = [];
  for (const displayName of ["Uno", "Dos", "Tres"]) strangers.push(await guest(displayName));
  for (const s of strangers) await call("/matchmaking/enqueue", { token: s.token, rules: "DEFAULT", midway: false });

  const everyone = [...guests, ...strangers];
  for (const me of everyone) {
    const responses = [
      await call("/guests/me", { token: me.token }),
      await call("/tables/lobby", { token: me.token }),
      await call("/games/view", { token: me.token }),
      await call("/matchmaking/view", { token: me.token }),
      await call("/games/rulesets", {}),
    ];
    const text = JSON.stringify(responses);
    for (const other of everyone) if (other !== me) expect(text).not.toContain(other.token);
  }
  // Joining by code answers the table and seat, not who sits there.
  const late = await guest("Tarde");
  expect(JSON.stringify((await call("/tables/join", { token: late.token, code })).body)).not.toContain("token");
});

test("a guest at a table cannot open a second one", async () => {
  const { guests, table } = await playing();
  expect(await call("/tables/open", { token: guests[1].token, rules: "DEFAULT" })).toEqual({
    status: 409,
    body: { error: "CONFLICT" },
  });
  expect((await call("/tables/lobby", { token: guests[1].token })).body.lobby.tables[0].table).toBe(table);
});

test("the host cannot start a second game while one is being played", async () => {
  const { guests } = await playing();
  const before = await view(guests[0].token);
  expect((await call("/games/start", { token: guests[0].token })).status).toBe(409);
  expect(await view(guests[0].token)).toEqual(before);
});

test("a paused game, and a stopped one, take no more moves", async () => {
  const { guests, table } = await playing();
  const state = await view(guests[0].token);
  const turnPlayer = guests.find((g) => g.session === state.turnPlayer)!;
  const tile = (await view(turnPlayer.token)).hand[0].tile;
  const leaver = guests.find((g) => g !== turnPlayer && g !== guests[0])!;
  await call("/tables/leave", { token: leaver.token, table });

  const move = { token: turnPlayer.token, game: state.game, tile, side: "LEFT" };
  expect(await call("/games/play", move)).toEqual({ status: 409, body: { error: "CONFLICT" } });
  expect((await view(turnPlayer.token)).status).toBe("PAUSED");
  // The one who left cannot play from outside, either.
  expect((await call("/games/play", { ...move, token: leaver.token })).status).toBe(409);

  await call("/tables/close", { token: guests[0].token, table });
  expect(await call("/games/play", move)).toEqual({ status: 409, body: { error: "CONFLICT" } });
});

test("a stranger matched into a game can only act as themself there", async () => {
  const strangers = [];
  for (const displayName of ["Uno", "Dos", "Tres", "Cuatro"]) strangers.push(await guest(displayName));
  for (const s of strangers) await call("/matchmaking/enqueue", { token: s.token, rules: "DEFAULT", midway: false });
  // The server launches the lobby (as its timer would); nobody acts for a guest in doing so.
  const outsider = await guest("Fuera");
  const { lobby } = (await call("/matchmaking/view", { token: strangers[0].token })).body.queue.lobbies[0];
  expect((await call("/matchmaking/launch", { lobby })).status).toBe(200);

  const game = await view(strangers[0].token);
  expect(game.status).toBe("ACTIVE");
  // Whoever Matchmaking made host cannot restart the strangers' game, and the others are not hosts.
  const { host } = (await call("/tables/lobby", { token: strangers[0].token })).body.lobby.tables[0];
  for (const s of strangers) {
    expect((await call("/games/start", { token: s.token })).status).toBe(s.session === host ? 409 : 403);
  }
  // The outsider sees nothing of it.
  expect((await call("/games/view", { token: outsider.token })).body.view.games).toEqual([]);
  expect((await call("/tables/lobby", { token: outsider.token })).body.lobby.tables).toEqual([]);
  expect(await view(strangers[0].token)).toEqual(game);
});
