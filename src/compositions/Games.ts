/**
 * Playing dominoes at a private table: the host starts a game with the four people
 * seated, players take their turns, and everyone sees the game from their own seat.
 *
 * Table and DominoPlaying never refer to each other. This module decides that a
 * table is where a game is played and that its seats, in order, are the turn order.
 */
import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { each, form, former, no, reaction, when, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";
import { sides, strings } from "./validators.ts";

const { DominoPlaying, GuestSessioning, Table } = concepts;

/**
 * The game at the guest's table as that guest sees it: the scores, the board, whose
 * turn it is, everyone's tile count, their own hand (and nobody else's), every turn
 * so far, and how the last match ended.
 */
const GameView = former(
  "the game seen by (session)",
  (
    { session },
    {
      table,
      game,
      rules,
      rulesDescription,
      status,
      target,
      matchNumber,
      scoreA,
      scoreB,
      turnPlayer,
      tile,
      boardTile,
      left,
      right,
      fromFirst,
      position,
      player,
      tileCount,
      displayName,
      resultMatch,
      winner,
      team,
      points,
      prize,
      special,
      bonus,
      ending,
      turnNumber,
      turnMatch,
      mover,
      move,
      movedTile,
      moverName,
    },
  ) =>
    form({
      games: each(Table._tableOf({ player: session }).is({ table }))
        .where(
          DominoPlaying._latestAt({ place: table }).is({ game }),
          DominoPlaying._summary({ game }).is({ rules, status, target, matchNumber, scoreA, scoreB, turnPlayer }),
          DominoPlaying._ruleset({ rules }).is({ description: rulesDescription }),
        )
        .form({
          game,
          rules,
          rulesDescription,
          status,
          target,
          matchNumber,
          scoreA,
          scoreB,
          turnPlayer,
          board: each(DominoPlaying._board({ game }).is({ tile: boardTile, left, right, fromFirst })).form({
            tile: boardTile,
            left,
            right,
            fromFirst,
          }),
          hand: each(DominoPlaying._hand({ game, player: session }).is({ tile })).form({ tile }),
          players: each(DominoPlaying._players({ game }).is({ position, player, tileCount }))
            .where(GuestSessioning._getName({ session: player }).is({ displayName }))
            .form({ position, player, displayName, tileCount }),
          log: each(DominoPlaying._log({ game }).is({ turn: turnNumber, matchNumber: turnMatch, player: mover, move, tile: movedTile }))
            .where(GuestSessioning._getName({ session: mover }).is({ displayName: moverName }))
            .form({ turn: turnNumber, matchNumber: turnMatch, player: mover, displayName: moverName, move, tile: movedTile }),
          lastResult: each(
            DominoPlaying._lastResult({ game }).is({ matchNumber: resultMatch, winner, team, points, prize, special, bonus, ending }),
          ).form({ matchNumber: resultMatch, winner, team, points, prize, special, bonus, ending }),
        }),
    }),
);

const ViewGame = endpoint(
  "/games/view",
  ({ token, session, displayName }) =>
    receive({ token })
      .then(GuestSessioning.resume({ token }).responds({ session, displayName }))
      .then(respond({ view: GameView({ session }) })),
  { input: { required: ["token"] }, validators: { input: strings("token") } },
);

/** Every rule set a table or a matchmaking lobby can play by, for the page to offer. */
const Rulesets = former("the rule sets", (_, { rules, target, description }) =>
  form({
    rulesets: each(DominoPlaying._rulesets({}).is({ rules, target, description })).form({ rules, target, description }),
  }),
);

const ShowRulesets = endpoint("/games/rulesets", () => receive({}).then(respond({ view: Rulesets({}) })));

/**
 * The host starts a game once all four seats are taken; seat order is turn order, and
 * the game is played by the rules the table was opened with.
 */
const StartGame = endpoint(
  "/games/start",
  ({ token, session, displayName, table, first, second, third, fourth, rules, game }) =>
    receive({ token })
      .then(GuestSessioning.resume({ token }).responds({ session, displayName }))
      .then(
        where(
          Table._tableOf({ player: session }).is({ table }),
          Table._get({ table }).is({ host: session, rules }),
          Table._isFull({ table }).is({ full: true }),
          Table._seats({ table }).is({ position: 0, player: first }),
          Table._seats({ table }).is({ position: 1, player: second }),
          Table._seats({ table }).is({ position: 2, player: third }),
          Table._seats({ table }).is({ position: 3, player: fourth }),
        )
          .then(DominoPlaying.start({ place: table, first, second, third, fourth, rules }).responds({ game }))
          .then(respond({ game }))
          .named("host-of-full-table"),
        where(
          Table._tableOf({ player: session }).is({ table }),
          Table._get({ table }).is({ host: session }),
          Table._isFull({ table }).is({ full: false }),
        )
          .then(respond({ error: "TABLE_NOT_FULL" }))
          .named("table-not-full"),
        where(Table._tableOf({ player: session }).is({ table }), no(Table._get({ table }).is({ host: session })))
          .then(respond({ error: "NOT_HOST" }))
          .named("not-host"),
        where(no(Table._tableOf({ player: session })))
          .then(respond({ error: "NOT_SEATED" }))
          .named("not-seated"),
      ),
  { input: { required: ["token"] }, validators: { input: strings("token") } },
);

/** The player is always the guest who asked; DominoPlaying checks it is their turn. */
const Play = endpoint(
  "/games/play",
  ({ token, session, displayName, game, tile, side }) =>
    receive({ token, game, tile, side })
      .then(GuestSessioning.resume({ token }).responds({ session, displayName }))
      .then(DominoPlaying.play({ game, player: session, tile, side }).responds({ game }))
      .then(respond({ game })),
  {
    input: { required: ["token", "game", "tile", "side"] },
    validators: { input: sides("side", strings("token", "game", "tile")) },
  },
);

// A game needs all four players, so it stops when anyone gets up from the table.
const AbandonGameWhenPlayerLeaves = reaction(({ table, game }) =>
  when(Table.leave({}).responds({ table }))
    .where(DominoPlaying._activeAt({ place: table }).is({ game }))
    .then(DominoPlaying.abandon({ game })),
);

// Closing a table stops the game being played at it.
const AbandonGameWhenTableCloses = reaction(({ table, code, game }) =>
  when(Table.close({ table }).responds({ code }))
    .where(DominoPlaying._activeAt({ place: table }).is({ game }))
    .then(DominoPlaying.abandon({ game })),
);

export const composition = {
  Rulesets,
  ShowRulesets,
  GameView,
  ViewGame,
  StartGame,
  Play,
  AbandonGameWhenPlayerLeaves,
  AbandonGameWhenTableCloses,
};
