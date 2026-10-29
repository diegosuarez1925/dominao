/**
 * Statistics, for accounts only: after every move, a match that just ended is counted
 * for each account seated at it, and so is a game that just finished. Guests and bots
 * keep no record, since they are forgotten.
 *
 * Tallying knows nothing about dominoes or accounts; DominoPlaying tells this module
 * how the latest match and the game came out, and this module decides who is counted.
 * A move that ends nothing finds the latest match already counted, so nothing happens.
 */
import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { each, form, former, no, reaction, when, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";
import { strings } from "./validators.ts";

const { DominoPlaying, PasswordAuthenticating, Sessioning, Tallying } = concepts;

/** An account's record for each rule set it played, and all of them added up. */
const StatsView = former(
  "the statistics of (me)",
  (
    { me },
    {
      rules,
      matchesWon,
      matchesLost,
      matchesPlayed,
      matchWinrate,
      gamesWon,
      gamesLost,
      gamesPlayed,
      gameWinrate,
      bestMatchPoints,
      allMatchesWon,
      allMatchesLost,
      allMatchesPlayed,
      allMatchWinrate,
      allGamesWon,
      allGamesLost,
      allGamesPlayed,
      allGameWinrate,
    },
  ) =>
    form({
      records: each(
        Tallying._records({ player: me }).is({
          rules,
          matchesWon,
          matchesLost,
          matchesPlayed,
          matchWinrate,
          gamesWon,
          gamesLost,
          gamesPlayed,
          gameWinrate,
          bestMatchPoints,
        }),
      ).form({
        rules,
        matchesWon,
        matchesLost,
        matchesPlayed,
        matchWinrate,
        gamesWon,
        gamesLost,
        gamesPlayed,
        gameWinrate,
        bestMatchPoints,
      }),
      overall: each(
        Tallying._overall({ player: me }).is({
          matchesWon: allMatchesWon,
          matchesLost: allMatchesLost,
          matchesPlayed: allMatchesPlayed,
          matchWinrate: allMatchWinrate,
          gamesWon: allGamesWon,
          gamesLost: allGamesLost,
          gamesPlayed: allGamesPlayed,
          gameWinrate: allGameWinrate,
        }),
      ).form({
        matchesWon: allMatchesWon,
        matchesLost: allMatchesLost,
        matchesPlayed: allMatchesPlayed,
        matchWinrate: allMatchWinrate,
        gamesWon: allGamesWon,
        gamesLost: allGamesLost,
        gamesPlayed: allGamesPlayed,
        gameWinrate: allGameWinrate,
      }),
    }),
);

/** Statistics are for accounts; a guest is answered NOT_AN_ACCOUNT. */
const ShowStats = endpoint(
  "/stats/view",
  ({ token, me }) =>
    receive({ token })
      .then(Sessioning.resume({ token }).responds({ player: me }))
      .then(
        where(PasswordAuthenticating._username({ user: me }))
          .then(respond({ stats: StatsView({ me }) }))
          .named("account"),
        where(no(PasswordAuthenticating._username({ user: me })))
          .then(respond({ error: "NOT_AN_ACCOUNT" }))
          .named("guest"),
      ),
  { input: { required: ["token"] }, validators: { input: strings("token") } },
);

// A person's move, or one made for a bot or a player out of time, can end a match and
// the game. Either way, each account seated at it is counted once.
const TallyMatchAfterPlay = reaction(({ game, player, rules, matchNumber, won, points }) =>
  when(DominoPlaying.play({}).responds({ game }))
    .where(
      DominoPlaying._matchOutcomes({ game }).is({ player, rules, matchNumber, won, points }),
      PasswordAuthenticating._username({ user: player }),
      Tallying._matchCounted({ player, game, match: matchNumber }).is({ counted: false }),
    )
    .then(Tallying.recordMatch({ player, rules, game, match: matchNumber, won, points })),
);

const TallyMatchAfterAutoplay = reaction(({ game, player, rules, matchNumber, won, points }) =>
  when(DominoPlaying.autoplay({}).responds({ game }))
    .where(
      DominoPlaying._matchOutcomes({ game }).is({ player, rules, matchNumber, won, points }),
      PasswordAuthenticating._username({ user: player }),
      Tallying._matchCounted({ player, game, match: matchNumber }).is({ counted: false }),
    )
    .then(Tallying.recordMatch({ player, rules, game, match: matchNumber, won, points })),
);

const TallyGameAfterPlay = reaction(({ game, player, rules, won }) =>
  when(DominoPlaying.play({}).responds({ game }))
    .where(
      DominoPlaying._gameOutcomes({ game }).is({ player, rules, won }),
      PasswordAuthenticating._username({ user: player }),
      Tallying._gameCounted({ player, game }).is({ counted: false }),
    )
    .then(Tallying.recordGame({ player, rules, game, won })),
);

const TallyGameAfterAutoplay = reaction(({ game, player, rules, won }) =>
  when(DominoPlaying.autoplay({}).responds({ game }))
    .where(
      DominoPlaying._gameOutcomes({ game }).is({ player, rules, won }),
      PasswordAuthenticating._username({ user: player }),
      Tallying._gameCounted({ player, game }).is({ counted: false }),
    )
    .then(Tallying.recordGame({ player, rules, game, won })),
);

// A deleted account leaves no statistics behind.
const ForgetStatsOfDeletedAccount = reaction(({ user }) =>
  when(PasswordAuthenticating.unregister({}).responds({ user })).then(Tallying.forget({ player: user })),
);

export const composition = {
  StatsView,
  ShowStats,
  TallyMatchAfterPlay,
  TallyMatchAfterAutoplay,
  TallyGameAfterPlay,
  TallyGameAfterAutoplay,
  ForgetStatsOfDeletedAccount,
};
