/**
 * Keeping a game going when someone gets up: the game pauses, and the empty seat
 * (with its hand) waits for a person to sit down; after a while a bot takes it, and a
 * person who sits down later takes over from the bot.
 *
 * Table seats only people, and a table seat is free exactly when that seat in the
 * game is empty or held by a bot. Table hands out the lowest free seat, so whoever
 * joins a table in the middle of a game lands on a seat that needs them, and table
 * positions stay the game's positions.
 *
 * The last three endpoints are asked by the server's own ticker. Each checks the time
 * that has passed itself, so anyone asking early (or asking at all) changes nothing.
 */
import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { is, no, reaction, when, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";
import { ABSENT_MS, BOT_AFTER_MS, BOT_MOVE_MS } from "../timing.ts";
import { seats, strings } from "./validators.ts";

const { Botting, DominoPlaying, Sessioning, Table } = concepts;

// A player who gets up mid-game leaves their seat empty, which pauses the game.
const VacateSeatWhenPlayerLeaves = reaction(({ table, player, game }) =>
  when(Table.leave({ player }).responds({ table }))
    .where(DominoPlaying._activeAt({ place: table }).is({ game }))
    .then(DominoPlaying.vacate({ game, player })),
);

// Whoever sits down at a table while its game waits takes the empty seat, hand and all.
const TakeEmptySeat = reaction(({ table, player, position, game }) =>
  when(Table.join({ table, player }).responds({ position }))
    .where(DominoPlaying._activeAt({ place: table }).is({ game }), DominoPlaying._vacancies({ game }).is({ position }))
    .then(DominoPlaying.seat({ game, position, player })),
);

// Or, if a bot holds that seat, takes it over from the bot.
const ReplaceBotWithJoiner = reaction(({ table, player, position, game, bot }) =>
  when(Table.join({ table, player }).responds({ position }))
    .where(
      DominoPlaying._activeAt({ place: table }).is({ game }),
      DominoPlaying._players({ game }).is({ position, player: bot }),
      Botting._name({ bot }),
    )
    .then(DominoPlaying.vacate({ game, player: bot }))
    .then(DominoPlaying.seat({ game, position, player })),
);

/** Once a seat has waited long enough for a person, a new bot sits down in it. */
const SeatBot = endpoint(
  "/games/seat-bot",
  ({ game, position, vacantMs, bot }) =>
    receive({ game, position }).then(
      where(DominoPlaying._vacancies({ game }).is({ position, vacantMs }), is.ge(vacantMs, BOT_AFTER_MS))
        .then(Botting.create({}).responds({ bot }))
        .then(DominoPlaying.seat({ game, position, player: bot }))
        .then(respond({ game, bot }))
        .named("waited-long-enough"),
      where(DominoPlaying._vacancies({ game }).is({ position, vacantMs }), is.lt(vacantMs, BOT_AFTER_MS))
        .then(respond({ error: "TOO_SOON" }))
        .named("still-waiting"),
      where(no(DominoPlaying._vacancies({ game }).is({ position })))
        .then(respond({ error: "SEAT_TAKEN" }))
        .named("not-empty"),
    ),
  { input: { required: ["game", "position"] }, validators: { input: seats(["position"], strings("game")) } },
);

/** When it is a bot's turn, and it has "thought" for a moment, it plays one of its legal moves. */
const BotMove = endpoint(
  "/games/bot-move",
  ({ game, player, waitingMs }) =>
    receive({ game }).then(
      where(DominoPlaying._turn({ game }).is({ player, waitingMs }), Botting._name({ bot: player }), is.ge(waitingMs, BOT_MOVE_MS))
        .then(DominoPlaying.autoplay({ game, player }))
        .then(respond({ game }))
        .named("bot-ready"),
      where(DominoPlaying._turn({ game }).is({ player, waitingMs }), Botting._name({ bot: player }), is.lt(waitingMs, BOT_MOVE_MS))
        .then(respond({ error: "TOO_SOON" }))
        .named("bot-thinking"),
      where(DominoPlaying._turn({ game }).is({ player }), no(Botting._name({ bot: player })))
        .then(respond({ error: "NOT_A_BOT" }))
        .named("person-to-play"),
      where(no(DominoPlaying._turn({ game })))
        .then(respond({ error: "GAME_NOT_ACTIVE" }))
        .named("not-being-played"),
    ),
  { input: { required: ["game"] }, validators: { input: strings("game") } },
);

/**
 * A guest whose page has not checked in for a while (closed, or offline) is taken out
 * of their game the way leaving would, so the others are not stuck waiting on them.
 */
const DropAbsentPlayer = endpoint(
  "/games/drop-absent",
  ({ game, player, idleMs, table }) =>
    receive({ game, player }).then(
      where(
        DominoPlaying._players({ game }).is({ player }),
        Sessioning._idleFor({ player }).is({ idleMs }),
        is.ge(idleMs, ABSENT_MS),
        Table._tableOf({ player }).is({ table }),
      )
        .then(Table.leave({ table, player }))
        .then(respond({ table }))
        .named("absent"),
      where(Sessioning._idleFor({ player }).is({ idleMs }), is.lt(idleMs, ABSENT_MS))
        .then(respond({ error: "STILL_HERE" }))
        .named("present"),
      where(Sessioning._idleFor({ player }).is({ idleMs }), is.ge(idleMs, ABSENT_MS), no(DominoPlaying._players({ game }).is({ player })))
        .then(respond({ error: "NOT_IN_GAME" }))
        .named("not-playing"),
      where(
        DominoPlaying._players({ game }).is({ player }),
        Sessioning._idleFor({ player }).is({ idleMs }),
        is.ge(idleMs, ABSENT_MS),
        no(Table._tableOf({ player })),
      )
        .then(respond({ error: "NOT_SEATED" }))
        .named("not-seated"),
      where(no(Sessioning._idleFor({ player })))
        .then(respond({ error: "NOT_A_GUEST" }))
        .named("no-session"),
    ),
  { input: { required: ["game", "player"] }, validators: { input: strings("game", "player") } },
);

export const composition = {
  VacateSeatWhenPlayerLeaves,
  TakeEmptySeat,
  ReplaceBotWithJoiner,
  SeatBot,
  BotMove,
  DropAbsentPlayer,
};
