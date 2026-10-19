import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import {
  DominoPlayingConcept,
  DuplicatePlayer,
  GameInProgress,
  GameNotActive,
  IllegalPlay,
  NotInHand,
  NotYourTurn,
  TARGET_SCORE,
} from "../../src/concepts/DominoPlaying.ts";
import { openTestDb, type TestDb } from "../test-db.ts";

let testDb: TestDb;
let dominoes: DominoPlayingConcept;
const players = { first: "abuelo", second: "papo", third: "nando", fourth: "cheo" };
const seats = [players.first, players.second, players.third, players.fourth];

// Without a shuffle the tiles are dealt in set order: 0-0 … 0-6 to the first player,
// 1-1 … 1-6, 2-2 to the second, 2-3 … 3-5 to the third, and 3-6 … 6-6 to the fourth.
const noShuffle = <T>(items: T[]) => items;

beforeAll(async () => {
  testDb = await openTestDb();
}, 120_000);

beforeEach(async () => {
  await testDb.db.dropDatabase();
  dominoes = new DominoPlayingConcept(testDb.db, noShuffle);
});

afterAll(async () => {
  await testDb.close();
});

const games = () => testDb.db.collection("dominoPlaying.games");
const tiles = (...names: string[]) => names.map((name) => name.split("-").map(Number));

/** Starts a game, then replaces its state with the given hands, board and turn. */
async function rig(state: { hands: string[][]; board: string[]; turn: number; starter?: number; teamScores?: number[] }) {
  const { game } = await dominoes.start({ place: "table", ...players });
  await games().updateOne(
    { _id: game as never },
    {
      $set: {
        hands: state.hands.map((hand) => tiles(...hand)),
        board: tiles(...state.board),
        turn: state.turn,
        starter: state.starter ?? 0,
        teamScores: state.teamScores ?? [0, 0],
        leftCount: 0,
        log: [],
      },
    },
  );
  return game;
}

async function summary(game: string) {
  return (await dominoes._summary({ game }))[0];
}

test("the first match opens with the double six, and the turn passes on", async () => {
  const { game } = await dominoes.start({ place: "table", ...players });
  // Cheo (fourth) holds the double six with the unshuffled deal and plays it at once.
  expect(await dominoes._board({ game })).toEqual([{ tile: "6-6", left: 6, right: 6, fromFirst: 0 }]);
  expect(await dominoes._log({ game })).toEqual([{ turn: 1, matchNumber: 1, player: "cheo", move: "PLAYED", tile: "6-6" }]);
  const counts = (await dominoes._players({ game })).map((row) => row.tileCount);
  expect(counts).toEqual([7, 7, 7, 6]);
  // Abuelo (next after Cheo) holds 0-6, so it is his turn.
  expect(await summary(game)).toMatchObject({ status: "ACTIVE", matchNumber: 1, scoreA: 0, scoreB: 0, turnPlayer: "abuelo" });
  expect((await dominoes._hand({ game, player: "abuelo" })).map((row) => row.tile)).toEqual([
    "0-0", "0-1", "0-2", "0-3", "0-4", "0-5", "0-6",
  ]);
});

test("a tile goes on the end it matches, and its other number becomes the new end", async () => {
  const game = await rig({
    hands: [["2-3", "4-4"], ["3-1"], ["0-0"], ["6-6"]],
    board: ["5-1", "1-2"],
    turn: 0,
  });
  await dominoes.play({ game, player: "abuelo", tile: "3-2", side: "RIGHT" });
  const board = await dominoes._board({ game });
  expect(board.map(({ left, right }) => [left, right])).toEqual([[5, 1], [1, 2], [2, 3]]);
});

test("each board tile knows how far it lies from the match's first tile", async () => {
  const game = await rig({ hands: [["1-6", "0-0"], ["6-2", "3-3"], ["1-1", "4-4"], ["2-2", "5-5"]], board: ["6-6"], turn: 0 });
  await dominoes.play({ game, player: "abuelo", tile: "1-6", side: "LEFT" });
  await dominoes.play({ game, player: "papo", tile: "6-2", side: "RIGHT" });
  await dominoes.play({ game, player: "nando", tile: "1-1", side: "LEFT" });
  const board = await dominoes._board({ game });
  expect(board.map(({ tile, fromFirst }) => [tile, fromFirst])).toEqual([
    ["1-1", -2],
    ["1-6", -1],
    ["6-6", 0],
    ["2-6", 1],
  ]);
});

test("illegal moves are refused", async () => {
  const game = await rig({ hands: [["2-3", "4-4"], ["1-5"], ["0-0"], ["6-6"]], board: ["5-2"], turn: 0 });
  await expect(dominoes.play({ game, player: "papo", tile: "1-5", side: "LEFT" })).rejects.toThrow(NotYourTurn);
  await expect(dominoes.play({ game, player: "abuelo", tile: "6-6", side: "LEFT" })).rejects.toThrow(NotInHand);
  await expect(dominoes.play({ game, player: "abuelo", tile: "4-4", side: "LEFT" })).rejects.toThrow(IllegalPlay);
  await expect(dominoes.play({ game, player: "abuelo", tile: "2-3", side: "LEFT" })).rejects.toThrow(IllegalPlay);
  await expect(dominoes.play({ game, player: "abuelo", tile: "2-3", side: "RIGHT" })).resolves.toEqual({ game });
});

test("players who cannot play are skipped automatically", async () => {
  // The board is 5-3, so its ends are 5 and 3.
  const game = await rig({
    hands: [["3-6", "0-0"], ["1-1", "2-2"], ["1-2", "4-4"], ["6-1", "5-5"]],
    board: ["5-3"],
    turn: 0,
  });
  await dominoes.play({ game, player: "abuelo", tile: "3-6", side: "RIGHT" });
  // Ends are now 5 and 6. Papo (1-1, 2-2) and Nando (1-2, 4-4) cannot play; Cheo can.
  expect((await summary(game)).turnPlayer).toBe("cheo");
  // The log shows Abuelo's play and the two skips.
  expect(await dominoes._log({ game })).toEqual([
    { turn: 1, matchNumber: 1, player: "abuelo", move: "PLAYED", tile: "3-6" },
    { turn: 2, matchNumber: 1, player: "papo", move: "SKIPPED", tile: "" },
    { turn: 3, matchNumber: 1, player: "nando", move: "SKIPPED", tile: "" },
  ]);
});

test("a domino: the player's team scores the pips left in the other three hands, and the winner starts next", async () => {
  const game = await rig({
    hands: [["1-2"], ["3-3", "0-4"], ["6-6"], ["0-1"]],
    board: ["2-5"],
    turn: 0,
  });
  await dominoes.play({ game, player: "abuelo", tile: "1-2", side: "LEFT" });
  // Points: 3+3+0+4 (papo) + 6+6 (nando) + 0+1 (cheo) = 23, for team A (abuelo and nando).
  expect(await dominoes._lastResult({ game })).toEqual([
    { matchNumber: 1, winner: "abuelo", team: 0, points: 23, ending: "DOMINO" },
  ]);
  expect(await summary(game)).toMatchObject({ matchNumber: 2, scoreA: 23, scoreB: 0, turnPlayer: "abuelo" });
  // A fresh deal, an empty board, and Abuelo may open with any tile.
  expect(await dominoes._board({ game })).toEqual([]);
  expect((await dominoes._players({ game })).map((row) => row.tileCount)).toEqual([7, 7, 7, 7]);
  await expect(dominoes.play({ game, player: "abuelo", tile: "0-3", side: "LEFT" })).resolves.toEqual({ game });
});

test("a tranque: the team with fewer pips scores everything, and its earliest player starts next", async () => {
  // Ends 4 and 4 after Papo's play, and nobody holds a 4.
  const game = await rig({
    hands: [["6-6", "5-5"], ["0-4", "1-1"], ["0-0"], ["2-3"]],
    board: ["4-1", "1-0"],
    turn: 1,
    starter: 2,
  });
  await dominoes.play({ game, player: "papo", tile: "0-4", side: "RIGHT" });
  // Team A holds 6+6+5+5 + 0+0 = 22; team B holds 1+1 + 2+3 = 7, so team B wins 29.
  // The match's turn order began with Nando (seat 2, team A), so Cheo (seat 3) is team B's earliest.
  expect(await dominoes._lastResult({ game })).toEqual([
    { matchNumber: 1, winner: "cheo", team: 1, points: 29, ending: "TRANQUE" },
  ]);
  expect(await summary(game)).toMatchObject({ matchNumber: 2, scoreA: 0, scoreB: 29, turnPlayer: "cheo" });
});

test("a tied tranque scores nothing and the same player starts again", async () => {
  const game = await rig({
    // After Papo's play: team A holds 6-6 and 1-1 (14), team B holds 5-5 and 1-3 (14).
    hands: [["6-6"], ["0-4", "5-5"], ["1-1"], ["1-3"]],
    board: ["4-1", "1-0"],
    turn: 1,
    starter: 2,
  });
  await dominoes.play({ game, player: "papo", tile: "0-4", side: "RIGHT" });
  expect(await dominoes._lastResult({ game })).toEqual([
    { matchNumber: 1, winner: "nando", team: -1, points: 0, ending: "TRANQUE" },
  ]);
  expect(await summary(game)).toMatchObject({ scoreA: 0, scoreB: 0, turnPlayer: "nando" });
});

test(`the first team to reach ${TARGET_SCORE} wins the game`, async () => {
  const game = await rig({
    hands: [["1-2"], ["3-3"], ["6-6"], ["0-1"]],
    board: ["2-5"],
    turn: 0,
    teamScores: [190, 150],
  });
  await dominoes.play({ game, player: "abuelo", tile: "1-2", side: "LEFT" });
  // 3+3 + 6+6 + 0+1 = 19 points takes team A from 190 to 209.
  expect(await summary(game)).toMatchObject({ status: "FINISHED", scoreA: 209, scoreB: 150 });
  await expect(dominoes.play({ game, player: "abuelo", tile: "0-0", side: "LEFT" })).rejects.toThrow(GameNotActive);
  // A finished game no longer blocks a new one at the same place.
  await expect(dominoes.start({ place: "table", ...players })).resolves.toHaveProperty("game");
});

test("one active game per place, four different players, and abandoning ends it", async () => {
  await expect(dominoes.start({ place: "t", ...players, fourth: "abuelo" })).rejects.toThrow(DuplicatePlayer);
  const { game } = await dominoes.start({ place: "t", ...players });
  await expect(dominoes.start({ place: "t", ...players })).rejects.toThrow(GameInProgress);
  expect(await dominoes._activeAt({ place: "t" })).toEqual([{ game }]);
  await dominoes.abandon({ game });
  expect(await dominoes._activeAt({ place: "t" })).toEqual([]);
  expect(await dominoes._latestAt({ place: "t" })).toEqual([{ game }]);
  await expect(dominoes.abandon({ game })).rejects.toThrow(GameNotActive);
});

test("whole random games always finish, never lose a tile, and never refuse a legal move", async () => {
  const random = new DominoPlayingConcept(testDb.db);
  for (let round = 0; round < 15; round++) {
    const { game } = await random.start({ place: `place-${round}`, ...players });
    for (let moves = 0; moves < 5000; moves++) {
      const state = (await random._summary({ game }))[0];
      if (state.status === "FINISHED") break;
      const board = await random._board({ game });
      const held = (await random._players({ game })).reduce((sum, row) => sum + row.tileCount, 0);
      expect(held + board.length).toBe(28);
      const hand = (await random._hand({ game, player: state.turnPlayer })).map((row) => row.tile);
      const left = board[0]?.left;
      const right = board.at(-1)?.right;
      // Play the first tile that fits anywhere: the concept guarantees the player has one.
      const choice = hand
        .flatMap((tile) => {
          const [a, b] = tile.split("-").map(Number);
          if (board.length === 0) return [{ tile, side: "LEFT" }];
          return [
            ...(a === left || b === left ? [{ tile, side: "LEFT" }] : []),
            ...(a === right || b === right ? [{ tile, side: "RIGHT" }] : []),
          ];
        })
        .at(0);
      expect(choice).toBeDefined();
      await random.play({ game, player: state.turnPlayer, ...choice! });
    }
    const final = (await random._summary({ game }))[0];
    expect(final.status).toBe("FINISHED");
    expect(Math.max(final.scoreA, final.scoreB)).toBeGreaterThanOrEqual(TARGET_SCORE);
    expect(seats).toContain(final.turnPlayer);
  }
}, 60_000);
