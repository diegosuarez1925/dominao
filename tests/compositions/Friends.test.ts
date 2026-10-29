import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { assembleApplication } from "../../src/assembly.ts";
import { FriendingConcept, REQUEST_LIFETIME_MS } from "../../src/concepts/Friending.ts";
import { expireOldRequests } from "../../src/expiry.ts";
import { policy } from "../../src/http.ts";
import { ONLINE_MS } from "../../src/timing.ts";
import { openTestDb, type TestDb } from "../test-db.ts";

// Friends end to end: finding an account, friend requests (and their week running
// out), what is pointed out as new, inviting friends to a private table and sitting
// down by the invite, and what a deleted account leaves behind. The clock only moves
// when a test moves it.

let testDb: TestDb;
let now: number;
let gateway: ReturnType<typeof createGateway>;
let api: (request: Request) => Promise<Response>;
const clock = () => new Date(now);
const pass = (ms: number) => (now += ms);

const PASSWORD = "Fichas-de-1957";
const DAY = 24 * 60 * 60 * 1000;

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
const friends = async (who: Player) => (await call("/friends/view", { token: who.token })).body.friends;
const ask = (from: Player, username: string) => call("/friends/request", { token: from.token, username });
/** `a` asks `b` (by the username given), and `b` accepts. */
async function befriend(a: Player, b: Player, bUsername: string) {
  const { request } = (await ask(a, bUsername)).body;
  expect((await call("/friends/accept", { token: b.token, request })).status).toBe(200);
}
const openTable = async (host: Player) => (await call("/tables/open", { token: host.token, rules: "LONG" })).body as { table: string; code: string };
const invite = (host: Player, friend: Player) => call("/invites/send", { token: host.token, friend: friend.player });
const lobby = async (who: Player) => (await call("/tables/lobby", { token: who.token })).body.lobby.tables[0];

const CONFLICT = { status: 409, body: { error: "CONFLICT" } };
const NOT_FOUND = { status: 404, body: { error: "NOT_FOUND" } };
const FORBIDDEN = { status: 403, body: { error: "FORBIDDEN" } };
const BAD = { status: 400, body: { error: "INVALID_REQUEST" } };

// Who can use friends

test("guests have no friends: every friends endpoint answers NOT_AN_ACCOUNT", async () => {
  const g = await guest("Papo");
  await register("abuelo_pr");
  expect(await call("/friends/view", { token: g.token })).toEqual(FORBIDDEN);
  expect(await call("/friends/search", { token: g.token, text: "abu" })).toEqual(FORBIDDEN);
  expect(await ask(g, "abuelo_pr")).toEqual(FORBIDDEN);
  expect(await call("/friends/seen", { token: g.token, part: "REQUESTS" })).toEqual(FORBIDDEN);
});

test("a new account starts with nothing, and has never seen anything", async () => {
  const abuelo = await register("abuelo_pr");
  expect(await friends(abuelo)).toEqual({
    onlineWithinMs: ONLINE_MS,
    seen: [{ requests: 0, invites: 0, friends: 0 }],
    friends: [],
    incoming: [],
    outgoing: [],
    invites: [],
    sent: [],
  });
});

// Finding someone

test("search finds accounts by the start of their username, ignoring case, and never guests", async () => {
  const abuelo = await register("abuelo_pr");
  const abuela = await register("Abuela.PR");
  await register("papo");
  await guest("Abuelito");
  expect((await call("/friends/search", { token: abuelo.token, text: "ABU" })).body).toEqual({
    found: {
      accounts: [
        { player: abuela.player, username: "Abuela.PR" },
        { player: abuelo.player, username: "abuelo_pr" },
      ],
    },
  });
  expect((await call("/friends/search", { token: abuelo.token, text: "" })).body).toEqual({ found: { accounts: [] } });
  expect((await call("/friends/search", { token: abuelo.token, text: "zz" })).body).toEqual({ found: { accounts: [] } });
});

// Friend requests

test("principle: a request shows on both sides, and accepting makes friends on both sides", async () => {
  const abuelo = await register("abuelo_pr");
  const titi = await register("Titi");
  // The username is matched ignoring case.
  const sent = await ask(abuelo, "TITI");
  expect(sent.status).toBe(200);
  const { request } = sent.body;
  expect(sent.body).toEqual({ request, to: titi.player });
  expect((await friends(titi)).incoming).toEqual([{ request, from: abuelo.player, username: "abuelo_pr", sentAt: now }]);
  expect((await friends(abuelo)).outgoing).toEqual([{ request, to: titi.player, username: "Titi", sentAt: now }]);

  pass(60_000);
  expect(await call("/friends/accept", { token: titi.token, request })).toEqual({
    status: 200,
    body: { request, friend: abuelo.player },
  });
  const titiView = await friends(titi);
  expect(titiView.incoming).toEqual([]);
  expect(titiView.friends).toEqual([{ player: abuelo.player, username: "abuelo_pr", asker: abuelo.player, since: now, idleMs: 60_000 }]);
  const abueloView = await friends(abuelo);
  expect(abueloView.outgoing).toEqual([]);
  // Titi's page just checked in, so she shows as seen just now.
  expect(abueloView.friends).toEqual([{ player: titi.player, username: "Titi", asker: abuelo.player, since: now, idleMs: 0 }]);
});

test("rejecting a request removes it and makes no friends", async () => {
  const abuelo = await register("abuelo_pr");
  const papo = await register("papo");
  const { request } = (await ask(abuelo, "papo")).body;
  expect(await call("/friends/reject", { token: papo.token, request })).toEqual({ status: 200, body: { request } });
  expect((await friends(papo)).incoming).toEqual([]);
  expect((await friends(abuelo)).outgoing).toEqual([]);
  expect((await friends(abuelo)).friends).toEqual([]);
  // It cannot be answered again.
  expect(await call("/friends/accept", { token: papo.token, request })).toEqual(NOT_FOUND);
});

test("requests to yourself, twice, back, to a friend, or to nobody are refused", async () => {
  const abuelo = await register("abuelo_pr");
  const titi = await register("titi");
  expect(await ask(abuelo, "Abuelo_PR")).toEqual(BAD);
  expect(await ask(abuelo, "nadie")).toEqual(NOT_FOUND);
  const { request } = (await ask(abuelo, "titi")).body;
  expect(await ask(abuelo, "titi")).toEqual(CONFLICT);
  expect(await ask(titi, "abuelo_pr")).toEqual(CONFLICT);
  await call("/friends/accept", { token: titi.token, request });
  expect(await ask(abuelo, "titi")).toEqual(CONFLICT);
  expect(await ask(titi, "abuelo_pr")).toEqual(CONFLICT);
  expect((await friends(titi)).incoming).toEqual([]);
});

test("only the account a request was sent to can answer it", async () => {
  const abuelo = await register("abuelo_pr");
  const titi = await register("titi");
  const papo = await register("papo");
  const { request } = (await ask(abuelo, "titi")).body;
  expect(await call("/friends/accept", { token: papo.token, request })).toEqual(NOT_FOUND);
  expect(await call("/friends/reject", { token: abuelo.token, request })).toEqual(NOT_FOUND);
  expect(await call("/friends/accept", { token: titi.token, request: "made-up" })).toEqual(NOT_FOUND);
  expect((await friends(titi)).incoming).toHaveLength(1);
  expect((await friends(papo)).friends).toEqual([]);
});

test("a request runs out after a week: it stops showing, cannot be accepted, and is cleared away", async () => {
  const abuelo = await register("abuelo_pr");
  const titi = await register("titi");
  const { request } = (await ask(abuelo, "titi")).body;
  pass(REQUEST_LIFETIME_MS - 1000);
  expect((await friends(titi)).incoming).toHaveLength(1);
  // Not run out yet, so the server's clean-up refuses it.
  expect(await call("/friends/expire", { request })).toEqual(CONFLICT);
  pass(1000);
  expect((await friends(titi)).incoming).toEqual([]);
  expect((await friends(abuelo)).outgoing).toEqual([]);
  expect(await call("/friends/accept", { token: titi.token, request })).toEqual(NOT_FOUND);
  await expireOldRequests(gateway, new FriendingConcept(testDb.db, clock));
  expect(await testDb.db.collection("friending.requests").countDocuments()).toBe(0);
  expect(await call("/friends/expire", { request })).toEqual(NOT_FOUND);
  // Either of them can ask again.
  expect((await ask(titi, "abuelo_pr")).status).toBe(200);
});

test("a friend who has not been around for a while shows how long, and one signed out shows nothing", async () => {
  const abuelo = await register("abuelo_pr");
  const titi = await register("titi");
  await befriend(abuelo, titi, "titi");
  pass(ONLINE_MS + 1000);
  await friends(abuelo);
  expect((await friends(abuelo)).friends[0].idleMs).toBe(ONLINE_MS + 1000);
  await call("/sessions/end", { token: titi.token });
  expect((await friends(abuelo)).friends[0].idleMs).toBeNull();
});

// Seen

test("looking at requests, invites or friends is remembered for each apart", async () => {
  const abuelo = await register("abuelo_pr");
  pass(1000);
  expect(await call("/friends/seen", { token: abuelo.token, part: "REQUESTS" })).toEqual({ status: 200, body: { part: "REQUESTS" } });
  const requestsAt = now;
  pass(1000);
  await call("/friends/seen", { token: abuelo.token, part: "INVITES" });
  expect((await friends(abuelo)).seen).toEqual([{ requests: requestsAt, invites: now, friends: 0 }]);
  pass(1000);
  await call("/friends/seen", { token: abuelo.token, part: "FRIENDS" });
  expect((await friends(abuelo)).seen).toEqual([{ requests: requestsAt, invites: now - 1000, friends: now }]);
  for (const part of ["GAMES", "requests", 3, null]) {
    expect((await call("/friends/seen", { token: abuelo.token, part })).status).toBe(400);
  }
});

test("a request sent after the last look is newer than it; one before is not", async () => {
  const abuelo = await register("abuelo_pr");
  const titi = await register("titi");
  const papo = await register("papo");
  await ask(abuelo, "titi");
  pass(1000);
  await call("/friends/seen", { token: titi.token, part: "REQUESTS" });
  pass(1000);
  await ask(papo, "titi");
  const view = await friends(titi);
  const fresh = view.incoming.filter((row: { sentAt: number }) => row.sentAt > view.seen[0].requests);
  expect(fresh.map((row: { username: string }) => row.username)).toEqual(["papo"]);
});

// Invites

test("principle: the host invites a friend, who sees it and sits down by accepting it", async () => {
  const abuelo = await register("abuelo_pr");
  const titi = await register("titi");
  await befriend(abuelo, titi, "titi");
  const { table } = await openTable(abuelo);
  const sent = await invite(abuelo, titi);
  expect(sent.status).toBe(200);
  const { invite: id } = sent.body;
  expect((await friends(abuelo)).sent).toEqual([{ invite: id, to: titi.player, table }]);
  expect((await friends(titi)).invites).toEqual([
    { invite: id, from: abuelo.player, username: "abuelo_pr", table, rules: "LONG", sentAt: now, seats: [{ position: 0 }] },
  ]);

  expect(await call("/invites/accept", { token: titi.token, invite: id })).toEqual({ status: 200, body: { table, position: 1 } });
  expect((await friends(titi)).invites).toEqual([]);
  expect((await friends(abuelo)).sent).toEqual([]);
  const seats = (await lobby(titi)).seats;
  expect(seats.map((seat: { username: string | null }) => seat.username)).toEqual(["abuelo_pr", "titi"]);
});

test("the lobby and the game tell accounts from guests by their username", async () => {
  const abuelo = await register("abuelo_pr");
  const guests = [await guest("Papo"), await guest("Nando"), await guest("Cheo")];
  const { code } = await openTable(abuelo);
  for (const g of guests) await call("/tables/join", { token: g.token, code });
  expect((await lobby(abuelo)).seats.map((seat: { displayName: string; username: string | null }) => [seat.displayName, seat.username])).toEqual([
    ["abuelo_pr", "abuelo_pr"],
    ["Papo", null],
    ["Nando", null],
    ["Cheo", null],
  ]);
  await call("/games/start", { token: abuelo.token });
  const players = (await call("/games/view", { token: guests[0].token })).body.view.games[0].players;
  expect(players.map((p: { username: string | null; botName: string | null }) => [p.username, p.botName])).toEqual([
    ["abuelo_pr", null],
    [null, null],
    [null, null],
    [null, null],
  ]);
});

test("invites the host is not allowed to send are refused, each with its reason", async () => {
  const abuelo = await register("abuelo_pr");
  const titi = await register("titi");
  const papo = await register("papo");
  await befriend(abuelo, titi, "titi");
  await befriend(abuelo, papo, "papo");
  await befriend(titi, papo, "papo");

  // Not at a table at all.
  expect(await invite(abuelo, titi)).toEqual(NOT_FOUND);
  const { code } = await openTable(abuelo);
  // Not a friend (a stranger, or yourself).
  const stranger = await register("stranger");
  expect(await invite(abuelo, stranger)).toEqual(FORBIDDEN);
  expect(await invite(abuelo, abuelo)).toEqual(FORBIDDEN);
  // Twice.
  expect((await invite(abuelo, titi)).status).toBe(200);
  expect(await invite(abuelo, titi)).toEqual(CONFLICT);
  // Not the host.
  await call("/tables/join", { token: papo.token, code });
  expect(await invite(papo, titi)).toEqual(FORBIDDEN);
  // A friend already sitting here.
  expect(await invite(abuelo, papo)).toEqual(CONFLICT);
  expect((await friends(papo)).invites).toEqual([]);
});

test("joining by code uses up the invite to that table, but not invites to other tables", async () => {
  const abuelo = await register("abuelo_pr");
  const mami = await register("mami");
  const titi = await register("titi");
  await befriend(abuelo, titi, "titi");
  await befriend(mami, titi, "titi");
  const { code } = await openTable(abuelo);
  await openTable(mami);
  await invite(abuelo, titi);
  await invite(mami, titi);
  expect((await friends(titi)).invites).toHaveLength(2);
  await call("/tables/join", { token: titi.token, code });
  expect((await friends(titi)).invites.map((row: { username: string }) => row.username)).toEqual(["mami"]);
  // Already at a table, so the other invite cannot be used until she leaves.
  const [other] = (await friends(titi)).invites;
  expect(await call("/invites/accept", { token: titi.token, invite: other.invite })).toEqual(CONFLICT);
  expect((await friends(titi)).invites).toHaveLength(1);
});

test("a full table refuses the invite, which stays in case a seat frees up", async () => {
  const abuelo = await register("abuelo_pr");
  const titi = await register("titi");
  await befriend(abuelo, titi, "titi");
  const { code } = await openTable(abuelo);
  const { invite: id } = (await invite(abuelo, titi)).body;
  const guests = [await guest("Papo"), await guest("Nando"), await guest("Cheo")];
  for (const g of guests) await call("/tables/join", { token: g.token, code });
  expect(await call("/invites/accept", { token: titi.token, invite: id })).toEqual(CONFLICT);
  expect((await friends(titi)).invites).toHaveLength(1);
  expect((await friends(titi)).invites[0].seats).toHaveLength(4);
  await call("/tables/leave", { token: guests[2].token, table: (await lobby(abuelo)).table });
  expect((await call("/invites/accept", { token: titi.token, invite: id })).status).toBe(200);
});

test("starting the game withdraws every invite to the table, and no more can be sent", async () => {
  const abuelo = await register("abuelo_pr");
  const titi = await register("titi");
  const papo = await register("papo");
  await befriend(abuelo, titi, "titi");
  await befriend(abuelo, papo, "papo");
  const { code } = await openTable(abuelo);
  await invite(abuelo, titi);
  for (const g of [await guest("Nando"), await guest("Cheo"), await guest("Lalo")]) await call("/tables/join", { token: g.token, code });
  expect((await call("/games/start", { token: abuelo.token })).status).toBe(200);
  expect((await friends(titi)).invites).toEqual([]);
  expect((await friends(abuelo)).sent).toEqual([]);
  expect(await invite(abuelo, papo)).toEqual(CONFLICT);
});

test("closing the table withdraws its invites, and an invite can be declined", async () => {
  const abuelo = await register("abuelo_pr");
  const titi = await register("titi");
  const papo = await register("papo");
  await befriend(abuelo, titi, "titi");
  await befriend(abuelo, papo, "papo");
  const { table } = await openTable(abuelo);
  const { invite: titiInvite } = (await invite(abuelo, titi)).body;
  await invite(abuelo, papo);
  // Only Titi can decline hers.
  expect(await call("/invites/decline", { token: papo.token, invite: titiInvite })).toEqual(NOT_FOUND);
  expect(await call("/invites/decline", { token: titi.token, invite: titiInvite })).toEqual({ status: 200, body: { invite: titiInvite } });
  expect((await friends(titi)).invites).toEqual([]);
  expect(await call("/invites/accept", { token: titi.token, invite: titiInvite })).toEqual(NOT_FOUND);
  // Declined, she can be invited again.
  expect((await invite(abuelo, titi)).status).toBe(200);
  await call("/tables/close", { token: abuelo.token, table });
  expect((await friends(titi)).invites).toEqual([]);
  expect((await friends(papo)).invites).toEqual([]);
});

test("someone waiting for strangers must leave the queue before accepting an invite", async () => {
  const abuelo = await register("abuelo_pr");
  const titi = await register("titi");
  await befriend(abuelo, titi, "titi");
  await openTable(abuelo);
  const { invite: id } = (await invite(abuelo, titi)).body;
  await call("/matchmaking/enqueue", { token: titi.token, rules: "DEFAULT", midway: false });
  expect(await call("/invites/accept", { token: titi.token, invite: id })).toEqual(CONFLICT);
  await call("/matchmaking/leave", { token: titi.token });
  expect((await call("/invites/accept", { token: titi.token, invite: id })).status).toBe(200);
});

test("tables Matchmaking seated strangers at cannot have invites", async () => {
  const players = [await register("abuelo_pr"), await register("titi"), await register("papo"), await register("nando")];
  const friend = await register("mami");
  await befriend(players[0], friend, "mami");
  for (const p of players) await call("/matchmaking/enqueue", { token: p.token, rules: "DEFAULT", midway: false });
  const lobbyId = (await call("/matchmaking/view", { token: players[0].token })).body.queue.lobbies[0].lobby;
  await call("/matchmaking/launch", { lobby: lobbyId });
  const at = await lobby(players[0]);
  const host = players.find((p) => p.player === at.host)!;
  // The host of a public table is told it is public; the game there has started anyway.
  expect((await invite(host, friend)).status).toBe(403);
});

// Deleted accounts

test("a deleted account leaves no friendship, request or invite behind", async () => {
  const abuelo = await register("abuelo_pr");
  const titi = await register("titi");
  const papo = await register("papo");
  await befriend(abuelo, titi, "titi");
  await befriend(papo, titi, "titi");
  await ask(abuelo, "papo");
  await openTable(titi);
  await invite(titi, abuelo);
  await call("/friends/seen", { token: abuelo.token, part: "FRIENDS" });
  expect((await call("/accounts/delete", { token: abuelo.token, password: PASSWORD })).status).toBe(200);
  const titiView = await friends(titi);
  expect(titiView.friends.map((row: { username: string }) => row.username)).toEqual(["papo"]);
  expect(titiView.sent).toEqual([]);
  expect((await friends(papo)).incoming).toEqual([]);
  expect(await testDb.db.collection("seeing.looks").countDocuments({ user: abuelo.player })).toBe(0);
});
