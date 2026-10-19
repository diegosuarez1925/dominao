// What this tab knows about its guest, their table and their game, and every action the
// page can take. Components read the state and call the actions; only this file talks to
// the backend.
import { reactive } from "vue";
import { client, type Game, type Side, type Table } from "./api.ts";

// sessionStorage is per tab, so four tabs can be four different players.
const TOKEN_KEY = "dominao.token";
const REFRESH_MS = 2000;

export const state = reactive({
  /** True until the first check of a saved token is done, so nothing flashes. */
  loading: true,
  me: null as { session: string; token: string; displayName: string } | null,
  table: null as Table | null,
  game: null as Game | null,
  /** A message for the guest, such as why a move was refused. */
  message: "",
});

/** The last game answer as text; the game is replaced only when it changed. */
let lastGame = "";

function say(message: string) {
  state.message = message;
}

export async function resume() {
  const token = sessionStorage.getItem(TOKEN_KEY);
  state.me = null;
  if (token !== null) {
    const result = await client.guests.me({ token });
    if ("error" in result) {
      sessionStorage.removeItem(TOKEN_KEY);
      say("Your guest session expired. Pick a name to play again.");
    } else {
      state.me = { session: result.session, token, displayName: result.displayName };
    }
  }
  state.loading = false;
  await refresh();
}

/** Reloads the table and the game; other players act in their own tabs. */
export async function refresh() {
  const me = state.me;
  if (me === null) {
    state.table = null;
    state.game = null;
    return;
  }
  const lobby = await client.tables.lobby({ token: me.token });
  if (!("error" in lobby)) state.table = lobby.lobby.tables[0] ?? null;
  const view = await client.games.view({ token: me.token });
  if (!("error" in view)) {
    const game = view.view.games[0] ?? null;
    const text = JSON.stringify(game);
    if (text !== lastGame) {
      lastGame = text;
      state.game = game;
    }
  }
}

export async function startSession(displayName: string) {
  const result = await client.guests.start({ displayName });
  if ("error" in result) return say("A name must be 1 to 20 characters long.");
  sessionStorage.setItem(TOKEN_KEY, result.token);
  say("");
  await resume();
}

export async function endSession() {
  // Ending the session also gets the guest up from their table, on the server.
  if (state.me !== null) await client.guests.leave({ token: state.me.token });
  sessionStorage.removeItem(TOKEN_KEY);
  say("");
  await resume();
}

export async function openTable() {
  if (state.me === null) return;
  const result = await client.tables.open({ token: state.me.token });
  say("error" in result ? `Could not open a table: ${result.error}` : "");
  await refresh();
}

export async function joinTable(code: string) {
  if (state.me === null) return;
  const result = await client.tables.join({ token: state.me.token, code: code.trim().toUpperCase() });
  const reasons: Record<string, string> = { NOT_FOUND: "No table has that code.", CONFLICT: "That table is full." };
  say("error" in result ? (reasons[result.error] ?? `Could not join: ${result.error}`) : "");
  await refresh();
}

export async function leaveTable() {
  if (state.me === null || state.table === null) return;
  await client.tables.leave({ token: state.me.token, table: state.table.table });
  say("");
  await refresh();
}

export async function closeTable() {
  if (state.me === null || state.table === null) return;
  await client.tables.close({ token: state.me.token, table: state.table.table });
  say("");
  await refresh();
}

export async function startGame() {
  if (state.me === null) return;
  const result = await client.games.start({ token: state.me.token });
  say("error" in result ? `Could not start the game (${result.error}).` : "");
  await refresh();
}

export async function play(tile: string, side: Side) {
  if (state.me === null || state.game === null) return;
  const result = await client.games.play({ token: state.me.token, game: state.game.game, tile, side });
  say("error" in result ? `That move was not allowed (${result.error}).` : "");
  await refresh();
}

setInterval(() => {
  if (state.me !== null) refresh();
}, REFRESH_MS);
