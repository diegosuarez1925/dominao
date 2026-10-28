/**
 * Private tables: opening one under a fresh join code, joining by that code, the host
 * arranging who sits where, and leaving or closing it. Every endpoint resolves the guest's token first, so the
 * player at the table is always the guest who asked, never someone they name.
 *
 * Table knows nothing about the game; it only seats people.
 */
import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { each, form, former, no, reaction, when, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";
import { seats, strings } from "./validators.ts";

const { CodeGenerating, DominoPlaying, GuestSessioning, Matchmaking, Table } = concepts;

const TABLE_CODES = "TABLE_CODES";
const CODE_SIZE = 6;

/** The table the guest sits at, if any, with every seat and the name of who sits there. */
const Lobby = former(
  "the lobby of (session)",
  ({ session }, { table, host, code, rules, position, player, displayName }) =>
    form({
      tables: each(Table._tableOf({ player: session }).is({ table }))
        .where(Table._get({ table }).is({ host, code, rules }))
        .form({
          table,
          code,
          host,
          rules,
          seats: each(Table._seats({ table }).is({ position, player }))
            .where(GuestSessioning._getName({ session: player }).is({ displayName }))
            .form({ position, player, displayName }),
        }),
    }),
);

const ShowLobby = endpoint(
  "/tables/lobby",
  ({ token, session, displayName }) =>
    receive({ token })
      .then(GuestSessioning.resume({ token }).responds({ session, displayName }))
      .then(respond({ lobby: Lobby({ session }) })),
  { input: { required: ["token"] }, validators: { input: strings("token") } },
);

/**
 * The host picks the rules the table will play by; rules the game does not know are
 * answered UNKNOWN_RULES. A guest waiting for strangers must leave the queue first.
 */
const Open = endpoint(
  "/tables/open",
  ({ token, session, displayName, rules, code, table }) =>
    receive({ token, rules })
      .then(GuestSessioning.resume({ token }).responds({ session, displayName }))
      .then(
        where(no(Matchmaking._lobbyOf({ player: session })), DominoPlaying._ruleset({ rules }))
          .then(CodeGenerating.generate({ context: TABLE_CODES, size: CODE_SIZE }).responds({ code }))
          .then(Table.open({ host: session, code, rules }).responds({ table }))
          .then(respond({ table, code }))
          .named("not-queued"),
        where(no(Matchmaking._lobbyOf({ player: session })), no(DominoPlaying._ruleset({ rules })))
          .then(respond({ error: "UNKNOWN_RULES" }))
          .named("unknown-rules"),
        where(Matchmaking._lobbyOf({ player: session }))
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
  ({ token, session, displayName, code, table, position }) =>
    receive({ token, code })
      .then(GuestSessioning.resume({ token }).responds({ session, displayName }))
      .then(
        where(
          no(Matchmaking._lobbyOf({ player: session })),
          Table._getByCode({ code }).is({ table }),
          no(Matchmaking._placeRules({ place: table })),
        )
          .then(Table.join({ table, player: session }).responds({ position }))
          .then(respond({ table, position }))
          .named("code-found"),
        where(
          no(Matchmaking._lobbyOf({ player: session })),
          Table._getByCode({ code }).is({ table }),
          Matchmaking._placeRules({ place: table }),
        )
          .then(respond({ error: "PUBLIC_TABLE" }))
          .named("public-table"),
        where(no(Matchmaking._lobbyOf({ player: session })), no(Table._getByCode({ code })))
          .then(respond({ error: "NO_SUCH_TABLE" }))
          .named("code-unknown"),
        where(Matchmaking._lobbyOf({ player: session }))
          .then(respond({ error: "IN_QUEUE" }))
          .named("queued"),
      ),
  { input: { required: ["token", "code"] }, validators: { input: strings("token", "code") } },
);

const Leave = endpoint(
  "/tables/leave",
  ({ token, session, displayName, table }) =>
    receive({ token, table })
      .then(GuestSessioning.resume({ token }).responds({ session, displayName }))
      .then(Table.leave({ table, player: session }).responds({ table }))
      .then(respond({ table })),
  { input: { required: ["token", "table"] }, validators: { input: strings("token", "table") } },
);

/** Only the host may close a table that still has people at it. */
const Close = endpoint(
  "/tables/close",
  ({ token, session, displayName, table, code }) =>
    receive({ token, table })
      .then(GuestSessioning.resume({ token }).responds({ session, displayName }))
      .then(
        where(Table._get({ table }).is({ host: session }))
          .then(Table.close({ table }).responds({ code }))
          .then(respond({ table }))
          .named("host"),
        where(no(Table._get({ table }).is({ host: session })))
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
  ({ token, session, displayName, table, first, second }) =>
    receive({ token, first, second })
      .then(GuestSessioning.resume({ token }).responds({ session, displayName }))
      .then(
        where(
          Table._tableOf({ player: session }).is({ table }),
          Table._get({ table }).is({ host: session }),
          no(DominoPlaying._activeAt({ place: table })),
          no(Matchmaking._placeRules({ place: table })),
        )
          .then(Table.swap({ table, first, second }).responds({ table }))
          .then(respond({ table }))
          .named("host-before-game"),
        where(
          Table._tableOf({ player: session }).is({ table }),
          Table._get({ table }).is({ host: session }),
          DominoPlaying._activeAt({ place: table }),
        )
          .then(respond({ error: "GAME_IN_PROGRESS" }))
          .named("game-running"),
        where(
          Table._tableOf({ player: session }).is({ table }),
          Table._get({ table }).is({ host: session }),
          no(DominoPlaying._activeAt({ place: table })),
          Matchmaking._placeRules({ place: table }),
        )
          .then(respond({ error: "PUBLIC_TABLE" }))
          .named("public-table"),
        where(Table._tableOf({ player: session }).is({ table }), no(Table._get({ table }).is({ host: session })))
          .then(respond({ error: "NOT_HOST" }))
          .named("not-host"),
        where(no(Table._tableOf({ player: session })))
          .then(respond({ error: "NOT_SEATED" }))
          .named("not-seated"),
      ),
  {
    input: { required: ["token", "first", "second"] },
    validators: { input: seats(["first", "second"], strings("token")) },
  },
);

// When the last player leaves, nobody is left to close the table, so the app does.
const CloseEmptyTable = reaction(({ table }) =>
  when(Table.leave({}).responds({ table }))
    .where(no(Table._seats({ table })))
    .then(Table.close({ table })),
);

// A guest who ends their session also gets up from their table.
const LeaveTableOnSessionEnd = reaction(({ session, table }) =>
  when(GuestSessioning.end({}).responds({ session }))
    .where(Table._tableOf({ player: session }).is({ table }))
    .then(Table.leave({ table, player: session })),
);

// So does a guest whose session expired, so an idle guest never holds a seat.
const LeaveTableOnSessionExpire = reaction(({ session, table }) =>
  when(GuestSessioning.expire({}).responds({ session }))
    .where(Table._tableOf({ player: session }).is({ table }))
    .then(Table.leave({ table, player: session })),
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
  Leave,
  Close,
  CloseEmptyTable,
  LeaveTableOnSessionEnd,
  LeaveTableOnSessionExpire,
  FreeTableCode,
};
