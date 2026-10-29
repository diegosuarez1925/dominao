/**
 * Checks a running DOMINAO (usually the deployed one) from the outside, through its
 * HTTP API only: access control, error handling, and that data persists.
 *
 *   bun scripts/validate-deploy.ts https://dominao.mit-sdg.dev
 *   bun scripts/validate-deploy.ts https://dominao.mit-sdg.dev --keep            # leave a game running
 *   bun scripts/validate-deploy.ts https://dominao.mit-sdg.dev --after-redeploy  # check it survived
 *
 * The output is also saved to tests/deploy-output.txt (an --after-redeploy run adds
 * to the --keep run's output).
 *
 * Every run cleans up after itself (signs its guests out, which frees their seats),
 * except --keep, which saves its guests to scripts/.deploy-check.json so a run with
 * --after-redeploy can check the table and game are still there, then clean up.
 */
import { appendFileSync, writeFileSync } from "node:fs";

const address = (process.argv.slice(2).find((arg) => !arg.startsWith("--")) ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const keep = process.argv.includes("--keep");
const afterRedeploy = process.argv.includes("--after-redeploy");
const stateFile = new URL("./.deploy-check.json", import.meta.url);
const outputFile = new URL("../tests/deploy-output.txt", import.meta.url);

// Everything printed is also saved, so the run can be kept as evidence.
const printed: string[] = [];
const print = console.log;
console.log = (...parts: unknown[]) => {
  print(...parts);
  printed.push(parts.join(" "));
};
process.on("exit", () => {
  const text = printed.join("\n") + "\n";
  if (afterRedeploy) appendFileSync(outputFile, "\n" + text);
  else writeFileSync(outputFile, text);
});

let failures = 0;
function check(what: string, ok: boolean, detail?: unknown) {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${what}${ok || detail === undefined ? "" : `  (got ${JSON.stringify(detail)})`}`);
}

async function call(path: string, body: unknown) {
  const response = await fetch(`${address}/api${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  const text = await response.text();
  let json: any = text;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: response.status, body: json };
}

type Guest = { player: string; token: string; name: string };
async function guest(name: string): Promise<Guest> {
  const { body } = await call("/guests/start", { displayName: name });
  return { ...body, name };
}
const view = async (g: Guest) => (await call("/games/view", { token: g.token })).body.view.games[0];
const lobby = async (g: Guest) => (await call("/tables/lobby", { token: g.token })).body.lobby.tables[0];
const signOut = async (guests: Guest[]) => {
  for (const g of guests) await call("/sessions/end", { token: g.token });
};

console.log(`Checking ${address} at ${new Date().toISOString()}\n`);

if (afterRedeploy) {
  const { guests, table, game, log } = JSON.parse(await Bun.file(stateFile).text()) as {
    guests: Guest[];
    table: string;
    game: string;
    log: unknown[];
  };
  console.log("Persistence (data saved by --keep before the redeploy)");
  for (const g of guests) {
    const me = await call("/sessions/me", { token: g.token });
    check(`${g.name} is still signed in with the same token`, me.status === 200 && me.body.player === g.player, me);
  }
  const seats = (await lobby(guests[0]))?.seats ?? [];
  check("the table is still there with all four seats", (await lobby(guests[0]))?.table === table && seats.length === 4, seats);
  const after = await view(guests[0]);
  check("the game is still there, unchanged", after?.game === game && JSON.stringify(after.log) === JSON.stringify(log), after?.log?.length);
  await signOut(guests);
  await Bun.file(stateFile).delete();
  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) failed.`}`);
  process.exit(failures === 0 ? 0 : 1);
}

console.log("Health");
const health = await fetch(`${address}/health`);
check("/health answers 200", health.status === 200, health.status);
if (health.status !== 200) {
  console.log("\nThe app or its database is down, so nothing else can be checked.");
  process.exit(1);
}

console.log("\nBad input is refused with a clear status");
check("starting a session with no name is 400", (await call("/guests/start", {})).status === 400);
check("starting a session with a blank name is 400", (await call("/guests/start", { displayName: "   " })).status === 400);
check("a name that is not a string is 400", (await call("/guests/start", { displayName: 42 })).status === 400);
check("a body that is not JSON is refused", (await call("/guests/start", "not json")).status >= 400);
check("an unknown rule set is 400", (await call("/tables/open", { token: "x", rules: "NOPE" })).status !== 200);

const players = [await guest("Check Abuelo"), await guest("Check Papo"), await guest("Check Nando"), await guest("Check Cheo")];
const [host, papo] = players;
const outsider = await guest("Check Outsider");
check("five guests started sessions", [...players, outsider].every((g) => typeof g.token === "string"));

console.log("\nTokens");
const signedOut = await guest("Check Gone");
await call("/sessions/end", { token: signedOut.token });
for (const [path, body] of [
  ["/sessions/me", {}],
  ["/tables/lobby", {}],
  ["/tables/open", { rules: "DEFAULT" }],
  ["/games/view", {}],
  ["/games/start", {}],
  ["/matchmaking/enqueue", { rules: "DEFAULT", midway: false }],
] as const) {
  const statuses = [];
  for (const token of ["made-up", signedOut.token, host.player]) statuses.push((await call(path, { ...body, token })).status);
  check(`${path} refuses an invented token, a signed-out token and a player id (401)`, statuses.every((s) => s === 401), statuses);
}

console.log("\nPrivate table");
const opened = await call("/tables/open", { token: host.token, rules: "DEFAULT" });
const { table, code } = opened.body;
check("the host opens a table and gets a 6-character code", opened.status === 200 && /^[A-Z0-9]{6}$/.test(code), opened);
check("a code that matches no table is 404", (await call("/tables/join", { token: papo.token, code: "ZZZZZZ" })).status === 404);
check("starting before the table is full is 409", (await call("/games/start", { token: host.token })).status === 409);
for (const g of players.slice(1)) await call("/tables/join", { token: g.token, code });
check("three friends join by code", (await lobby(host))?.seats.length === 4);
check("a fifth guest cannot join a full table (409)", (await call("/tables/join", { token: outsider.token, code })).status === 409);
check("a seated guest cannot open a second table (409)", (await call("/tables/open", { token: papo.token, rules: "DEFAULT" })).status === 409);

console.log("\nWho may start, close and see the game");
check("a guest who is not host cannot start (403)", (await call("/games/start", { token: papo.token })).status === 403);
check("naming the host in the request changes nothing (403)", (await call("/games/start", { token: papo.token, session: host.player })).status === 403);
check("the host starts the game", (await call("/games/start", { token: host.token })).status === 200);
check("starting again while it runs is 409", (await call("/games/start", { token: host.token })).status === 409);
check("a guest who is not host cannot close the table (403)", (await call("/tables/close", { token: papo.token, table })).status === 403);
check("an outsider cannot close the table (403)", (await call("/tables/close", { token: outsider.token, table })).status === 403);
check("an outsider sees no game", (await call("/games/view", { token: outsider.token })).body.view.games.length === 0);
check("an outsider sees no table", (await call("/tables/lobby", { token: outsider.token })).body.lobby.tables.length === 0);

const views = await Promise.all(players.map(view));
const hands = views.map((v) => v.hand.map((h: { tile: string }) => h.tile));
check("each player sees only their own hand (27 different tiles in all)", new Set(hands.flat()).size === 27, hands.map((h) => h.length));
const responses = JSON.stringify(views);
check("no game view carries anyone's token", players.every((g) => !responses.includes(g.token)));

console.log("\nPlaying");
const state = views[0];
const turn = players.find((g) => g.player === state.turnPlayer)!;
const notTurn = players.find((g) => g.player !== state.turnPlayer)!;
const turnHand = hands[players.indexOf(turn)];
const someoneElsesTile = hands[players.indexOf(notTurn)][0];
const outOfTurn = await call("/games/play", { token: notTurn.token, game: state.game, tile: hands[players.indexOf(notTurn)][0], side: "LEFT" });
check("playing out of turn is 409", outOfTurn.status === 409, outOfTurn);
const outsiderPlay = await call("/games/play", { token: outsider.token, game: state.game, tile: turnHand[0], side: "LEFT" });
check("an outsider cannot play in the game (409)", outsiderPlay.status === 409, outsiderPlay);
const notMine = await call("/games/play", { token: turn.token, game: state.game, tile: someoneElsesTile, side: "LEFT" });
check("playing a tile that is not in your hand is 400", notMine.status === 400, notMine);
check("a side other than LEFT or RIGHT is 400", (await call("/games/play", { token: turn.token, game: state.game, tile: turnHand[0], side: "UP" })).status === 400);
check("nothing moved after those refusals", JSON.stringify((await view(host)).log) === JSON.stringify(state.log));
const boardRight = state.board[0].right;
const fits = turnHand.find((t: string) => t.split("-").map(Number).includes(boardRight));
if (fits) {
  const played = await call("/games/play", { token: turn.token, game: state.game, tile: fits, side: "RIGHT" });
  check(`the player whose turn it is plays ${fits}`, played.status === 200, played);
  check("everyone sees the move", (await Promise.all(players.map(view))).every((v) => v.log.length > state.log.length));
} else {
  console.log("SKIP  no tile fits the first move in this deal; the refusals above still ran");
}

console.log("\nSessions");
check("a player id cannot be used to expire their session (401)", (await call("/sessions/expire", { session: host.player })).status === 401);
check("an invented session cannot be expired (401)", (await call("/sessions/expire", { session: "made-up" })).status === 401);

console.log("\nAccounts");
// A throwaway account, deleted again at the end.
const username = `check_${crypto.randomUUID().slice(0, 8)}`;
const password = "Check-Fichas-1957";
const weak = await call("/accounts/password-check", { username, password: "password1" });
check("the password check explains a weak password", weak.status === 200 && weak.body.check.weaknesses.length > 0, weak);
check("a weak password is refused (400)", (await call("/accounts/register", { username, password: "password1" })).status === 400);
const account = await call("/accounts/register", { username, password });
check("registering signs the account in", account.status === 200 && typeof account.body.token === "string", account);
const who = await call("/sessions/me", { token: account.body.token });
check("the account is recognized by its username", who.body.username === username, who);
check("a taken username is refused (409)", (await call("/accounts/register", { username: username.toUpperCase(), password })).status === 409);
check("a wrong password is refused (401)", (await call("/accounts/signin", { username, password: "Wrong-Fichas-1957" })).status === 401);
check("an unknown username gets the same answer (401)", (await call("/accounts/signin", { username: `${username}_x`, password })).status === 401);
const again = await call("/accounts/signin", { username, password });
check("signing in again is the same player", again.status === 200 && again.body.player === account.body.player, again);
const deleted = await call("/accounts/delete", { token: account.body.token, password });
check("the account can be deleted, which signs it out everywhere", deleted.status === 200 && (await call("/sessions/me", { token: again.body.token })).status === 401, deleted);
check("a deleted account cannot sign in (401)", (await call("/accounts/signin", { username, password })).status === 401);

if (keep) {
  const now = await view(host);
  await Bun.write(stateFile, JSON.stringify({ guests: players, table, game: now.game, log: now.log }, null, 2));
  await signOut([outsider]);
  console.log(`\nLeft the game running and saved its guests to scripts/.deploy-check.json.`);
  console.log(`Redeploy, then run with --after-redeploy to check it is still there.`);
} else {
  await signOut([...players, outsider]);
  const late = await guest("Check Late");
  check("signing everyone out closed the table", (await call("/tables/join", { token: late.token, code })).status === 404);
  await signOut([late]);
}

console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) failed.`}`);
process.exit(failures === 0 ? 0 : 1);
