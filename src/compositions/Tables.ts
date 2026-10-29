/**
 * Private tables: opening one under a fresh join code, joining by that code, the host
 * arranging who sits where, and leaving or closing it. Every endpoint resolves the guest's token first, so the
 * player at the table is always the guest who asked, never someone they name.
 *
 * Table knows nothing about the game; it only seats people.
 */
import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { each, form, former, is, no, reaction, when, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";
import { AWAY_BEFORE_GAME_MS } from "../timing.ts";
import { seats, strings } from "./validators.ts";

const { CodeGenerating, DominoPlaying, Guesting, Matchmaking, Sessioning, Table } = concepts;

const TABLE_CODES = "TABLE_CODES";
const CODE_SIZE = 6;

/** The table the guest sits at, if any, with every seat and the name of who sits there. */
const Lobby = former(
  "the lobby of (me)",
  ({ me }, { table, host, code, rules, position, player, displayName }) =>
    form({
      tables: each(Table._tableOf({ player: me }).is({ table }))
        .where(Table._get({ table }).is({ host, code, rules }))
        .form({
          table,
          code,
          host,
          rules,
          seats: each(Table._seats({ table }).is({ position, player }))
            .where(Guesting._name({ guest: player }).is({ displayName }))
            .form({ position, player, displayName }),
        }),
    }),
);

const ShowLobby = endpoint(
  "/tables/lobby",
  ({ token, me }) =>
    receive({ token })
      .then(Sessioning.resume({ token }).responds({ player: me }))
      .then(respond({ lobby: Lobby({ me }) })),
  { input: { required: ["token"] }, validators: { input: strings("token") } },
);

/**
 * The host picks the rules the table will play by; rules the game does not know are
 * answered UNKNOWN_RULES. A guest waiting for strangers must leave the queue first.
 */
const Open = endpoint(
  "/tables/open",
  ({ token, me, rules, code, table }) =>
    receive({ token, rules })
      .then(Sessioning.resume({ token }).responds({ player: me }))
      .then(
        where(no(Matchmaking._lobbyOf({ player: me })), DominoPlaying._ruleset({ rules }))
          .then(CodeGenerating.generate({ context: TABLE_CODES, size: CODE_SIZE }).responds({ code }))
          .then(Table.open({ host: me, code, rules }).responds({ table }))
          .then(respond({ table, code }))
          .named("not-queued"),
        where(no(Matchmaking._lobbyOf({ player: me })), no(DominoPlaying._ruleset({ rules })))
          .then(respond({ error: "UNKNOWN_RULES" }))
          .named("unknown-rules"),
        where(Matchmaking._lobbyOf({ player: me }))
          .then(respond({ error: "IN_QUEUE" }))
          .named("queued"),
      ),
  { input: { required: ["token", "rules"] }, validators: { input: strings("token", "rules") } },
);

/**
 * A code nobody holds answers NO_SUCH_TABLE here, before Table is ever asked. A guest
 * waiting for strangers must leave the queue first. A table Matchmaking seated
 * strangers at is answered PUBLIC_TABLE: its empty seats go to strangers who asked to
 * join midway, through the queue, not to whoever has its code.
 */
const JoinByCode = endpoint(
  "/tables/join",
  ({ token, me, code, table, position }) =>
    receive({ token, code })
      .then(Sessioning.resume({ token }).responds({ player: me }))
      .then(
        where(
          no(Matchmaking._lobbyOf({ player: me })),
          Table._getByCode({ code }).is({ table }),
          no(Matchmaking._placeRules({ place: table })),
        )
          .then(Table.join({ table, player: me }).responds({ position }))
          .then(respond({ table, position }))
          .named("code-found"),
        where(
          no(Matchmaking._lobbyOf({ player: me })),
          Table._getByCode({ code }).is({ table }),
          Matchmaking._placeRules({ place: table }),
        )
          .then(respond({ error: "PUBLIC_TABLE" }))
          .named("public-table"),
        where(no(Matchmaking._lobbyOf({ player: me })), no(Table._getByCode({ code })))
          .then(respond({ error: "NO_SUCH_TABLE" }))
          .named("code-unknown"),
        where(Matchmaking._lobbyOf({ player: me }))
          .then(respond({ error: "IN_QUEUE" }))
          .named("queued"),
      ),
  { input: { required: ["token", "code"] }, validators: { input: strings("token", "code") } },
);

const Leave = endpoint(
  "/tables/leave",
  ({ token, me, table }) =>
    receive({ token, table })
      .then(Sessioning.resume({ token }).responds({ player: me }))
      .then(Table.leave({ table, player: me }).responds({ table }))
      .then(respond({ table })),
  { input: { required: ["token", "table"] }, validators: { input: strings("token", "table") } },
);

/** Only the host may close a table that still has people at it. */
const Close = endpoint(
  "/tables/close",
  ({ token, me, table, code }) =>
    receive({ token, table })
      .then(Sessioning.resume({ token }).responds({ player: me }))
      .then(
        where(Table._get({ table }).is({ host: me }))
          .then(Table.close({ table }).responds({ code }))
          .then(respond({ table }))
          .named("host"),
        where(no(Table._get({ table }).is({ host: me })))
          .then(respond({ error: "NOT_HOST" }))
          .named("not-host"),
      ),
  { input: { required: ["token", "table"] }, validators: { input: strings("token", "table") } },
);

/**
 * Seats are joined in order, and partners sit across from each other, so the host of
 * a private table may swap any two seats (or move someone to an empty one) to choose
 * the teams. Only while no game is being played there: once one starts, seats are its
 * turn order. Tables Matchmaking seated strangers at keep their drawn seats.
 */
const SwapSeats = endpoint(
  "/tables/swap",
  ({ token, me, table, first, second }) =>
    receive({ token, first, second })
      .then(Sessioning.resume({ token }).responds({ player: me }))
      .then(
        where(
          Table._tableOf({ player: me }).is({ table }),
          Table._get({ table }).is({ host: me }),
          no(DominoPlaying._activeAt({ place: table })),
          no(Matchmaking._placeRules({ place: table })),
        )
          .then(Table.swap({ table, first, second }).responds({ table }))
          .then(respond({ table }))
          .named("host-before-game"),
        where(
          Table._tableOf({ player: me }).is({ table }),
          Table._get({ table }).is({ host: me }),
          DominoPlaying._activeAt({ place: table }),
        )
          .then(respond({ error: "GAME_IN_PROGRESS" }))
          .named("game-running"),
        where(
          Table._tableOf({ player: me }).is({ table }),
          Table._get({ table }).is({ host: me }),
          no(DominoPlaying._activeAt({ place: table })),
          Matchmaking._placeRules({ place: table }),
        )
          .then(respond({ error: "PUBLIC_TABLE" }))
          .named("public-table"),
        where(Table._tableOf({ player: me }).is({ table }), no(Table._get({ table }).is({ host: me })))
          .then(respond({ error: "NOT_HOST" }))
          .named("not-host"),
        where(no(Table._tableOf({ player: me })))
          .then(respond({ error: "NOT_SEATED" }))
          .named("not-seated"),
      ),
  {
    input: { required: ["token", "first", "second"] },
    validators: { input: seats(["first", "second"], strings("token")) },
  },
);

/**
 * Asked by the server's ticker: someone sitting at a table with no game being played
 * whose page has not checked in for a while (it was closed, or went offline) is taken
 * out as if they had left, so the table does not wait on them and, if they were the
 * host, hosting passes on. An open page checks in by itself, so an idle guest stays.
 * Someone with no session left at all (such as one from before sessions were kept
 * where they are now) is gone for good, and taken out too.
 * In a game the shorter wait in Seats applies instead (GAME_IN_PROGRESS here).
 */
const DropAbsentSitter = endpoint(
  "/tables/drop-absent",
  ({ player, table, idleMs }) =>
    receive({ player }).then(
      where(
        Table._tableOf({ player }).is({ table }),
        no(DominoPlaying._activeAt({ place: table })),
        Sessioning._idleFor({ player }).is({ idleMs }),
        is.ge(idleMs, AWAY_BEFORE_GAME_MS),
      )
        .then(Table.leave({ table, player }))
        .then(respond({ table }))
        .named("away"),
      where(
        Table._tableOf({ player }).is({ table }),
        no(DominoPlaying._activeAt({ place: table })),
        Sessioning._idleFor({ player }).is({ idleMs }),
        is.lt(idleMs, AWAY_BEFORE_GAME_MS),
      )
        .then(respond({ error: "STILL_HERE" }))
        .named("present"),
      where(Table._tableOf({ player }).is({ table }), DominoPlaying._activeAt({ place: table }))
        .then(respond({ error: "GAME_IN_PROGRESS" }))
        .named("playing"),
      where(
        Table._tableOf({ player }).is({ table }),
        no(DominoPlaying._activeAt({ place: table })),
        no(Sessioning._idleFor({ player })),
      )
        .then(Table.leave({ table, player }))
        .then(respond({ table }))
        .named("no-session"),
      where(no(Table._tableOf({ player })))
        .then(respond({ error: "NOT_SEATED" }))
        .named("not-seated"),
    ),
  { input: { required: ["player"] }, validators: { input: strings("player") } },
);

// When the last player leaves, nobody is left to close the table, so the app does.
const CloseEmptyTable = reaction(({ table }) =>
  when(Table.leave({}).responds({ table }))
    .where(no(Table._seats({ table })))
    .then(Table.close({ table })),
);

// A player whose last session ends (they signed out) also gets up from their table.
const LeaveTableOnSessionEnd = reaction(({ player, table }) =>
  when(Sessioning.end({}).responds({ player }))
    .where(no(Sessioning._idleFor({ player })), Table._tableOf({ player }).is({ table }))
    .then(Table.leave({ table, player })),
);

// So does one whose last session expired, so a player away for good never holds a seat.
const LeaveTableOnSessionExpire = reaction(({ player, table }) =>
  when(Sessioning.expire({}).responds({ player }))
    .where(no(Sessioning._idleFor({ player })), Table._tableOf({ player }).is({ table }))
    .then(Table.leave({ table, player })),
);

// A closed table's code goes back to CodeGenerating, so it can be handed out again.
const FreeTableCode = reaction(({ code }) =>
  when(Table.close({}).responds({ code })).then(CodeGenerating.remove({ context: TABLE_CODES, code })),
);

export const composition = {
  Lobby,
  ShowLobby,
  Open,
  JoinByCode,
  SwapSeats,
  DropAbsentSitter,
  Leave,
  Close,
  CloseEmptyTable,
  LeaveTableOnSessionEnd,
  LeaveTableOnSessionExpire,
  FreeTableCode,
};
