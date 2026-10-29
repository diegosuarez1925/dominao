/**
 * Playing with strangers: a guest asks for a game, waits in a lobby that fills up as
 * others ask, and when the lobby is full and its countdown is over the four are seated
 * at a new table and their game starts, exactly as if friends had met at that table.
 *
 * Matchmaking never refers to Table or DominoPlaying. This module decides that a
 * launched lobby becomes a table whose seats are the lobby's shuffled players.
 */
import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { each, form, former, is, no, reaction, when, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";
import { AWAY_BEFORE_GAME_MS } from "../timing.ts";
import { flags, strings } from "./validators.ts";

const { CodeGenerating, DominoPlaying, Guesting, Matchmaking, Sessioning, Table } = concepts;

const TABLE_CODES = "TABLE_CODES";
const CODE_SIZE = 6;

/**
 * The lobby the guest waits in, if any: its rules, countdown, and who waits there by
 * name, with whether each would also take a seat in a game already being played.
 */
const QueueLobby = former(
  "the matchmaking lobby of (me)",
  ({ me }, { lobby, rules, full, secondsLeft, player, midway, displayName }) =>
    form({
      lobbies: each(Matchmaking._lobbyOf({ player: me }).is({ lobby }))
        .where(Matchmaking._status({ lobby }).is({ rules, full, secondsLeft }))
        .form({
          lobby,
          rules,
          full,
          secondsLeft,
          players: each(Matchmaking._entries({ lobby }).is({ player, midway }))
            .where(Guesting._name({ guest: player }).is({ displayName }))
            .form({ player, displayName, midway }),
        }),
    }),
);

const ShowQueue = endpoint(
  "/matchmaking/view",
  ({ token, me }) =>
    receive({ token })
      .then(Sessioning.resume({ token }).responds({ player: me }))
      .then(respond({ queue: QueueLobby({ me }) })),
  { input: { required: ["token"] }, validators: { input: strings("token") } },
);

/**
 * A guest asks for a game under rules of their choice and only meets strangers who
 * chose the same; rules the game does not know are answered UNKNOWN_RULES. A guest
 * already sitting at a table must leave it first. `midway` says whether they would
 * also take an empty seat in a game of strangers already being played.
 */
const Enqueue = endpoint(
  "/matchmaking/enqueue",
  ({ token, me, rules, midway, lobby }) =>
    receive({ token, rules, midway })
      .then(Sessioning.resume({ token }).responds({ player: me }))
      .then(
        where(no(Table._tableOf({ player: me })), DominoPlaying._ruleset({ rules }))
          .then(Matchmaking.enqueue({ player: me, rules, midway }).responds({ lobby }))
          .then(respond({ lobby }))
          .named("not-seated"),
        where(no(Table._tableOf({ player: me })), no(DominoPlaying._ruleset({ rules })))
          .then(respond({ error: "UNKNOWN_RULES" }))
          .named("unknown-rules"),
        where(Table._tableOf({ player: me }))
          .then(respond({ error: "AT_TABLE" }))
          .named("seated"),
      ),
  {
    input: { required: ["token", "rules", "midway"] },
    validators: { input: flags("midway", strings("token", "rules")) },
  },
);

const LeaveQueue = endpoint(
  "/matchmaking/leave",
  ({ token, me, lobby }) =>
    receive({ token })
      .then(Sessioning.resume({ token }).responds({ player: me }))
      .then(Matchmaking.cancel({ player: me }).responds({ lobby }))
      .then(respond({ lobby })),
  { input: { required: ["token"] }, validators: { input: strings("token") } },
);

/**
 * A full lobby is launched once its countdown is over. The server's own ticker asks,
 * so the game starts even if every waiting page is in the background. Matchmaking
 * refuses an early ask, and only the first of several asks succeeds, so anyone asking
 * (or asking twice) changes nothing.
 */
const Launch = endpoint(
  "/matchmaking/launch",
  ({ lobby, first, second, third, fourth }) =>
    receive({ lobby })
      .then(Matchmaking.launch({ lobby }).responds({ first, second, third, fourth }))
      .then(respond({ lobby })),
  { input: { required: ["lobby"] }, validators: { input: strings("lobby") } },
);

/**
 * Asked by the server's ticker: a guest waiting for strangers whose page has not
 * checked in for a while (it was closed, or went offline) stops waiting, as if they
 * had left the queue, so no game is started around someone who is gone. An open page
 * checks in by itself, so an idle guest keeps waiting. Someone with no session left
 * at all is gone for good, and stops waiting too.
 */
const DropAbsentWaiter = endpoint(
  "/matchmaking/drop-absent",
  ({ player, lobby, idleMs }) =>
    receive({ player }).then(
      where(
        Matchmaking._lobbyOf({ player }),
        Sessioning._idleFor({ player }).is({ idleMs }),
        is.ge(idleMs, AWAY_BEFORE_GAME_MS),
      )
        .then(Matchmaking.cancel({ player }).responds({ lobby }))
        .then(respond({ lobby }))
        .named("away"),
      where(
        Matchmaking._lobbyOf({ player }),
        Sessioning._idleFor({ player }).is({ idleMs }),
        is.lt(idleMs, AWAY_BEFORE_GAME_MS),
      )
        .then(respond({ error: "STILL_HERE" }))
        .named("present"),
      where(Matchmaking._lobbyOf({ player }), no(Sessioning._idleFor({ player })))
        .then(Matchmaking.cancel({ player }).responds({ lobby }))
        .then(respond({ lobby }))
        .named("no-session"),
      where(no(Matchmaking._lobbyOf({ player })))
        .then(respond({ error: "NOT_QUEUED" }))
        .named("not-queued"),
    ),
  { input: { required: ["player"] }, validators: { input: strings("player") } },
);

// A launched lobby becomes a table: the first player opens it under a fresh code and
// the lobby's rules, the others sit down in their shuffled order, and the game starts
// by those rules with no host needed. Matchmaking remembers the table, so strangers
// happy to join midway can be sent to it if a seat empties.
const SeatLaunchedLobby = reaction(({ first, second, third, fourth, rules, code, table }) =>
  when(Matchmaking.launch({}).responds({ first, second, third, fourth, rules }))
    .then(CodeGenerating.generate({ context: TABLE_CODES, size: CODE_SIZE }).responds({ code }))
    .then(Table.open({ host: first, code, rules }).responds({ table }))
    .then(Table.join({ table, player: second }))
    .then(Table.join({ table, player: third }))
    .then(Table.join({ table, player: fourth }))
    .then(DominoPlaying.start({ place: table, first, second, third, fourth, rules }))
    .then(Matchmaking.adopt({ place: table, rules })),
);

// A guest happy to join midway who asks for a game while a table of strangers with
// their rules has a seat to fill (empty, or held by a bot) is sent there at once.
const SendMidwayGuestToOpenSeat = reaction(({ player, rules, place }) =>
  when(Matchmaking.enqueue({ player, rules, midway: true }).responds({}))
    .where(
      Matchmaking._places({ rules }).is({ place }),
      DominoPlaying._activeAt({ place }),
      Table._isFull({ table: place }).is({ full: false }),
    )
    .then(Table.join({ table: place, player })),
);

// And when a seat empties at a table of strangers, the guest who has waited longest
// among those happy to join midway with the same rules is sent to it.
const FillEmptySeatFromQueue = reaction(({ place, rules, player }) =>
  when(DominoPlaying.vacate({}).responds({ place }))
    .where(
      Matchmaking._placeRules({ place }).is({ rules }),
      Matchmaking._midwayWaiting({ rules }).is({ player }),
      Table._isFull({ table: place }).is({ full: false }),
    )
    .then(Table.join({ table: place, player })),
);

// Someone sent to a table stops waiting in their lobby.
const StopWaitingOnceSeated = reaction(({ player }) =>
  when(Table.join({ player }))
    .where(Matchmaking._lobbyOf({ player }))
    .then(Matchmaking.cancel({ player })),
);

// A closed table is forgotten, so nobody is sent to it.
const ForgetClosedTable = reaction(({ table }) =>
  when(Table.close({ table }))
    .where(Matchmaking._placeRules({ place: table }))
    .then(Matchmaking.release({ place: table })),
);

// A player whose last session ends (they signed out) stops waiting for a game.
const LeaveQueueOnSessionEnd = reaction(({ player }) =>
  when(Sessioning.end({}).responds({ player }))
    .where(no(Sessioning._idleFor({ player })), Matchmaking._lobbyOf({ player }))
    .then(Matchmaking.cancel({ player })),
);

// So does one whose last session expired, so nobody away for good holds a place.
const LeaveQueueOnSessionExpire = reaction(({ player }) =>
  when(Sessioning.expire({}).responds({ player }))
    .where(no(Sessioning._idleFor({ player })), Matchmaking._lobbyOf({ player }))
    .then(Matchmaking.cancel({ player })),
);

export const composition = {
  QueueLobby,
  ShowQueue,
  Enqueue,
  LeaveQueue,
  Launch,
  DropAbsentWaiter,
  SeatLaunchedLobby,
  SendMidwayGuestToOpenSeat,
  FillEmptySeatFromQueue,
  StopWaitingOnceSeated,
  ForgetClosedTable,
  LeaveQueueOnSessionEnd,
  LeaveQueueOnSessionExpire,
};
