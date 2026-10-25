// Helpers for driving DominoPlaying through its own actions and queries only: a
// seeded shuffle, so a test always gets the same deals, and a simple player that
// plays a game forward until something the test is looking for happens.
import type { DominoPlayingConcept, Shuffle } from "../../src/concepts/DominoPlaying.ts";

/** A shuffle driven by a small seeded generator (mulberry32): same seed, same deals. */
export function seededShuffle(seed: number): Shuffle {
  let state = seed >>> 0;
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return <T>(items: T[]) => {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  };
}

export const numbers = (tile: string) => tile.split("-").map(Number) as [number, number];
export const pipsOf = (tiles: string[]) => tiles.reduce((sum, tile) => sum + numbers(tile)[0] + numbers(tile)[1], 0);
export const fits = (tile: string, end: number) => numbers(tile).includes(end);
export const isDouble = (tile: string) => numbers(tile)[0] === numbers(tile)[1];

/** Everything a test may want to know about the table just before a play. */
export interface Snapshot {
  matchNumber: number;
  /** Each player's hand, by player. */
  hands: Record<string, string[]>;
  /** The board's two ends, or undefined when it is empty. */
  ends?: { left: number; right: number };
  scoreA: number;
  scoreB: number;
  /** Who played first in this match. */
  starter: string;
}

/** A match that just ended, with the table as it stood before its last play. */
export interface Ending {
  before: Snapshot;
  /** The last play: who made it, and the tile and side. */
  player: string;
  tile: string;
  side: "LEFT" | "RIGHT";
  /** Every hand once the last tile left it. */
  handsAfter: Record<string, string[]>;
  result: Awaited<ReturnType<DominoPlayingConcept["_lastResult"]>>[number];
  summary: Awaited<ReturnType<DominoPlayingConcept["_summary"]>>[number];
}

export async function snapshot(dominoes: DominoPlayingConcept, game: string): Promise<Snapshot> {
  const summary = (await dominoes._summary({ game }))[0];
  const players = await dominoes._players({ game });
  const hands: Record<string, string[]> = {};
  for (const { player } of players) hands[player] = (await dominoes._hand({ game, player })).map((row) => row.tile);
  const board = await dominoes._board({ game });
  const log = await dominoes._log({ game });
  const starter = log.find((turn) => turn.matchNumber === summary.matchNumber && turn.move === "PLAYED")?.player ?? summary.turnPlayer;
  return {
    matchNumber: summary.matchNumber,
    hands,
    ends: board.length === 0 ? undefined : { left: board[0].left, right: board[board.length - 1].right },
    scoreA: summary.scoreA,
    scoreB: summary.scoreB,
    starter,
  };
}

/** The move the simple player makes: the first tile in hand that fits, on the first end it fits. */
export function choose(hand: string[], ends: Snapshot["ends"]): { tile: string; side: "LEFT" | "RIGHT" } | undefined {
  for (const tile of hand) {
    if (ends === undefined || fits(tile, ends.left)) return { tile, side: "LEFT" };
    if (fits(tile, ends.right)) return { tile, side: "RIGHT" };
  }
  return undefined;
}

/**
 * A player who plays their heaviest tiles first and saves the double blank for last,
 * playing it only when nothing else fits: the way to a chuchazo.
 */
export const saveBlank: typeof choose = (hand, ends) => {
  const heaviestFirst = [...hand].sort((a, b) => pipsOf([b]) - pipsOf([a]));
  return choose(heaviestFirst.filter((tile) => tile !== "0-0"), ends) ?? choose(heaviestFirst, ends);
};

/**
 * Plays the game forward with the simple player (or the one given) until a match ends
 * in a way `wanted` accepts, and answers that ending; answers undefined if the game
 * finishes first.
 */
export async function playUntil(
  dominoes: DominoPlayingConcept,
  game: string,
  wanted: (ending: Ending) => boolean = () => true,
  player: typeof choose = choose,
): Promise<Ending | undefined> {
  for (let plays = 0; plays < 10_000; plays++) {
    const summary = (await dominoes._summary({ game }))[0];
    if (summary.status !== "ACTIVE") return undefined;
    const before = await snapshot(dominoes, game);
    const turnPlayer = summary.turnPlayer;
    const move = player(before.hands[turnPlayer], before.ends);
    if (move === undefined) throw new Error(`${turnPlayer} was given the turn with no tile that fits`);
    const lastBefore = (await dominoes._lastResult({ game }))[0]?.matchNumber;
    await dominoes.play({ game, player: turnPlayer, ...move });
    const result = (await dominoes._lastResult({ game }))[0];
    if (result === undefined || result.matchNumber === lastBefore) continue;
    const handsAfter = { ...before.hands, [turnPlayer]: before.hands[turnPlayer].filter((t) => t !== move.tile) };
    const ending: Ending = { before, player: turnPlayer, ...move, handsAfter, result, summary: (await dominoes._summary({ game }))[0] };
    if (wanted(ending)) return ending;
  }
  throw new Error("The game did not finish");
}
