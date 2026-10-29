import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { assembleApplication } from "../../src/assembly.ts";
import { BottingConcept } from "../../src/concepts/Botting.ts";
import { CodeGeneratingConcept } from "../../src/concepts/CodeGenerating.ts";
import { DominoPlayingConcept } from "../../src/concepts/DominoPlaying.ts";
import { MatchmakingConcept } from "../../src/concepts/Matchmaking.ts";
import { SessioningConcept } from "../../src/concepts/Sessioning.ts";
import { TableConcept } from "../../src/concepts/Table.ts";
import { LOCKOUT_MS } from "../../src/concepts/Throttling.ts";
import { expireIdleSessions } from "../../src/expiry.ts";
import { policy } from "../../src/http.ts";
import { tick } from "../../src/ticker.ts";
import { ABSENT_MS, ACCOUNT_SESSION_MS, GUEST_SESSION_MS } from "../../src/timing.ts";
import { openTestDb, type TestDb } from "../test-db.ts";

// Accounts end to end: registering, signing in (and being locked out), being the same
// player on two browsers, changing the password and deleting the account. The clock
// only moves when a test moves it.

let testDb: TestDb;
let now: number;
let gateway: ReturnType<typeof createGateway>;
let api: (request: Request) => Promise<Response>;
const clock = () => new Date(now);
const pass = (ms: number) => (now += ms);

const PASSWORD = "Fichas-de-1957";
const NEW_PASSWORD = "Mesa.Del.Patio.42";

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
const register = async (username: string, password = PASSWORD) =>
  (await call("/accounts/register", { username, password })).body as Player;
const signIn = (username: string, password = PASSWORD) => call("/accounts/signin", { username, password });
const guest = async (displayName: string) => (await call("/guests/start", { displayName })).body as Player;
const me = (token: string) => call("/sessions/me", { token });
const tokenFree = async (code: string) =>
  (await new CodeGeneratingConcept(testDb.db)._isAvailable({ context: "SESSION_TOKENS", code })).available;
const runTicker = () =>
  tick(gateway, {
    games: new DominoPlayingConcept(testDb.db, undefined, clock),
    sessions: new SessioningConcept(testDb.db, clock),
    bots: new BottingConcept(testDb.db),
    matchmaking: new MatchmakingConcept(testDb.db, clock, undefined, 0),
    tables: new TableConcept(testDb.db),
  });

const UNAUTHORIZED = { status: 401, body: { error: "UNAUTHORIZED" } };
const WRONG = UNAUTHORIZED;
const LOCKED = { status: 403, body: { error: "FORBIDDEN" } };

// Registering

test("registering signs the new account in, and it is recognized by its username", async () => {
  const result = await call("/accounts/register", { username: "abuelo_pr", password: PASSWORD });
  expect(result.status).toBe(200);
  expect(Object.keys(result.body).sort()).toEqual(["player", "token"]);
  const { player, token } = result.body;
  expect(token).toMatch(/^[A-HJ-NP-Z2-9]{32}$/);
  expect(await tokenFree(token)).toBe(false);
  expect(await me(token)).toEqual({
    status: 200,
    body: { player, displayName: "abuelo_pr", username: "abuelo_pr" },
  });
});

test("a guest is told apart from an account: only the account has a username", async () => {
  const g = await guest("Abuelo");
  expect((await me(g.token)).body).toEqual({ player: g.player, displayName: "Abuelo" });
});

test("registering refuses a bad username, a taken one, and a weak password", async () => {
  await register("abuelo_pr");
  const bad = { status: 400, body: { error: "INVALID_REQUEST" } };
  expect(await call("/accounts/register", { username: "ab", password: PASSWORD })).toEqual(bad);
  expect(await call("/accounts/register", { username: "abuelo pr", password: PASSWORD })).toEqual(bad);
  expect(await call("/accounts/register", { username: "papo", password: "password123" })).toEqual(bad);
  expect(await call("/accounts/register", { username: "papo", password: "Papo-es-1957" })).toEqual(bad);
  expect(await call("/accounts/register", { username: "ABUELO_PR", password: NEW_PASSWORD })).toEqual({
    status: 409,
    body: { error: "CONFLICT" },
  });
  // None of those left an account, a session or a token behind.
  expect(await testDb.db.collection("passwordAuthenticating.users").countDocuments()).toBe(1);
  expect(await testDb.db.collection("sessioning.sessions").countDocuments()).toBe(1);
  expect(await testDb.db.collection("codeGenerating.codes").countDocuments()).toBe(1);
});

test("registering needs both fields, as strings", async () => {
  for (const body of [{}, { username: "abuelo" }, { password: PASSWORD }, { username: 7, password: PASSWORD }, { username: "abuelo", password: null }]) {
    expect((await call("/accounts/register", body)).status).toBe(400);
  }
});

test("the password check lists every rule a password breaks, before anything is sent", async () => {
  expect((await call("/accounts/password-check", { username: "abuelo", password: "abuelo" })).body).toEqual({
    check: { weaknesses: [{ rule: "LENGTH" }, { rule: "VARIETY" }, { rule: "CONTAINS_USERNAME" }] },
  });
  expect((await call("/accounts/password-check", { username: "abuelo", password: "Password123!" })).body).toEqual({
    check: { weaknesses: [{ rule: "COMMON" }] },
  });
  expect((await call("/accounts/password-check", { username: "abuelo", password: PASSWORD })).body).toEqual({
    check: { weaknesses: [] },
  });
  expect((await call("/accounts/password-check", { username: "abuelo" })).status).toBe(400);
  // Checking creates nothing.
  expect(await testDb.db.collection("passwordAuthenticating.users").countDocuments()).toBe(0);
});

// Signing in

test("signing in with the right pair starts a new session for the same player", async () => {
  const registered = await register("abuelo_pr");
  const signedIn = await signIn("abuelo_pr");
  expect(signedIn.status).toBe(200);
  expect(signedIn.body.player).toBe(registered.player);
  expect(signedIn.body.token).not.toBe(registered.token);
  // Both browsers are signed in, as the same player.
  expect((await me(registered.token)).body.player).toBe(registered.player);
  expect((await me(signedIn.body.token)).body.player).toBe(registered.player);
});

test("the username's case does not matter for signing in", async () => {
  const { player } = await register("AbueloPR");
  expect((await signIn("abuelopr")).body.player).toBe(player);
  expect((await signIn("ABUELOPR")).body.player).toBe(player);
  expect((await me((await signIn("abuelopr")).body.token)).body.username).toBe("AbueloPR");
});

test("a wrong password and an unknown username get the very same answer", async () => {
  await register("abuelo_pr");
  expect(await signIn("abuelo_pr", NEW_PASSWORD)).toEqual(WRONG);
  expect(await signIn("nobody_here", PASSWORD)).toEqual(WRONG);
  expect(await signIn("abuelo_pr", "")).toEqual(WRONG);
  expect(await signIn("", "")).toEqual(WRONG);
  // No session was started by any of them.
  expect(await testDb.db.collection("sessioning.sessions").countDocuments()).toBe(1);
});

test("a guest's name is not an account: guests cannot be signed in to", async () => {
  await guest("abuelo_pr");
  expect(await signIn("abuelo_pr", PASSWORD)).toEqual(WRONG);
});

test("signing in needs both fields, as strings", async () => {
  for (const body of [{}, { username: "abuelo" }, { password: PASSWORD }, { username: "abuelo", password: 1957 }]) {
    expect((await call("/accounts/signin", body)).status).toBe(400);
  }
});

test("five wrong passwords lock the account for fifteen minutes, even for the right password", async () => {
  await register("abuelo_pr");
  for (let i = 0; i < 5; i++) expect(await signIn("abuelo_pr", `Wrong-guess-${i}x`)).toEqual(WRONG);
  expect(await signIn("abuelo_pr")).toEqual(LOCKED);
  expect(await signIn("ABUELO_PR", "Wrong-guess-9x")).toEqual(LOCKED);
  pass(LOCKOUT_MS - 1000);
  expect(await signIn("abuelo_pr")).toEqual(LOCKED);
  pass(1000);
  expect((await signIn("abuelo_pr")).status).toBe(200);
});

test("guesses made while locked are not counted, and do not extend the lock", async () => {
  await register("abuelo_pr");
  for (let i = 0; i < 5; i++) await signIn("abuelo_pr", `Wrong-guess-${i}x`);
  for (let i = 0; i < 20; i++) await signIn("abuelo_pr", `Wrong-again-${i}x`);
  pass(LOCKOUT_MS);
  expect((await signIn("abuelo_pr")).status).toBe(200);
});

test("signing in starts the count of failures over", async () => {
  await register("abuelo_pr");
  for (let i = 0; i < 4; i++) await signIn("abuelo_pr", `Wrong-guess-${i}x`);
  expect((await signIn("abuelo_pr")).status).toBe(200);
  for (let i = 0; i < 4; i++) expect(await signIn("abuelo_pr", `Wrong-guess-${i}x`)).toEqual(WRONG);
  expect((await signIn("abuelo_pr")).status).toBe(200);
});

test("a locked account does not lock anyone else, and unknown usernames never lock", async () => {
  await register("abuelo_pr");
  await register("papo_pr");
  for (let i = 0; i < 5; i++) await signIn("abuelo_pr", `Wrong-guess-${i}x`);
  expect((await signIn("papo_pr")).status).toBe(200);
  for (let i = 0; i < 10; i++) expect(await signIn("nobody_here", `Wrong-guess-${i}x`)).toEqual(WRONG);
  expect(await testDb.db.collection("throttling.keys").countDocuments()).toBe(1);
});

test("a lock does not sign out browsers that are already signed in", async () => {
  const { token } = await register("abuelo_pr");
  for (let i = 0; i < 5; i++) await signIn("abuelo_pr", `Wrong-guess-${i}x`);
  expect((await me(token)).status).toBe(200);
});

// One player on several browsers

test("an account signed in on two browsers is one player at one table", async () => {
  const laptop = await register("abuelo_pr");
  const phone = (await signIn("abuelo_pr")).body as Player;
  const { code } = (await call("/tables/open", { token: laptop.token, rules: "DEFAULT" })).body;
  // From the phone it is the same seat, and the account cannot sit down twice.
  expect((await call("/tables/lobby", { token: phone.token })).body.lobby.tables[0].code).toBe(code);
  expect((await call("/tables/join", { token: phone.token, code })).status).toBe(409);
  expect((await call("/tables/open", { token: phone.token, rules: "DEFAULT" })).status).toBe(409);
});

test("signing out on one browser keeps the account at its table; signing out of the last one gets it up", async () => {
  const laptop = await register("abuelo_pr");
  const phone = (await signIn("abuelo_pr")).body as Player;
  const papo = await guest("Papo");
  const { code } = (await call("/tables/open", { token: laptop.token, rules: "DEFAULT" })).body;
  await call("/tables/join", { token: papo.token, code });

  expect(await call("/sessions/end", { token: laptop.token })).toEqual({ status: 200, body: { player: laptop.player } });
  expect(await tokenFree(laptop.token)).toBe(true);
  expect(await me(laptop.token)).toEqual(UNAUTHORIZED);
  let seats = (await call("/tables/lobby", { token: papo.token })).body.lobby.tables[0].seats;
  expect(seats.map((s: { displayName: string }) => s.displayName)).toEqual(["abuelo_pr", "Papo"]);

  await call("/sessions/end", { token: phone.token });
  seats = (await call("/tables/lobby", { token: papo.token })).body.lobby.tables[0].seats;
  expect(seats.map((s: { displayName: string }) => s.displayName)).toEqual(["Papo"]);
  // Signing out does not delete the account: signing in again works.
  expect((await signIn("abuelo_pr")).body.player).toBe(laptop.player);
});

test("signing out of the last browser also stops waiting for strangers", async () => {
  const { token, player } = await register("abuelo_pr");
  await call("/matchmaking/enqueue", { token, rules: "DEFAULT", midway: false });
  await call("/sessions/end", { token });
  expect(await testDb.db.collection("matchmaking.lobbies").countDocuments({ "entries.player": player })).toBe(0);
});

test("an open page on either browser keeps the account present in a game", async () => {
  const laptop = await register("abuelo_pr");
  const phone = (await signIn("abuelo_pr")).body as Player;
  const others = [await guest("Papo"), await guest("Nando"), await guest("Cheo")];
  const { code } = (await call("/tables/open", { token: laptop.token, rules: "DEFAULT" })).body;
  for (const g of others) await call("/tables/join", { token: g.token, code });
  await call("/games/start", { token: laptop.token });

  // The laptop went quiet, but the phone keeps checking in.
  for (let waited = 0; waited < 2 * ABSENT_MS; waited += 2000) {
    pass(2000);
    for (const t of [phone.token, ...others.map((g) => g.token)]) await me(t);
    await runTicker();
  }
  const game = (await call("/games/view", { token: laptop.token })).body.view.games[0];
  expect(game.status).toBe("ACTIVE");
  expect(game.players.find((p: { player: string }) => p.player === laptop.player).displayName).toBe("abuelo_pr");
});

test("an account's name shows in the game, the move log and the queue", async () => {
  const abuelo = await register("abuelo_pr");
  const others = [await guest("Papo"), await guest("Nando"), await guest("Cheo")];
  const { code } = (await call("/tables/open", { token: abuelo.token, rules: "DEFAULT" })).body;
  for (const g of others) await call("/tables/join", { token: g.token, code });
  await call("/games/start", { token: abuelo.token });
  const game = (await call("/games/view", { token: others[0].token })).body.view.games[0];
  expect(game.players.map((p: { displayName: string }) => p.displayName).sort()).toEqual(["Cheo", "Nando", "Papo", "abuelo_pr"]);
  const sat = game.log.filter((t: { move: string }) => t.move === "SAT" || t.player === abuelo.player);
  for (const t of sat.filter((t: { player: string }) => t.player === abuelo.player)) expect(t.displayName).toBe("abuelo_pr");

  const tio = await register("tio_cheo");
  await call("/matchmaking/enqueue", { token: tio.token, rules: "LONG", midway: false });
  const queue = (await call("/matchmaking/view", { token: tio.token })).body.queue.lobbies[0];
  expect(queue.players).toEqual([{ player: tio.player, displayName: "tio_cheo", midway: false }]);
});

// Session lifetimes

test("an account's session lasts thirty days unused, not twelve hours like a guest's", async () => {
  const account = await register("abuelo_pr");
  const g = await guest("Papo");
  pass(GUEST_SESSION_MS + 1);
  expect(await me(g.token)).toEqual(UNAUTHORIZED);
  expect((await me(account.token)).status).toBe(200);
  pass(ACCOUNT_SESSION_MS - 1);
  expect((await me(account.token)).status).toBe(200);
  pass(ACCOUNT_SESSION_MS + 1);
  expect(await me(account.token)).toEqual(UNAUTHORIZED);
});

test("the expiry timer ends a stale account session but keeps the account", async () => {
  const account = await register("abuelo_pr");
  const sessions = new SessioningConcept(testDb.db, clock);
  pass(GUEST_SESSION_MS + 1);
  await expireIdleSessions(gateway, sessions);
  expect((await me(account.token)).status).toBe(200);
  pass(ACCOUNT_SESSION_MS + 1);
  await expireIdleSessions(gateway, sessions);
  expect(await tokenFree(account.token)).toBe(true);
  expect(await testDb.db.collection("sessioning.sessions").countDocuments()).toBe(0);
  expect((await signIn("abuelo_pr")).body.player).toBe(account.player);
});

// Changing the password

test("changing the password signs out every other browser, but not this one", async () => {
  const laptop = await register("abuelo_pr");
  const phone = (await signIn("abuelo_pr")).body as Player;
  const tablet = (await signIn("abuelo_pr")).body as Player;
  const papo = await register("papo_pr");

  expect(await call("/accounts/password", { token: laptop.token, current: PASSWORD, password: NEW_PASSWORD })).toEqual({
    status: 200,
    body: { player: laptop.player },
  });
  expect((await me(laptop.token)).status).toBe(200);
  expect(await me(phone.token)).toEqual(UNAUTHORIZED);
  expect(await me(tablet.token)).toEqual(UNAUTHORIZED);
  expect(await tokenFree(phone.token)).toBe(true);
  expect(await tokenFree(tablet.token)).toBe(true);
  // Other accounts are not touched.
  expect((await me(papo.token)).status).toBe(200);
  // Only the new password works now.
  expect(await signIn("abuelo_pr", PASSWORD)).toEqual(WRONG);
  expect((await signIn("abuelo_pr", NEW_PASSWORD)).body.player).toBe(laptop.player);
});

test("changing the password keeps the account at its table", async () => {
  const laptop = await register("abuelo_pr");
  await signIn("abuelo_pr");
  const { code } = (await call("/tables/open", { token: laptop.token, rules: "DEFAULT" })).body;
  await call("/accounts/password", { token: laptop.token, current: PASSWORD, password: NEW_PASSWORD });
  expect((await call("/tables/lobby", { token: laptop.token })).body.lobby.tables[0].code).toBe(code);
});

test("changing the password refuses a wrong current one or a weak new one, and signs nobody out", async () => {
  const laptop = await register("abuelo_pr");
  const phone = (await signIn("abuelo_pr")).body as Player;
  expect(await call("/accounts/password", { token: laptop.token, current: NEW_PASSWORD, password: "Otra-Clave-2026" })).toEqual(
    UNAUTHORIZED,
  );
  const weak = { status: 400, body: { error: "INVALID_REQUEST" } };
  expect(await call("/accounts/password", { token: laptop.token, current: PASSWORD, password: "password1" })).toEqual(weak);
  expect(await call("/accounts/password", { token: laptop.token, current: PASSWORD, password: PASSWORD })).toEqual(weak);
  expect((await me(phone.token)).status).toBe(200);
  expect((await me(laptop.token)).status).toBe(200);
  expect((await signIn("abuelo_pr")).status).toBe(200);
});

test("a guest has no password to change or account to delete", async () => {
  const g = await guest("Abuelo");
  const forbidden = { status: 403, body: { error: "FORBIDDEN" } };
  expect(await call("/accounts/password", { token: g.token, current: PASSWORD, password: NEW_PASSWORD })).toEqual(forbidden);
  expect(await call("/accounts/delete", { token: g.token, password: PASSWORD })).toEqual(forbidden);
  expect((await me(g.token)).status).toBe(200);
});

// Deleting the account

test("deleting the account signs it out everywhere, frees its username and gets it up from its table", async () => {
  const laptop = await register("abuelo_pr");
  const phone = (await signIn("abuelo_pr")).body as Player;
  const papo = await guest("Papo");
  const { code } = (await call("/tables/open", { token: laptop.token, rules: "DEFAULT" })).body;
  await call("/tables/join", { token: papo.token, code });

  expect(await call("/accounts/delete", { token: phone.token, password: PASSWORD })).toEqual({
    status: 200,
    body: { player: laptop.player },
  });
  expect(await me(laptop.token)).toEqual(UNAUTHORIZED);
  expect(await me(phone.token)).toEqual(UNAUTHORIZED);
  expect(await tokenFree(laptop.token)).toBe(true);
  expect(await tokenFree(phone.token)).toBe(true);
  const lobby = (await call("/tables/lobby", { token: papo.token })).body.lobby.tables[0];
  expect(lobby.host).toBe(papo.player);
  expect(lobby.seats.map((s: { player: string }) => s.player)).toEqual([papo.player]);
  expect(await signIn("abuelo_pr")).toEqual(WRONG);
  // Someone else may now register the name, as a new player.
  const again = await register("abuelo_pr", NEW_PASSWORD);
  expect(again.player).not.toBe(laptop.player);
});

test("deleting the account pauses its game and frees its seat, as leaving does", async () => {
  const abuelo = await register("abuelo_pr");
  const others = [await guest("Papo"), await guest("Nando"), await guest("Cheo")];
  const { code } = (await call("/tables/open", { token: abuelo.token, rules: "DEFAULT" })).body;
  for (const g of others) await call("/tables/join", { token: g.token, code });
  await call("/games/start", { token: abuelo.token });
  await call("/accounts/delete", { token: abuelo.token, password: PASSWORD });
  const game = (await call("/games/view", { token: others[0].token })).body.view.games[0];
  expect(game.status).toBe("PAUSED");
  expect(game.vacancies).toHaveLength(1);
});

test("deleting the account also stops it waiting for strangers and forgets its failed sign-ins", async () => {
  const { token, player } = await register("abuelo_pr");
  await call("/matchmaking/enqueue", { token, rules: "DEFAULT", midway: false });
  await signIn("abuelo_pr", "Wrong-guess-1x");
  expect(await testDb.db.collection("throttling.keys").countDocuments({ _id: player as never })).toBe(1);
  await call("/accounts/delete", { token, password: PASSWORD });
  expect(await testDb.db.collection("matchmaking.lobbies").countDocuments({ "entries.player": player })).toBe(0);
  expect(await testDb.db.collection("throttling.keys").countDocuments()).toBe(0);
});

test("deleting needs the right password", async () => {
  const { token } = await register("abuelo_pr");
  expect(await call("/accounts/delete", { token, password: NEW_PASSWORD })).toEqual(UNAUTHORIZED);
  expect((await me(token)).status).toBe(200);
  expect((await signIn("abuelo_pr")).status).toBe(200);
  expect((await call("/accounts/delete", { token })).status).toBe(400);
});

test("no response ever carries a password or its hash", async () => {
  const { token } = await register("abuelo_pr");
  const responses = [
    await me(token),
    await signIn("abuelo_pr"),
    await signIn("abuelo_pr", "Wrong-guess-1x"),
    await call("/accounts/password-check", { username: "abuelo_pr", password: PASSWORD }),
    await call("/accounts/password", { token, current: PASSWORD, password: NEW_PASSWORD }),
  ];
  for (const r of responses) {
    const text = JSON.stringify(r.body);
    expect(text).not.toContain(PASSWORD);
    expect(text).not.toContain(NEW_PASSWORD);
    expect(text).not.toContain("argon2");
  }
});
