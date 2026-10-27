/**
 * Playing dominoes at a private table: the host starts a game with the four people
 * seated, players take their turns, and everyone sees the game from their own seat.
 *
 * Table and DominoPlaying never refer to each other. This module decides that a
 * table is where a game is played and that its seats, in order, are the turn order.
 */
import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { each, form, former, no, reaction, when, where, whether } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";
import { ABSENT_MS, BOT_AFTER_MS } from "../timing.ts";
import { sides, strings } from "./validators.ts";

const { Botting, DominoPlaying, GuestSessioning, Matchmaking, Table } = concepts;

/**
 * The game at the guest's table as that guest sees it: the scores, the board, whose
 * turn it is, everyone's tile count, their own hand (and nobody else's), every turn
 * so far, how the last match ended, and how every match so far ended (for the score
 * table). Each seat says who holds it (a guest by name, or a bot by its bot name) and
 * how long since that guest's page last checked in;
 * each empty seat says who left it and how long ago, so the page can count down to
 * the bot taking over. `publicRules` is set when strangers were matched into the game.
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
      botName,
      idleMs,
      vacantPosition,
      leaver,
      leaverName,
      leaverBot,
      vacantMs,
      placeRules,
      resultMatch,
      pastMatch,
      pastWinner,
      pastTeam,
      pastPoints,
      pastSpecial,
      pastEnding,
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
      moverBot,
    },
  ) =>
    form({
      games: each(Table._tableOf({ player: session }).is({ table }))
        .where(
          DominoPlaying._latestAt({ place: table }).is({ game }),
          DominoPlaying._summary({ game }).is({ rules, status, target, matchNumber, scoreA, scoreB, turnPlayer }),
          DominoPlaying._ruleset({ rules }).is({ description: rulesDescription }),
          whether(Matchmaking._placeRules({ place: table }).is({ rules: placeRules })),
        )
        .form({
          game,
          publicRules: placeRules,
          botAfterMs: BOT_AFTER_MS,
          absentAfterMs: ABSENT_MS,
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
            .where(
              whether(GuestSessioning._getName({ session: player }).is({ displayName })),
              whether(Botting._name({ bot: player }).is({ name: botName })),
              whether(GuestSessioning._idleFor({ session: player }).is({ idleMs })),
            )
            .form({ position, player, displayName, botName, idleMs, tileCount }),
          vacancies: each(DominoPlaying._vacancies({ game }).is({ position: vacantPosition, player: leaver, vacantMs }))
            .where(
              whether(GuestSessioning._getName({ session: leaver }).is({ displayName: leaverName })),
              whether(Botting._name({ bot: leaver }).is({ name: leaverBot })),
            )
            .form({ position: vacantPosition, player: leaver, displayName: leaverName, botName: leaverBot, vacantMs }),
          log: each(DominoPlaying._log({ game }).is({ turn: turnNumber, matchNumber: turnMatch, player: mover, move, tile: movedTile }))
            .where(
              whether(GuestSessioning._getName({ session: mover }).is({ displayName: moverName })),
              whether(Botting._name({ bot: mover }).is({ name: moverBot })),
            )
            .form({
              turn: turnNumber,
              matchNumber: turnMatch,
              player: mover,
              displayName: moverName,
              botName: moverBot,
              move,
              tile: movedTile,
            }),
          lastResult: each(
            DominoPlaying._lastResult({ game }).is({ matchNumber: resultMatch, winner, team, points, prize, special, bonus, ending }),
          ).form({ matchNumber: resultMatch, winner, team, points, prize, special, bonus, ending }),
          results: each(
            DominoPlaying._results({ game }).is({
              matchNumber: pastMatch,
              winner: pastWinner,
              team: pastTeam,
              points: pastPoints,
              special: pastSpecial,
              ending: pastEnding,
            }),
          ).form({ matchNumber: pastMatch, winner: pastWinner, team: pastTeam, points: pastPoints, special: pastSpecial, ending: pastEnding }),
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
  AbandonGameWhenTableCloses,
};
