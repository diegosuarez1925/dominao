// What this tab knows about its guest, their table and their game, and every action the
// page can take. Components read the state and call the actions; only this file talks to
// the backend, and only this file turns the backend's answers into words for the guest.
import { reactive } from "vue";
import { client, type Game, type QueueLobby, type RuleSet, type Side, type Table } from "./api.ts";

// sessionStorage is per tab, so four tabs can be four different players.
const TOKEN_KEY = "dominao.token";
const REFRESH_MS = 2000;

/** The characters table codes are made of (no 0/O or 1/I, which are easy to confuse). */
export const CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;
export const NAME_MAX = 20;

export const state = reactive({
  /** True until the first check of a saved token is done, so nothing flashes. */
  loading: true,
  me: null as { session: string; token: string; displayName: string } | null,
  table: null as Table | null,
  game: null as Game | null,
  /** The matchmaking lobby the guest waits in, if any. */
  queue: null as QueueLobby | null,
  /**
   * True for a moment after a full lobby launches, until the new table shows up, so
   * the page says the game is starting instead of flashing back to the home screen.
   */
  starting: false,
  /** The rule sets a table or a matchmaking lobby can play by, as the server lists them. */
  rulesets: [] as RuleSet[],
  /** A finished game the guest has closed, so the table's lobby shows instead. */
  dismissedGame: "",
  /** True while an action the guest asked for is on its way, so buttons can wait. */
  busy: false,
  /** False when the server cannot be reached; the page keeps trying. */
  online: true,
  /** A message for the guest, such as why a move was refused. */
  message: "",
});

/** The last game answer as text; the game is replaced only when it changed. */
let lastGame = "";
/**
 * Where the guest was playing at the last refresh, if a game was going on, so that if
 * they are suddenly at no table the page can say why. Leaving on purpose clears it.
 */
let playingAt: { code: string; public: boolean } | null = null;
/** When the server last answered a refresh, to tell "you were away" from "the table closed". */
let lastAnswerAt = Date.now();
const AWAY_GAP_MS = 20_000;
/** When a launched lobby gives up waiting for its table to appear. */
let startingUntil = 0;
const STARTING_WAIT_MS = 8000;

export function say(message: string) {
  state.message = message;
}

/** A rule set's name for people: "LONG" reads "Long". */
export function rulesName(rules: string) {
  return rules.charAt(0) + rules.slice(1).toLowerCase();
}

/** What a rule set changes, as the server describes it. */
export function rulesDescription(rules: string) {
  return state.rulesets.find((row) => row.rules === rules)?.description ?? "";
}

type Success<R> = Exclude<R, { error: unknown }>;
/** Answers the client gives when the request never got a proper answer from the server. */
const UNREACHABLE = new Set(["NETWORK_ERROR", "BAD_STATUS", "BAD_JSON"]);

/**
 * Sends one request. Answers the result, or undefined after telling the guest what
 * went wrong in words that say what to do next: `reasons` maps the server's error
 * categories to those words. An expired session sends the guest back to pick a name.
 */
async function send<R extends object>(request: () => Promise<R>, reasons: Record<string, string> = {}) {
  let result: R;
  try {
    result = await request();
  } catch {
    result = { error: "NETWORK_ERROR" } as R;
  }
  if (!("error" in result)) {
    state.online = true;
    return result as Success<R>;
  }
  const error = String(result.error);
  if (UNREACHABLE.has(error)) {
    state.online = false;
    say("We can't reach the server right now. Check your connection; the page keeps trying.");
    return undefined;
  }
  state.online = true;
  if (error === "UNAUTHORIZED") {
    forget("Your guest session ended. Pick a name to keep playing.");
    return undefined;
  }
  say(reasons[error] ?? "Something went wrong on our side. Please try again.");
  return undefined;
}

/** Runs an action the guest asked for, one at a time, then reloads what changed. */
async function act(action: () => Promise<unknown>) {
  if (state.busy || state.me === null) return;
  state.busy = true;
  try {
    await action();
    await refresh();
  } finally {
    state.busy = false;
  }
}

function forget(message: string) {
  sessionStorage.removeItem(TOKEN_KEY);
  state.me = null;
  state.dismissedGame = "";
  say(message);
  void refresh();
}

export async function resume() {
  const token = sessionStorage.getItem(TOKEN_KEY);
  state.me = null;
  if (state.rulesets.length === 0) {
    const listed = await send(() => client.games.rulesets({}));
    if (listed !== undefined) state.rulesets = listed.view.rulesets;
  }
  if (token !== null) {
    const result = await send(() => client.guests.me({ token }));
    if (result !== undefined) state.me = { session: result.session, token, displayName: result.displayName };
  }
  state.loading = false;
  await refresh();
}

/** Reloads the table, the queue and the game; other players act in their own tabs. */
export async function refresh() {
  const me = state.me;
  if (me === null) {
    state.table = null;
    state.game = null;
    state.queue = null;
    state.starting = false;
    return;
  }
  const lobby = await send(() => client.tables.lobby({ token: me.token }));
  if (lobby === undefined) return;
  state.table = lobby.lobby.tables[0] ?? null;
  const gap = Date.now() - lastAnswerAt;
  lastAnswerAt = Date.now();
  if (state.table === null && playingAt !== null) {
    // Taken out of a game without asking: their page was closed or offline too long
    // (so the others were not kept waiting), or the host closed the table.
    if (gap < AWAY_GAP_MS) say("The host closed the table, so the game ended.");
    else if (playingAt.public) {
      say("You were away too long, so your seat went to someone else. Find a game with \"join games in progress\" on to jump back in.");
    } else {
      say(`You were away too long, so your seat was opened for someone else. If it's still open, join with code ${playingAt.code} to take it back.`);
    }
    playingAt = null;
  }
  const queue = await send(() => client.matchmaking.view({ token: me.token }));
  if (queue === undefined) return;
  const next = queue.queue.lobbies[0] ?? null;
  // A full lobby that vanished was launched; its table is on the way.
  if (state.queue?.full && next === null) startingUntil = Date.now() + STARTING_WAIT_MS;
  state.queue = next;
  state.starting = state.table === null && state.queue === null && Date.now() < startingUntil;
  const view = await send(() => client.games.view({ token: me.token }));
  if (view === undefined) return;
  const game = view.view.games[0] ?? null;
  const running = game !== null && (game.status === "ACTIVE" || game.status === "PAUSED");
  playingAt = running && state.table ? { code: state.table.code, public: game.publicRules !== null } : null;
  const text = JSON.stringify(game);
  if (text !== lastGame) {
    lastGame = text;
    state.game = game;
  }
  // Back online: a "can't reach the server" message no longer applies.
  if (!state.online || state.message.startsWith("We can't reach")) {
    state.online = true;
    if (state.message.startsWith("We can't reach")) say("");
  }
}

export async function startSession(displayName: string) {
  const name = displayName.trim();
  if (name.length === 0 || name.length > NAME_MAX) return say(`Pick a name of 1 to ${NAME_MAX} characters.`);
  const result = await send(() => client.guests.start({ displayName: name }), {
    INVALID_REQUEST: `Pick a name of 1 to ${NAME_MAX} characters.`,
  });
  if (result === undefined) return;
  sessionStorage.setItem(TOKEN_KEY, result.token);
  say("");
  await resume();
}

export async function endSession() {
  playingAt = null;
  // Ending the session also gets the guest up from their table and out of the queue,
  // on the server.
  const me = state.me;
  if (me !== null) await send(() => client.guests.leave({ token: me.token }));
  sessionStorage.removeItem(TOKEN_KEY);
  state.dismissedGame = "";
  say("");
  await resume();
}

export async function openTable(rules: string) {
  await act(async () => {
    const result = await send(() => client.tables.open({ token: state.me!.token, rules }), {
      CONFLICT: "You're waiting for strangers. Leave the queue before opening a table.",
      INVALID_REQUEST: "Those rules aren't available. Pick another set of rules.",
    });
    if (result !== undefined) say("");
  });
}

export async function joinTable(code: string) {
  const clean = code.trim().toUpperCase();
  if (!CODE_PATTERN.test(clean)) {
    return say("A table code is 6 letters and numbers, like K7QF2M. Check it and try again.");
  }
  await act(async () => {
    const result = await send(() => client.tables.join({ token: state.me!.token, code: clean }), {
      NOT_FOUND: `No table has the code ${clean}. Check it with whoever shared it, or open your own table.`,
      CONFLICT: "That table is full (or you're still waiting for strangers). Try another table, or open your own.",
      FORBIDDEN: "That table was made for strangers by matchmaking, so it can't be joined by code. Find a game with \"join games in progress\" on instead.",
    });
    if (result !== undefined) say("");
  });
}

export async function leaveTable() {
  const table = state.table;
  if (table === null) return;
  playingAt = null;
  await act(async () => {
    const result = await send(() => client.tables.leave({ token: state.me!.token, table: table.table }), {
      NOT_FOUND: "You had already left that table.",
    });
    if (result !== undefined) say("");
  });
}

/** The host swaps two seats (either may be empty) to choose who partners whom. */
export async function swapSeats(first: number, second: number) {
  await act(async () => {
    const result = await send(() => client.tables.swap({ token: state.me!.token, first, second }), {
      CONFLICT: "Seats can't change once the game has started.",
      FORBIDDEN: "Only the host can move people between seats.",
      NOT_FOUND: "You're no longer at this table.",
    });
    if (result !== undefined) say("");
  });
}

export async function closeTable() {
  const table = state.table;
  if (table === null) return;
  playingAt = null;
  await act(async () => {
    const result = await send(() => client.tables.close({ token: state.me!.token, table: table.table }), {
      FORBIDDEN: "Only the host can close the table. You can leave it instead.",
      NOT_FOUND: "That table was already closed.",
    });
    if (result !== undefined) say("");
  });
}

/**
 * Waits for three strangers who picked the same rules. With `midway`, the guest may
 * instead be sent straight to an empty seat in a game of strangers already going on.
 */
export async function findGame(rules: string, midway: boolean) {
  await act(async () => {
    const result = await send(() => client.matchmaking.enqueue({ token: state.me!.token, rules, midway }), {
      CONFLICT: "You're already at a table or in the queue. Leave it before looking for a new game.",
      INVALID_REQUEST: "Those rules aren't available. Pick another set of rules.",
    });
    if (result !== undefined) say("");
  });
}

export async function leaveQueue() {
  await act(async () => {
    const result = await send(() => client.matchmaking.leave({ token: state.me!.token }), {
      NOT_FOUND: "You had already left the queue.",
    });
    if (result !== undefined) say("");
  });
}

export async function startGame() {
  await act(async () => {
    const result = await send(() => client.games.start({ token: state.me!.token }), {
      CONFLICT: "The game can start once all four seats are taken.",
      FORBIDDEN: "Only the host can start the game.",
      NOT_FOUND: "You're no longer at this table.",
    });
    if (result !== undefined) {
      state.dismissedGame = "";
      say("");
    }
  });
}

export async function play(tile: string, side: Side) {
  const game = state.game;
  if (game === null) return;
  await act(async () => {
    const result = await send(() => client.games.play({ token: state.me!.token, game: game.game, tile, side }), {
      CONFLICT: "It's no longer your turn, the game is paused, or it's over.",
      INVALID_REQUEST: "That tile doesn't fit on that end. Pick a highlighted tile.",
      NOT_FOUND: "That game is no longer being played.",
    });
    if (result !== undefined) say("");
  });
}

/** Leaves a finished or stopped game's screen and goes back to the table's lobby. */
export function dismissGame(game: string) {
  state.dismissedGame = game;
  say("");
}

setInterval(() => {
  if (state.me !== null) refresh();
}, REFRESH_MS);
