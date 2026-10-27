// DominoPlaying is tested only through its actions and queries. Deals come from a
// seeded shuffle handed to the concept, so a seed always deals the same hands, and a
// simple player (tests/support/dominoes.ts) plays forward until the case a test is
// about happens. Expected scores are worked out from the hands read through the
// concept's queries, following the rules, not copied from the code.
import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import {
  AlreadyPlaying,
  DominoPlayingConcept,
  DuplicatePlayer,
  GameInProgress,
  GameNotActive,
  GamePaused,
  IllegalPlay,
  type MoveChooser,
  NotInGame,
  NotInHand,
  NotYourTurn,
  RULESETS,
  SeatTaken,
  UnknownRules,
} from "../../src/concepts/DominoPlaying.ts";
import { openTestDb, type TestDb } from "../test-db.ts";
import {
  choose,
  type Ending,
  fits,
  isDouble,
  numbers,
  pipsOf,
  playUntil,
  saveBlank,
  seededShuffle,
  snapshot,
} from "../support/dominoes.ts";

let testDb: TestDb;
const players = { first: "abuelo", second: "papo", third: "nando", fourth: "cheo" };
const seats = [players.first, players.second, players.third, players.fourth];
/** Seats 0 and 2 are team 0 (Abuelo and Nando); seats 1 and 3 are team 1. */
const teamOf = (player: string) => seats.indexOf(player) % 2;
const partners = (a: string, b: string) => teamOf(a) === teamOf(b);

beforeAll(async () => {
  testDb = await openTestDb();
}, 120_000);

beforeEach(async () => {
  await testDb.db.dropDatabase();
});

afterAll(async () => {
  await testDb.close();
});

/** A game whose deals follow the given seed. */
async function seeded(seed: number, rules = "DEFAULT") {
  const dominoes = new DominoPlayingConcept(testDb.db, seededShuffle(seed));
  const { game } = await dominoes.start({ place: `table-${rules}-${seed}`, ...players, rules });
  return { dominoes, game };
}

/**
 * Plays seeded games, starting from `seed`, until a match ends the way `wanted`
 * accepts. The seed given is one known to get there quickly; later ones are only
 * tried if a change to the concept moved the case elsewhere.
 */
async function endingWhere(rules: string, seed: number, wanted: (ending: Ending) => boolean, player = choose) {
  for (let tried = seed; tried < seed + 300; tried++) {
    const { dominoes, game } = await seeded(tried, rules);
    const ending = await playUntil(dominoes, game, wanted, player);
    if (ending !== undefined) return { dominoes, game, ending };
  }
  throw new Error(`No ${rules} game from seed ${seed} on reached the case under test`);
}

/** The players of a match in turn order, from the one who started it. */
const fromStarter = (starter: string) => [0, 1, 2, 3].map((step) => seats[(seats.indexOf(starter) + step) % 4]);
const allPips = (hands: Record<string, string[]>) => pipsOf(Object.values(hands).flat());
const teamPips = (hands: Record<string, string[]>, team: number) =>
  pipsOf(seats.filter((player) => teamOf(player) === team).flatMap((player) => hands[player]));

/** The match result the rules call for, worked out from the hands at the end. */
function expectedResult({ before, player, tile, handsAfter }: Ending, rules: string) {
  const ruleSet = RULESETS[rules];
  const order = fromStarter(before.starter);
  let winner: string;
  let team: number;
  let points: number;
  let ending: "DOMINO" | "TRANQUE";
  let special: "CAPICU" | "CHUCHAZO" | "NONE" = "NONE";
  if (handsAfter[player].length === 0) {
    ending = "DOMINO";
    winner = player;
    team = teamOf(player);
    points = allPips(handsAfter);
    if (tile === "0-0") special = "CHUCHAZO";
    else if (!isDouble(tile) && before.ends && before.ends.left !== before.ends.right && fits(tile, before.ends.left) && fits(tile, before.ends.right)) {
      special = "CAPICU";
    }
  } else {
    ending = "TRANQUE";
    points = allPips(handsAfter);
    if (ruleSet.tranque === "TEAM") {
      const [a, b] = [teamPips(handsAfter, 0), teamPips(handsAfter, 1)];
      team = a === b ? -1 : a < b ? 0 : 1;
      winner = team === -1 ? before.starter : order.find((p) => teamOf(p) === team)!;
    } else {
      const fewest = Math.min(...order.map((p) => pipsOf(handsAfter[p])));
      const lowest = order.filter((p) => pipsOf(handsAfter[p]) === fewest);
      const tied = lowest.some((p) => !partners(p, lowest[0]));
      team = tied ? -1 : teamOf(lowest[0]);
      winner = tied ? before.starter : lowest[0];
    }
    if (team === -1) points = 0;
  }
  const prize = team === -1 ? 0 : (ruleSet.prizes[before.matchNumber - 1] ?? 0);
  const bonus = special === "NONE" ? 0 : ruleSet.bonuses[special];
  return { matchNumber: before.matchNumber, winner, team, points: points + prize + bonus, prize, special, bonus, ending };
}

/** After a match: the winning team's score went up by its points, and the winner starts the next one. */
async function expectNextMatch({ before, result, summary }: Ending, dominoes: DominoPlayingConcept, game: string) {
  expect(summary.scoreA).toBe(before.scoreA + (result.team === 0 ? result.points : 0));
  expect(summary.scoreB).toBe(before.scoreB + (result.team === 1 ? result.points : 0));
  if (summary.status === "FINISHED") return;
  expect(summary).toMatchObject({ matchNumber: before.matchNumber + 1, turnPlayer: result.winner });
  // A fresh deal and an empty board; the winner may open with any tile.
  expect(await dominoes._board({ game })).toEqual([]);
  expect((await dominoes._players({ game })).map((row) => row.tileCount)).toEqual([7, 7, 7, 7]);
}

// The principle and single plays

test("the first match opens with the double six, played by whoever holds it, and the turn passes on", async () => {
  const { dominoes, game } = await seeded(1);
  const log = await dominoes._log({ game });
  expect(log).toHaveLength(1);
  const opener = log[0].player;
  expect(log[0]).toEqual({ turn: 1, matchNumber: 1, player: opener, move: "PLAYED", tile: "6-6" });
  expect(await dominoes._board({ game })).toEqual([{ tile: "6-6", left: 6, right: 6, fromFirst: 0 }]);
  const counts = await dominoes._players({ game });
  for (const row of counts) expect(row.tileCount).toBe(row.player === opener ? 6 : 7);
  const summary = (await dominoes._summary({ game }))[0];
  expect(summary).toMatchObject({ status: "ACTIVE", rules: "DEFAULT", target: 200, matchNumber: 1, scoreA: 0, scoreB: 0 });
  expect(summary.turnPlayer).not.toBe(opener);
});

test("a tile goes on the end it matches, and its other number becomes the new end", async () => {
  const { dominoes, game } = await seeded(1);
  for (let plays = 0; plays < 6; plays++) {
    const before = await snapshot(dominoes, game);
    const player = (await dominoes._summary({ game }))[0].turnPlayer;
    const move = choose(before.hands[player], before.ends)!;
    await dominoes.play({ game, player, ...move });
    const board = await dominoes._board({ game });
    const [a, b] = numbers(move.tile);
    if (move.side === "LEFT") {
      const matched = before.ends!.left;
      expect(board[0]).toMatchObject({ left: a === matched ? b : a, right: matched });
      expect(board.at(-1)!.right).toBe(before.ends!.right);
    } else {
      const matched = before.ends!.right;
      expect(board.at(-1)).toMatchObject({ left: matched, right: a === matched ? b : a });
      expect(board[0].left).toBe(before.ends!.left);
    }
    // The tile left the player's hand, and nowhere else.
    expect((await dominoes._hand({ game, player })).map((row) => row.tile)).not.toContain(move.tile);
  }
});

test("each board tile knows how far it lies from the match's first tile", async () => {
  const { dominoes, game } = await seeded(1);
  for (let plays = 0; plays < 8; plays++) {
    const before = await snapshot(dominoes, game);
    const player = (await dominoes._summary({ game }))[0].turnPlayer;
    await dominoes.play({ game, player, ...choose(before.hands[player], before.ends)! });
  }
  const board = await dominoes._board({ game });
  const first = board.findIndex((row) => row.tile === "6-6");
  expect(board.map((row) => row.fromFirst)).toEqual(board.map((_, index) => index - first));
});

test("illegal moves are refused and change nothing", async () => {
  const { dominoes, game } = await seeded(1);
  const before = await snapshot(dominoes, game);
  const turnPlayer = (await dominoes._summary({ game }))[0].turnPlayer;
  const waiting = seats.find((p) => p !== turnPlayer)!;
  const hand = before.hands[turnPlayer];
  const misfit = hand.find((tile) => !fits(tile, 6))!;
  expect(misfit).toBeDefined();

  await expect(dominoes.play({ game, player: waiting, tile: before.hands[waiting][0], side: "LEFT" })).rejects.toThrow(NotYourTurn);
  await expect(dominoes.play({ game, player: turnPlayer, tile: "6-6", side: "LEFT" })).rejects.toThrow(NotInHand);
  await expect(dominoes.play({ game, player: turnPlayer, tile: "9-9", side: "LEFT" })).rejects.toThrow(NotInHand);
  await expect(dominoes.play({ game, player: turnPlayer, tile: misfit, side: "RIGHT" })).rejects.toThrow(IllegalPlay);
  await expect(dominoes.play({ game: "no-such-game", player: turnPlayer, tile: misfit, side: "LEFT" })).rejects.toThrow();

  expect(await snapshot(dominoes, game)).toEqual(before);
  expect(await dominoes._log({ game })).toHaveLength(1);
});

test("players who cannot play are skipped, and only they are", async () => {
  const { dominoes, game } = await seeded(1);
  let skips = 0;
  for (let plays = 0; plays < 200 && skips < 5; plays++) {
    const summary = (await dominoes._summary({ game }))[0];
    const before = await snapshot(dominoes, game);
    const player = summary.turnPlayer;
    const logBefore = (await dominoes._log({ game })).length;
    await dominoes.play({ game, player, ...choose(before.hands[player], before.ends)! });
    const after = await snapshot(dominoes, game);
    if (after.matchNumber !== before.matchNumber) continue; // The match ended; skips don't apply.
    const fresh = (await dominoes._log({ game })).sort((a, b) => a.turn - b.turn).slice(logBefore + 1);
    // Every player between this one and the next to play was skipped, in order, and
    // none of them held a tile that fits; the next player does.
    const next = (await dominoes._summary({ game }))[0].turnPlayer;
    const between = fromStarter(player).slice(1, fromStarter(player).indexOf(next));
    expect(fresh.map((row) => [row.player, row.move])).toEqual(between.map((p) => [p, "SKIPPED"]));
    for (const skipped of between) expect(choose(after.hands[skipped], after.ends)).toBeUndefined();
    expect(choose(after.hands[next], after.ends)).toBeDefined();
    skips += between.length;
  }
  expect(skips).toBeGreaterThan(0);
});

// How matches end and score

test("a domino: the team of the player who goes out scores the pips left in the other three hands, and the winner starts next", async () => {
  const { dominoes, game, ending } = await endingWhere("DEFAULT", 1, (e) => e.result.ending === "DOMINO");
  expect(ending.handsAfter[ending.player]).toEqual([]);
  expect(ending.result).toEqual({
    matchNumber: ending.before.matchNumber,
    winner: ending.player,
    team: teamOf(ending.player),
    points: allPips(ending.handsAfter),
    prize: 0,
    special: expect.any(String),
    bonus: 0,
    ending: "DOMINO",
  });
  await expectNextMatch(ending, dominoes, game);
});

test("a tranque: the team holding fewer pips scores them all, and its player earliest in turn order starts next", async () => {
  const { dominoes, game, ending } = await endingWhere("DEFAULT", 1, (e) => e.result.ending === "TRANQUE" && e.result.team !== -1);
  // Nobody could play on, and nobody went out.
  for (const hand of Object.values(ending.handsAfter)) expect(hand.length).toBeGreaterThan(0);
  const [a, b] = [teamPips(ending.handsAfter, 0), teamPips(ending.handsAfter, 1)];
  const team = a < b ? 0 : 1;
  expect(ending.result).toMatchObject({
    team,
    winner: fromStarter(ending.before.starter).find((p) => teamOf(p) === team),
    points: a + b,
    ending: "TRANQUE",
    special: "NONE",
  });
  await expectNextMatch(ending, dominoes, game);
});

test("a tied tranque scores nothing, and the same player starts again", async () => {
  const { dominoes, game, ending } = await endingWhere("DEFAULT", 3, (e) => e.result.ending === "TRANQUE" && e.result.team === -1);
  expect(teamPips(ending.handsAfter, 0)).toBe(teamPips(ending.handsAfter, 1));
  expect(ending.result).toMatchObject({ team: -1, points: 0, prize: 0, winner: ending.before.starter });
  await expectNextMatch(ending, dominoes, game);
});

test("whole games follow the rules at every match end, finish at their target, and never lose a tile, under every rule set", async () => {
  for (const [index, rules] of Object.keys(RULESETS).entries()) {
    const { dominoes, game } = await seeded(100 + index, rules);
    let matches = 0;
    let ending: Ending | undefined;
    const results: Ending["result"][] = [];
    expect(await dominoes._results({ game })).toEqual([]);
    while (
      (ending = await playUntil(dominoes, game, (e) => {
        expect(e.result).toEqual(expectedResult(e, rules));
        return true;
      }))
    ) {
      matches++;
      // Every match so far is listed, oldest first, the newest just as _lastResult tells it.
      results.push(ending.result);
      expect(await dominoes._results({ game })).toEqual(results);
      await expectNextMatch(ending, dominoes, game);
      const held = (await dominoes._players({ game })).reduce((sum, row) => sum + row.tileCount, 0);
      if (ending.summary.status === "ACTIVE") expect(held).toBe(28);
      if (ending.summary.status === "FINISHED") break;
    }
    const final = (await dominoes._summary({ game }))[0];
    expect(final).toMatchObject({ status: "FINISHED", rules, target: RULESETS[rules].target });
    // The game ended on the match that took a team to the target, and not before.
    expect(Math.max(final.scoreA, final.scoreB)).toBeGreaterThanOrEqual(RULESETS[rules].target);
    expect(Math.max(ending!.before.scoreA, ending!.before.scoreB)).toBeLessThan(RULESETS[rules].target);
    expect(matches).toBeGreaterThan(1);
    // The listed matches add up to the final score.
    const scored = (team: number) => results.filter((r) => r.team === team).reduce((sum, r) => sum + r.points, 0);
    expect([scored(0), scored(1)]).toEqual([final.scoreA, final.scoreB]);
    // A finished game takes no more plays, and no longer blocks a new one at its place.
    await expect(dominoes.play({ game, player: final.turnPlayer, tile: "0-0", side: "LEFT" })).rejects.toThrow(GameNotActive);
    await expect(dominoes.start({ place: `table-${rules}-${100 + index}`, ...players, rules })).resolves.toHaveProperty("game");
  }
}, 120_000);

test("two plays sent at once for the same turn: one counts, the other is refused", async () => {
  const { dominoes, game } = await seeded(1);
  const before = await snapshot(dominoes, game);
  const player = (await dominoes._summary({ game }))[0].turnPlayer;
  const move = choose(before.hands[player], before.ends)!;
  const results = await Promise.allSettled([dominoes.play({ game, player, ...move }), dominoes.play({ game, player, ...move })]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  const refused = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
  expect(refused.reason).toBeInstanceOf(NotYourTurn);
  // The tile was played once: it left the hand, and the log holds one play for it.
  expect((await dominoes._log({ game })).filter((row) => row.tile === move.tile)).toHaveLength(1);
  expect((await dominoes._hand({ game, player })).length).toBe(before.hands[player].length - 1);
});

// Starting and abandoning

test("one active game per place, four different players, and abandoning ends it", async () => {
  const dominoes = new DominoPlayingConcept(testDb.db, seededShuffle(1));
  await expect(dominoes.start({ place: "t", ...players, fourth: "abuelo", rules: "DEFAULT" })).rejects.toThrow(DuplicatePlayer);
  const { game } = await dominoes.start({ place: "t", ...players, rules: "DEFAULT" });
  await expect(dominoes.start({ place: "t", ...players, rules: "DEFAULT" })).rejects.toThrow(GameInProgress);
  expect(await dominoes._activeAt({ place: "t" })).toEqual([{ game }]);
  await dominoes.abandon({ game });
  expect(await dominoes._activeAt({ place: "t" })).toEqual([]);
  expect(await dominoes._latestAt({ place: "t" })).toEqual([{ game }]);
  expect((await dominoes._summary({ game }))[0].status).toBe("ABANDONED");
  await expect(dominoes.abandon({ game })).rejects.toThrow(GameNotActive);
});

// Leaving and taking over a seat

const turnOf = async (dominoes: DominoPlayingConcept, game: string) => (await dominoes._summary({ game }))[0].turnPlayer;

/** A clock tests move by hand. */
function handClock(start = Date.parse("2026-10-27T12:00:00Z")) {
  let now = start;
  return { clock: () => new Date(now), pass: (ms: number) => (now += ms) };
}

test("principle: a player who gets up pauses the game, and whoever sits down carries on with their hand", async () => {
  const { clock, pass } = handClock();
  const dominoes = new DominoPlayingConcept(testDb.db, seededShuffle(1), clock);
  const { game } = await dominoes.start({ place: "t", ...players, rules: "DEFAULT" });
  const before = await snapshot(dominoes, game);
  const turnPlayer = await turnOf(dominoes, game);

  pass(1000);
  expect(await dominoes.vacate({ game, player: "papo" })).toEqual({ game, place: "t", position: 1 });
  expect((await dominoes._summary({ game }))[0].status).toBe("PAUSED");
  expect(await dominoes._activeAt({ place: "t" })).toEqual([{ game }]);
  expect(await dominoes._gameOf({ player: "papo" })).toEqual([]);
  expect((await dominoes._players({ game }))[1]).toEqual({ position: 1, player: "", tileCount: before.hands.papo.length });
  pass(5000);
  expect(await dominoes._vacancies({ game })).toEqual([{ position: 1, player: "papo", vacantMs: 5000 }]);
  // Nobody plays while a seat is empty, not even whoever's turn it is.
  const [tile] = before.hands[turnPlayer];
  await expect(dominoes.play({ game, player: turnPlayer, tile, side: "LEFT" })).rejects.toThrow(GamePaused);
  expect(await dominoes._turn({ game })).toEqual([]);

  await dominoes.seat({ game, position: 1, player: "tio" });
  expect((await dominoes._summary({ game }))[0].status).toBe("ACTIVE");
  expect(await dominoes._vacancies({ game })).toEqual([]);
  expect(await dominoes._hand({ game, player: "tio" })).toEqual(before.hands.papo.toSorted().map((t) => ({ tile: t })));
  expect(await dominoes._gameOf({ player: "tio" })).toEqual([{ game }]);
  const log = await dominoes._log({ game });
  expect(log.slice(-2).map(({ player, move }) => ({ player, move }))).toEqual([
    { player: "papo", move: "LEFT" },
    { player: "tio", move: "SAT" },
  ]);
  // Play picks up exactly where it stopped: same turn, same board, scores untouched.
  const after = await snapshot(dominoes, game);
  expect(await turnOf(dominoes, game)).toBe(turnPlayer === "papo" ? "tio" : turnPlayer);
  expect(after.ends).toEqual(before.ends);
  expect([after.scoreA, after.scoreB]).toEqual([before.scoreA, before.scoreB]);
});

test("several seats can be empty at once; the game waits for all of them", async () => {
  const dominoes = new DominoPlayingConcept(testDb.db, seededShuffle(1));
  const { game } = await dominoes.start({ place: "t", ...players, rules: "DEFAULT" });
  await dominoes.vacate({ game, player: "papo" });
  await dominoes.vacate({ game, player: "cheo" });
  expect((await dominoes._vacancies({ game })).map((v) => v.position)).toEqual([1, 3]);
  await dominoes.seat({ game, position: 3, player: "tio" });
  expect((await dominoes._summary({ game }))[0].status).toBe("PAUSED");
  await dominoes.seat({ game, position: 1, player: "prima" });
  expect((await dominoes._summary({ game }))[0].status).toBe("ACTIVE");
});

test("vacate and seat refuse what does not make sense", async () => {
  const dominoes = new DominoPlayingConcept(testDb.db, seededShuffle(1));
  const { game } = await dominoes.start({ place: "t", ...players, rules: "DEFAULT" });
  await expect(dominoes.vacate({ game: "nope", player: "papo" })).rejects.toThrow();
  await expect(dominoes.vacate({ game, player: "stranger" })).rejects.toThrow(NotInGame);
  await expect(dominoes.seat({ game, position: 2, player: "tio" })).rejects.toThrow(SeatTaken);
  await dominoes.vacate({ game, player: "papo" });
  await expect(dominoes.vacate({ game, player: "papo" })).rejects.toThrow(NotInGame);
  // Someone already playing cannot take a second seat, and a seat holds one person.
  await expect(dominoes.seat({ game, position: 1, player: "nando" })).rejects.toThrow(AlreadyPlaying);
  await dominoes.seat({ game, position: 1, player: "tio" });
  await expect(dominoes.seat({ game, position: 1, player: "prima" })).rejects.toThrow(SeatTaken);
  // A paused game can still be abandoned, and then nothing changes it.
  await dominoes.vacate({ game, player: "tio" });
  await dominoes.abandon({ game });
  await expect(dominoes.seat({ game, position: 1, player: "tio" })).rejects.toThrow(GameNotActive);
  await expect(dominoes.vacate({ game, player: "abuelo" })).rejects.toThrow(GameNotActive);
  expect(await dominoes._vacancies({ game })).toEqual([]);
});

test("a player leaving at the same moment as a play loses neither", async () => {
  const dominoes = new DominoPlayingConcept(testDb.db, seededShuffle(1));
  const { game } = await dominoes.start({ place: "t", ...players, rules: "DEFAULT" });
  const { hands, ends } = await snapshot(dominoes, game);
  const turnPlayer = await turnOf(dominoes, game);
  const tile = hands[turnPlayer].find((t) => fits(t, ends!.right))!;
  const leaver = seats.find((p) => p !== turnPlayer)!;
  const [played, left] = await Promise.allSettled([
    dominoes.play({ game, player: turnPlayer, tile, side: "RIGHT" }),
    dominoes.vacate({ game, player: leaver }),
  ]);
  expect(left.status).toBe("fulfilled");
  const log = (await dominoes._log({ game })).map((t) => t.move);
  expect(log).toContain("LEFT");
  // The play either counted, or was refused because the game had paused first.
  expect(log.includes("PLAYED") && log.filter((m) => m === "PLAYED").length === 2).toBe(played.status === "fulfilled");
});

test("autoplay makes a legal move for whoever's turn it is, as the move chooser picks", async () => {
  const offered: string[][] = [];
  // Always picks the last option offered, and records what it was offered.
  const last: MoveChooser = (options) => {
    offered.push(options.map((o) => `${o.tile}:${o.side}`));
    return options.at(-1)!;
  };
  const dominoes = new DominoPlayingConcept(testDb.db, seededShuffle(1), undefined, last);
  const { game } = await dominoes.start({ place: "t", ...players, rules: "DEFAULT" });
  const { hands, ends } = await snapshot(dominoes, game);
  const turnPlayer = await turnOf(dominoes, game);
  await expect(dominoes.autoplay({ game, player: seats.find((p) => p !== turnPlayer)! })).rejects.toThrow(NotYourTurn);
  await dominoes.autoplay({ game, player: turnPlayer });
  // Every tile that fits either end was offered, on each end it fits.
  const expected = hands[turnPlayer].flatMap((t) =>
    (["LEFT", "RIGHT"] as const).filter((side) => fits(t, side === "LEFT" ? ends!.left : ends!.right)).map((side) => `${t}:${side}`),
  );
  expect(offered[0].toSorted()).toEqual(expected.toSorted());
  const [chosenTile] = offered[0].at(-1)!.split(":");
  expect((await dominoes._log({ game })).at(-1)).toMatchObject({ player: turnPlayer, move: "PLAYED", tile: chosenTile });
});

test("a chooser that answers an illegal move gets a legal one played instead", async () => {
  const cheat: MoveChooser = () => ({ tile: "9-9", side: "LEFT" });
  const dominoes = new DominoPlayingConcept(testDb.db, seededShuffle(1), undefined, cheat);
  const { game } = await dominoes.start({ place: "t", ...players, rules: "DEFAULT" });
  const turnPlayer = await turnOf(dominoes, game);
  await dominoes.autoplay({ game, player: turnPlayer });
  expect((await dominoes._log({ game })).at(-1)).toMatchObject({ player: turnPlayer, move: "PLAYED" });
});

test("four seats played by autoplay alone finish a whole game by the rules", async () => {
  const dominoes = new DominoPlayingConcept(testDb.db, seededShuffle(7));
  const { game } = await dominoes.start({ place: "t", ...players, rules: "SHORT" });
  for (let moves = 0; moves < 2000; moves++) {
    const [turn] = await dominoes._turn({ game });
    if (turn === undefined) break;
    await dominoes.autoplay({ game, player: turn.player });
  }
  const [summary] = await dominoes._summary({ game });
  expect(summary.status).toBe("FINISHED");
  expect(Math.max(summary.scoreA, summary.scoreB)).toBeGreaterThanOrEqual(100);
});

test("_turn says how long the player whose turn it is has had to move", async () => {
  const { clock, pass } = handClock();
  const dominoes = new DominoPlayingConcept(testDb.db, seededShuffle(1), clock);
  const { game } = await dominoes.start({ place: "t", ...players, rules: "DEFAULT" });
  pass(2500);
  const turnPlayer = await turnOf(dominoes, game);
  expect(await dominoes._turn({ game })).toEqual([{ player: turnPlayer, waitingMs: 2500 }]);
  expect(await dominoes._running()).toEqual([{ game }]);
});

// Rule sets

test("the rule sets are listed with their targets, and a game plays to its rules' target", async () => {
  const dominoes = new DominoPlayingConcept(testDb.db, seededShuffle(1));
  expect((await dominoes._rulesets()).map(({ rules, target }) => ({ rules, target }))).toEqual([
    { rules: "DEFAULT", target: 200 },
    { rules: "LONG", target: 500 },
    { rules: "SHORT", target: 100 },
  ]);
  expect(await dominoes._ruleset({ rules: "LONG" })).toEqual([{ target: 500, description: RULESETS.LONG.description }]);
  expect(await dominoes._ruleset({ rules: "BLITZ" })).toEqual([]);
  const { game } = await dominoes.start({ place: "long-table", ...players, rules: "LONG" });
  expect((await dominoes._summary({ game }))[0]).toMatchObject({ rules: "LONG", target: 500, status: "ACTIVE" });
});

test("unknown rules are refused and no game is started", async () => {
  const dominoes = new DominoPlayingConcept(testDb.db, seededShuffle(1));
  await expect(dominoes.start({ place: "t", ...players, rules: "BLITZ" })).rejects.toThrow(UnknownRules);
  expect(await dominoes._latestAt({ place: "t" })).toEqual([]);
});

test("long games give prizes of 100, 75, 50 and 25 to the winners of the first four matches, then none", async () => {
  const { dominoes, game } = await seeded(1, "LONG");
  const prizes = [100, 75, 50, 25, 0, 0];
  for (const [index, prize] of prizes.entries()) {
    const ending = (await playUntil(dominoes, game))!;
    expect(ending.result.matchNumber).toBe(index + 1);
    // A tied match wins no prize.
    expect(ending.result.prize).toBe(ending.result.team === -1 ? 0 : prize);
    expect(ending.result.points).toBe(
      ending.result.team === -1 ? 0 : allPips(ending.handsAfter) + ending.result.prize + ending.result.bonus,
    );
    await expectNextMatch(ending, dominoes, game);
  }
});

test("long games settle a tranque by the single player holding fewest pips", async () => {
  const { dominoes, game, ending } = await endingWhere("LONG", 1, (e) => {
    if (e.result.ending !== "TRANQUE") return false;
    const counts = seats.map((p) => pipsOf(e.handsAfter[p]));
    return counts.filter((c) => c === Math.min(...counts)).length === 1;
  });
  const lowest = seats.reduce((a, b) => (pipsOf(ending.handsAfter[a]) <= pipsOf(ending.handsAfter[b]) ? a : b));
  expect(ending.result).toMatchObject({
    winner: lowest,
    team: teamOf(lowest),
    points: allPips(ending.handsAfter) + ending.result.prize,
    ending: "TRANQUE",
  });
  await expectNextMatch(ending, dominoes, game);
});

test("in a long game, opponents tied for fewest pips tie the tranque: no points and no prize", async () => {
  const { dominoes, game, ending } = await endingWhere("LONG", 2, (e) => {
    if (e.result.ending !== "TRANQUE") return false;
    const fewest = Math.min(...seats.map((p) => pipsOf(e.handsAfter[p])));
    const lowest = seats.filter((p) => pipsOf(e.handsAfter[p]) === fewest);
    return lowest.some((p) => !partners(p, lowest[0]));
  });
  expect(ending.result).toMatchObject({ team: -1, points: 0, prize: 0, winner: ending.before.starter });
  await expectNextMatch(ending, dominoes, game);
});

test("in a long game, partners tied for fewest pips win the tranque, and the earlier of them starts", async () => {
  const { dominoes, game, ending } = await endingWhere("LONG", 11, (e) => {
    if (e.result.ending !== "TRANQUE") return false;
    const fewest = Math.min(...seats.map((p) => pipsOf(e.handsAfter[p])));
    const lowest = seats.filter((p) => pipsOf(e.handsAfter[p]) === fewest);
    return lowest.length === 2 && partners(lowest[0], lowest[1]);
  });
  const fewest = Math.min(...seats.map((p) => pipsOf(ending.handsAfter[p])));
  const earlier = fromStarter(ending.before.starter).find((p) => pipsOf(ending.handsAfter[p]) === fewest)!;
  expect(ending.result).toMatchObject({ winner: earlier, team: teamOf(earlier), points: allPips(ending.handsAfter) + ending.result.prize });
  await expectNextMatch(ending, dominoes, game);
});

// Capicú and Chuchazo

/**
 * A domino whose last tile is not a double and fit both ends as they stood before it;
 * with `sameEnds`, both ends showed the same number (3-5 on ends 3 and 3).
 */
const fitsBoth = (e: Ending, sameEnds: boolean) =>
  e.result.ending === "DOMINO" &&
  !isDouble(e.tile) &&
  e.before.ends !== undefined &&
  fits(e.tile, e.before.ends.left) &&
  fits(e.tile, e.before.ends.right) &&
  (e.before.ends.left === e.before.ends.right) === sameEnds;

test("a capicú: the last tile could go on either end; long games pay 100 for it", async () => {
  const { ending } = await endingWhere("LONG", 1, (e) => fitsBoth(e, false));
  expect(ending.result).toMatchObject({
    special: "CAPICU",
    bonus: 100,
    points: allPips(ending.handsAfter) + ending.result.prize + 100,
  });
});

test("a capicú is recorded under other rules too, but pays nothing extra", async () => {
  const { ending } = await endingWhere("DEFAULT", 1, (e) => fitsBoth(e, false));
  expect(ending.result).toMatchObject({ special: "CAPICU", bonus: 0, points: allPips(ending.handsAfter) });
});

test("ends showing the same number make no capicú: 3-5 on ends 3 and 3 is a plain domino", async () => {
  const { ending } = await endingWhere("DEFAULT", 9, (e) => fitsBoth(e, true));
  expect(ending.result).toMatchObject({ special: "NONE", bonus: 0, points: allPips(ending.handsAfter) + ending.result.prize });
});

test("a last double is never a capicú, even when it fits both ends", async () => {
  const { ending } = await endingWhere(
    "LONG",
    11,
    (e) => e.result.ending === "DOMINO" && isDouble(e.tile) && e.tile !== "0-0" && e.before.ends?.left === e.before.ends?.right,
  );
  expect(ending.result).toMatchObject({ special: "NONE", bonus: 0, points: allPips(ending.handsAfter) + ending.result.prize });
});

test("a last tile that fits one end only is a plain domino", async () => {
  const { ending } = await endingWhere(
    "LONG",
    1,
    (e) => e.result.ending === "DOMINO" && !isDouble(e.tile) && !fitsBoth(e, false) && !fitsBoth(e, true),
  );
  expect(ending.result).toMatchObject({ special: "NONE", bonus: 0 });
});

test("a chuchazo: winning with the double blank; long games pay 100 for it", async () => {
  // The simple player rarely keeps the double blank to the end, so these players save it.
  const { ending } = await endingWhere("LONG", 1, (e) => e.result.ending === "DOMINO" && e.tile === "0-0", saveBlank);
  expect(ending.result).toMatchObject({
    special: "CHUCHAZO",
    bonus: 100,
    points: allPips(ending.handsAfter) + ending.result.prize + 100,
  });
});
