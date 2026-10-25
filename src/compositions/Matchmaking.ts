/**
 * Playing with strangers: a guest asks for a game, waits in a lobby that fills up as
 * others ask, and when the lobby is full and its countdown is over the four are seated
 * at a new table and their game starts, exactly as if friends had met at that table.
 *
 * Matchmaking never refers to Table or DominoPlaying. This module decides that a
 * launched lobby becomes a table whose seats are the lobby's shuffled players.
 */
import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { each, form, former, no, reaction, when, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";
import { strings } from "./validators.ts";

const { CodeGenerating, DominoPlaying, GuestSessioning, Matchmaking, Table } = concepts;

// The only rule set for now. Lobbies already only mix players who ask for the same
// one, so letting guests pick rules later only changes what is passed here.
const STANDARD = "STANDARD";
const TABLE_CODES = "TABLE_CODES";
const CODE_SIZE = 6;

/** The lobby the guest waits in, if any: its rules, countdown, and who waits there by name. */
const QueueLobby = former(
  "the matchmaking lobby of (session)",
  ({ session }, { lobby, rules, full, secondsLeft, player, displayName }) =>
    form({
      lobbies: each(Matchmaking._lobbyOf({ player: session }).is({ lobby }))
        .where(Matchmaking._status({ lobby }).is({ rules, full, secondsLeft }))
        .form({
          lobby,
          rules,
          full,
          secondsLeft,
          players: each(Matchmaking._entries({ lobby }).is({ player }))
            .where(GuestSessioning._getName({ session: player }).is({ displayName }))
            .form({ player, displayName }),
        }),
    }),
);

const ShowQueue = endpoint(
  "/matchmaking/view",
  ({ token, session, displayName }) =>
    receive({ token })
      .then(GuestSessioning.resume({ token }).responds({ session, displayName }))
      .then(respond({ queue: QueueLobby({ session }) })),
  { input: { required: ["token"] }, validators: { input: strings("token") } },
);

/** A guest already sitting at a table must leave it before looking for strangers. */
const Enqueue = endpoint(
  "/matchmaking/enqueue",
  ({ token, session, displayName, lobby }) =>
    receive({ token })
      .then(GuestSessioning.resume({ token }).responds({ session, displayName }))
      .then(
        where(no(Table._tableOf({ player: session })))
          .then(Matchmaking.enqueue({ player: session, rules: STANDARD }).responds({ lobby }))
          .then(respond({ lobby }))
          .named("not-seated"),
        where(Table._tableOf({ player: session }))
          .then(respond({ error: "AT_TABLE" }))
          .named("seated"),
      ),
  { input: { required: ["token"] }, validators: { input: strings("token") } },
);

const LeaveQueue = endpoint(
  "/matchmaking/leave",
  ({ token, session, displayName, lobby }) =>
    receive({ token })
      .then(GuestSessioning.resume({ token }).responds({ session, displayName }))
      .then(Matchmaking.cancel({ player: session }).responds({ lobby }))
      .then(respond({ lobby })),
  { input: { required: ["token"] }, validators: { input: strings("token") } },
);

/**
 * Any player in a full lobby may ask to launch it once its countdown is over;
 * Matchmaking refuses an early ask, and only the first of several asks succeeds.
 */
const Launch = endpoint(
  "/matchmaking/launch",
  ({ token, session, displayName, lobby, first, second, third, fourth }) =>
    receive({ token })
      .then(GuestSessioning.resume({ token }).responds({ session, displayName }))
      .then(
        where(Matchmaking._lobbyOf({ player: session }).is({ lobby }))
          .then(Matchmaking.launch({ lobby }).responds({ first, second, third, fourth }))
          .then(respond({ lobby }))
          .named("queued"),
        where(no(Matchmaking._lobbyOf({ player: session })))
          .then(respond({ error: "NOT_QUEUED" }))
          .named("not-queued"),
      ),
  { input: { required: ["token"] }, validators: { input: strings("token") } },
);

// A launched lobby becomes a table: the first player opens it under a fresh code, the
// others sit down in their shuffled order, and the game starts with no host needed.
const SeatLaunchedLobby = reaction(({ first, second, third, fourth, code, table }) =>
  when(Matchmaking.launch({}).responds({ first, second, third, fourth }))
    .then(CodeGenerating.generate({ context: TABLE_CODES, size: CODE_SIZE }).responds({ code }))
    .then(Table.open({ host: first, code }).responds({ table }))
    .then(Table.join({ table, player: second }))
    .then(Table.join({ table, player: third }))
    .then(Table.join({ table, player: fourth }))
    .then(DominoPlaying.start({ place: table, first, second, third, fourth })),
);

// A guest who ends their session stops waiting for a game.
const LeaveQueueOnSessionEnd = reaction(({ session }) =>
  when(GuestSessioning.end({}).responds({ session }))
    .where(Matchmaking._lobbyOf({ player: session }))
    .then(Matchmaking.cancel({ player: session })),
);

export const composition = {
  QueueLobby,
  ShowQueue,
  Enqueue,
  LeaveQueue,
  Launch,
  SeatLaunchedLobby,
  LeaveQueueOnSessionEnd,
};
