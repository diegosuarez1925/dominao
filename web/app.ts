// A temporary page for trying guest sessions, tables and games. The Vue frontend replaces it later.
import { createHttpClient } from "@mit-sdg/sync-engine-http/client";
import type { DominaoWireHttp } from "../generated/wire.ts";

const client = createHttpClient<DominaoWireHttp>({ baseUrl: "/api" });

// sessionStorage is per tab, so four tabs can be four different players.
const TOKEN_KEY = "dominao.token";
const REFRESH_MS = 2000;

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
const startButton = $<HTMLButtonElement>("#startGame");
const gameSection = $("#game");
const chooseSide = $("#chooseSide");
const status = $<HTMLParagraphElement>("#status");

let me: { session: string; token: string } | null = null;
let currentTable: string | null = null;
let currentGame: string | null = null;
/** A tile that fits both ends, waiting for the player to pick a side. */
let pendingTile: string | null = null;
/** The game as last drawn; redrawing only on change keeps buttons from vanishing under a click. */
let drawnGame = "";

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
  if (me !== null) await refreshAll();
}

async function refreshAll() {
  await refreshLobby();
  await refreshGame();
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
  startButton.hidden = table.host !== me.session || table.seats.length < 4;
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

/** Draws a domino with its left and right numbers. */
function domino<T extends HTMLElement>(left: number, right: number, element: T): T {
  element.className = "tile";
  const a = document.createElement("span");
  const b = document.createElement("span");
  a.textContent = String(left);
  b.textContent = String(right);
  element.replaceChildren(a, b);
  return element;
}

/** How many grid units wide the board is; a domino lying flat takes two units by one. */
const BOARD_UNITS = 16;

type Placed = { x: number; y: number; vertical: boolean; first: number; second: number };

/**
 * Lays the board out as one continuous snake. The first tile sits in the middle; the right
 * arm grows rightward and, at the edge, turns down and comes back the other way, while the
 * left arm grows leftward and turns up. Each tile shows its numbers in the order they are
 * reached along the snake, so touching halves always match.
 */
function layOut(board: { left: number; right: number; fromFirst: number }[]): Placed[] {
  const placed: Placed[] = [];
  const center = board.find((t) => t.fromFirst === 0);
  if (center === undefined) return placed;
  const start = BOARD_UNITS / 2 - 1;
  placed.push({ x: start, y: 0, vertical: false, first: center.left, second: center.right });
  // The right arm goes away from the first tile in board order, the left arm against it.
  const arms = [
    { tiles: board.filter((t) => t.fromFirst > 0).sort((a, b) => a.fromFirst - b.fromFirst), x: start + 2, along: 1, turn: 1 },
    { tiles: board.filter((t) => t.fromFirst < 0).sort((a, b) => b.fromFirst - a.fromFirst), x: start, along: -1, turn: -1 },
  ];
  for (const arm of arms) {
    let { x, along } = arm;
    let row = 0;
    for (const t of arm.tiles) {
      // The near number touches the tile before; on the left arm that is the tile's right.
      const [near, far] = arm.turn === 1 ? [t.left, t.right] : [t.right, t.left];
      // Keep one column free at each edge so there is always room to turn.
      const fits = along === 1 ? x + 2 <= BOARD_UNITS - 1 : x - 2 >= 1;
      if (fits) {
        const left = along === 1 ? x : x - 2;
        placed.push({ x: left, y: row, vertical: false, ...(along === 1 ? { first: near, second: far } : { first: far, second: near }) });
        x += 2 * along;
      } else {
        // Stand the tile up beside the row's last tile, reaching into the next row.
        const left = along === 1 ? x : x - 1;
        const top = arm.turn === 1 ? row : row - 1;
        placed.push({ x: left, y: top, vertical: true, ...(arm.turn === 1 ? { first: near, second: far } : { first: far, second: near }) });
        row += arm.turn;
        along = -along;
      }
    }
  }
  return placed;
}

function drawBoard(board: { left: number; right: number; fromFirst: number }[]) {
  const element = $("#board");
  const placed = layOut(board);
  const unit = Math.floor((element.clientWidth || 576) / BOARD_UNITS);
  const top = Math.min(0, ...placed.map((p) => p.y));
  const bottom = Math.max(1, ...placed.map((p) => p.y + (p.vertical ? 2 : 1)));
  element.style.height = `${(bottom - top) * unit}px`;
  element.style.setProperty("--unit", `${unit}px`);
  element.replaceChildren(
    ...placed.map((p) => {
      const tile = domino(p.first, p.second, document.createElement("span"));
      if (p.vertical) tile.classList.add("vertical");
      tile.style.left = `${p.x * unit}px`;
      tile.style.top = `${(p.y - top) * unit}px`;
      return tile;
    }),
  );
}

/** Lists every turn so far, newest last, with a heading where each match begins. */
function drawLog(log: { turn: number; matchNumber: number; displayName: string; move: string; tile: string }[]) {
  const element = $("#log");
  const lines: HTMLElement[] = [];
  let match = 0;
  for (const turn of [...log].sort((a, b) => a.turn - b.turn)) {
    if (turn.matchNumber !== match) {
      match = turn.matchNumber;
      const heading = document.createElement("li");
      heading.className = "match";
      heading.textContent = `Match ${match}`;
      lines.push(heading);
    }
    const line = document.createElement("li");
    line.textContent =
      turn.move === "PLAYED" ? `${turn.displayName} played ${turn.tile.replace("-", "|")}` : `${turn.displayName} was skipped`;
    if (turn.move === "SKIPPED") line.className = "skipped";
    lines.push(line);
  }
  element.replaceChildren(...lines);
  element.scrollTop = element.scrollHeight;
}

async function refreshGame() {
  if (me === null) return;
  const result = await client.games.view({ token: me.token });
  if ("error" in result) return;
  const game = result.view.games[0];
  // A game is shown while it is being played, or after it ends until a new one starts.
  gameSection.hidden = game === undefined;
  currentGame = game?.status === "ACTIVE" ? game.game : null;
  if (currentGame !== null) startButton.hidden = true;
  if (game === undefined || JSON.stringify(game) === drawnGame) return;
  drawnGame = JSON.stringify(game);

  const name = (session: string) => game.players.find((p) => p.player === session)?.displayName ?? "?";
  const team = (seat: number) =>
    game.players.filter((p) => p.position % 2 === seat % 2).map((p) => p.displayName).join(" & ");
  $("#scores").textContent =
    `${team(0)}: ${game.scoreA} · ${team(1)}: ${game.scoreB} · first to ${game.target} · match ${game.matchNumber}`;

  const last = game.lastResult[0];
  let message = "";
  if (last !== undefined) {
    const how = last.ending === "DOMINO" ? `${name(last.winner)} played their last tile` : "Tranque! Nobody could play";
    message =
      last.team === -1
        ? `Match ${last.matchNumber}: ${how}, and it was a tie, so nobody scores.`
        : `Match ${last.matchNumber}: ${how}. ${team(last.team)} score ${last.points}.`;
  }
  if (game.status === "FINISHED") message += ` ${team(game.scoreA >= game.target ? 0 : 1)} win the game!`;
  if (game.status === "ABANDONED") message = "This game was stopped because a player left the table.";
  $("#result").textContent = message;

  $("#players").replaceChildren(
    ...game.players.map((p) => {
      const item = document.createElement("li");
      item.textContent = `${p.displayName}${p.player === me!.session ? " (you)" : ""}: ${p.tileCount} tiles`;
      if (game.status === "ACTIVE" && p.player === game.turnPlayer) {
        item.textContent += " ← playing";
        item.className = "current";
      }
      return item;
    }),
  );

  drawBoard(game.board);
  drawLog(game.log);

  const myTurn = game.status === "ACTIVE" && game.turnPlayer === me.session;
  $("#turn").textContent = myTurn ? "Your turn: pick a tile that matches an end." : "";
  const left = game.board[0]?.left;
  const right = game.board.at(-1)?.right;
  $("#hand").replaceChildren(
    ...game.hand.map(({ tile }) => {
      const [a, b] = tile.split("-").map(Number);
      const fitsLeft = left === undefined || a === left || b === left;
      const fitsRight = right !== undefined && (a === right || b === right);
      const button = domino(a, b, document.createElement("button"));
      button.disabled = !myTurn || !(fitsLeft || fitsRight);
      button.addEventListener("click", () => {
        // Ask for a side only when the tile fits two different ends.
        if (fitsLeft && fitsRight && left !== right) {
          pendingTile = tile;
          $("#chosenTile").textContent = tile.replace("-", "|");
          chooseSide.hidden = false;
        } else {
          play(tile, fitsLeft ? "LEFT" : "RIGHT");
        }
      });
      return button;
    }),
  );
  if (!myTurn) chooseSide.hidden = true;
}

async function play(tile: string, side: "LEFT" | "RIGHT") {
  if (me === null || currentGame === null) return;
  chooseSide.hidden = true;
  pendingTile = null;
  const result = await client.games.play({ token: me.token, game: currentGame, tile, side });
  say("error" in result ? `That move was not allowed (${result.error}).` : "");
  await refreshGame();
}

$("#playLeft").addEventListener("click", () => pendingTile && play(pendingTile, "LEFT"));
$("#playRight").addEventListener("click", () => pendingTile && play(pendingTile, "RIGHT"));

startButton.addEventListener("click", async () => {
  if (me === null) return;
  const result = await client.games.start({ token: me.token });
  say("error" in result ? `Could not start the game (${result.error}).` : "");
  await refreshGame();
});

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
  await refreshAll();
});

joinForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (me === null) return;
  const code = String(new FormData(joinForm).get("code")).trim().toUpperCase();
  const result = await client.tables.join({ token: me.token, code });
  const reasons: Record<string, string> = { NOT_FOUND: "No table has that code.", CONFLICT: "That table is full." };
  say("error" in result ? (reasons[result.error] ?? `Could not join: ${result.error}`) : "");
  await refreshAll();
});

$("#leaveTable").addEventListener("click", async () => {
  if (me === null || currentTable === null) return;
  await client.tables.leave({ token: me.token, table: currentTable });
  await refreshAll();
});

closeButton.addEventListener("click", async () => {
  if (me === null || currentTable === null) return;
  await client.tables.close({ token: me.token, table: currentTable });
  await refreshAll();
});

// Other players join, leave and play in their own tabs, so keep checking.
setInterval(refreshAll, REFRESH_MS);
resume();
