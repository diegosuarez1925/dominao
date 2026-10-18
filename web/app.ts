// A temporary page for trying guest sessions and tables. The Vue frontend replaces it later.
import { createHttpClient } from "@mit-sdg/sync-engine-http/client";
import type { DominaoWireHttp } from "../generated/wire.ts";

const client = createHttpClient<DominaoWireHttp>({ baseUrl: "/api" });

// sessionStorage is per tab, so four tabs can be four different players.
const TOKEN_KEY = "dominao.token";
const LOBBY_REFRESH_MS = 2000;

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const startForm = $<HTMLFormElement>("#start");
const welcome = $("#welcome");
const greeting = $("#greeting");
const home = $("#home");
const lobby = $("#lobby");
const joinForm = $<HTMLFormElement>("#join");
const codeLabel = $("#code");
const seatList = $<HTMLOListElement>("#seats");
const closeButton = $<HTMLButtonElement>("#closeTable");
const status = $<HTMLParagraphElement>("#status");

let me: { session: string; token: string } | null = null;
let currentTable: string | null = null;

function say(message: string) {
  status.textContent = message;
}

async function resume() {
  const token = sessionStorage.getItem(TOKEN_KEY);
  me = null;
  if (token !== null) {
    const result = await client.guests.me({ token });
    if ("error" in result) {
      sessionStorage.removeItem(TOKEN_KEY);
      say("Your guest session expired. Pick a name to play again.");
    } else {
      me = { session: result.session, token };
      greeting.textContent = `¡Hola, ${result.displayName}!`;
    }
  }
  startForm.hidden = me !== null;
  welcome.hidden = me === null;
  if (me !== null) await refreshLobby();
}

async function refreshLobby() {
  if (me === null) return;
  const result = await client.tables.lobby({ token: me.token });
  if ("error" in result) return say(`Could not load the table: ${result.error}`);
  const table = result.lobby.tables[0];
  currentTable = table?.table ?? null;
  home.hidden = table !== undefined;
  lobby.hidden = table === undefined;
  if (table === undefined) return;
  codeLabel.textContent = table.code;
  closeButton.hidden = table.host !== me.session;
  seatList.replaceChildren(
    ...[0, 1, 2, 3].map((position) => {
      const seat = table.seats.find((s) => s.position === position);
      const item = document.createElement("li");
      item.textContent = seat === undefined ? "(empty)" : seat.displayName;
      if (seat?.player === table.host) item.textContent += " (host)";
      if (seat?.player === me!.session) item.textContent += " (you)";
      return item;
    }),
  );
}

startForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const displayName = String(new FormData(startForm).get("displayName"));
  const result = await client.guests.start({ displayName });
  if ("error" in result) return say("A name must be 1 to 20 characters long.");
  sessionStorage.setItem(TOKEN_KEY, result.token);
  say("");
  await resume();
});

$("#leave").addEventListener("click", async () => {
  // Ending the session also gets the guest up from their table, on the server.
  if (me !== null) await client.guests.leave({ token: me.token });
  sessionStorage.removeItem(TOKEN_KEY);
  await resume();
});

$("#open").addEventListener("click", async () => {
  if (me === null) return;
  const result = await client.tables.open({ token: me.token });
  say("error" in result ? `Could not open a table: ${result.error}` : "");
  await refreshLobby();
});

joinForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (me === null) return;
  const code = String(new FormData(joinForm).get("code")).trim().toUpperCase();
  const result = await client.tables.join({ token: me.token, code });
  const reasons: Record<string, string> = { NOT_FOUND: "No table has that code.", CONFLICT: "That table is full." };
  say("error" in result ? (reasons[result.error] ?? `Could not join: ${result.error}`) : "");
  await refreshLobby();
});

$("#leaveTable").addEventListener("click", async () => {
  if (me === null || currentTable === null) return;
  await client.tables.leave({ token: me.token, table: currentTable });
  await refreshLobby();
});

closeButton.addEventListener("click", async () => {
  if (me === null || currentTable === null) return;
  await client.tables.close({ token: me.token, table: currentTable });
  await refreshLobby();
});

// Other players join and leave in their own tabs, so keep checking the lobby.
setInterval(refreshLobby, LOBBY_REFRESH_MS);
resume();
