import type { Collection, Db } from "mongodb";

export class DuplicatePlayer extends Error {}
export class GameInProgress extends Error {}
export class NoSuchGame extends Error {}
export class GameNotActive extends Error {}
export class NotYourTurn extends Error {}
export class NotInHand extends Error {}
export class IllegalPlay extends Error {}

type Status = "ACTIVE" | "FINISHED" | "ABANDONED";
type Side = "LEFT" | "RIGHT";
type Ending = "DOMINO" | "TRANQUE";
type Move = "PLAYED" | "SKIPPED";

/** A tile as its two numbers, smaller first. */
type Pips = [number, number];

interface Result {
  matchNumber: number;
  winner: string;
  team: number;
  points: number;
  ending: Ending;
}

interface Turn {
  matchNumber: number;
  seat: number;
  move: Move;
  /** The tile played, or "" when the player was skipped. */
  tile: string;
}

interface Game {
  _id: string;
  place: string;
  players: string[];
  status: Status;
  target: number;
  teamScores: [number, number];
  matchNumber: number;
  /** Seat that started the current match. */
  starter: number;
  turn: number;
  /** Played tiles from left to right, each turned so touching numbers match: [left, right]. */
  board: Pips[];
  /** How many tiles of this match went to the left of its first tile. */
  leftCount: number;
  /** Every turn of the game, oldest first. */
  log: Turn[];
  /** Each seat's hand, by seat position. */
  hands: Pips[][];
  results: Result[];
  startedAt: Date;
  /** Bumped on every change, so two plays at the same moment cannot both apply. */
  version: number;
}

export const TARGET_SCORE = 200;
const SEATS = 4;
const HAND_SIZE = 7;

/** Shuffles a list in place and returns it. Tests pass their own to get known deals. */
export type Shuffle = <T>(items: T[]) => T[];

export const randomShuffle: Shuffle = (items) => {
  for (let i = items.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
};

export function fullSet(): Pips[] {
  const tiles: Pips[] = [];
  for (let a = 0; a <= 6; a++) for (let b = a; b <= 6; b++) tiles.push([a, b]);
  return tiles;
}

const tileName = ([a, b]: Pips) => `${Math.min(a, b)}-${Math.max(a, b)}`;
const pips = (tiles: Pips[]) => tiles.reduce((sum, [a, b]) => sum + a + b, 0);
const teamOf = (seat: number) => seat % 2;
const next = (seat: number) => (seat + 1) % SEATS;

function parseTile(tile: string): Pips | undefined {
  const match = /^([0-6])-([0-6])$/.exec(tile);
  if (match === null) return undefined;
  const [a, b] = [Number(match[1]), Number(match[2])];
  return [Math.min(a, b), Math.max(a, b)];
}

function ends(board: Pips[]): { left: number; right: number } | undefined {
  return board.length === 0 ? undefined : { left: board[0][0], right: board[board.length - 1][1] };
}

function canPlay(hand: Pips[], board: Pips[]): boolean {
  const end = ends(board);
  if (end === undefined) return hand.length > 0;
  return hand.some(([a, b]) => a === end.left || b === end.left || a === end.right || b === end.right);
}

/** Puts a tile on one end of the board, turned to match, or answers undefined if it does not fit. */
function placed(board: Pips[], [a, b]: Pips, side: Side): Pips[] | undefined {
  const end = ends(board);
  if (end === undefined) return [[a, b]];
  if (side === "LEFT") {
    if (b === end.left) return [[a, b], ...board];
    if (a === end.left) return [[b, a], ...board];
  } else {
    if (a === end.right) return [...board, [a, b]];
    if (b === end.right) return [...board, [b, a]];
  }
  return undefined;
}

export class DominoPlayingConcept {
  private readonly games: Collection<Game>;

  constructor(
    db: Db,
    private readonly shuffle: Shuffle = randomShuffle,
  ) {
    this.games = db.collection<Game>("dominoPlaying.games");
  }

  async start({
    place,
    first,
    second,
    third,
    fourth,
  }: {
    place: string;
    first: string;
    second: string;
    third: string;
    fourth: string;
  }) {
    const players = [first, second, third, fourth];
    if (new Set(players).size !== SEATS) throw new DuplicatePlayer("A game needs four different players.");
    if (await this.games.findOne({ place, status: "ACTIVE" })) {
      throw new GameInProgress("A game is already being played there.");
    }
    const game: Game = {
      _id: crypto.randomUUID(),
      place,
      players,
      status: "ACTIVE",
      target: TARGET_SCORE,
      teamScores: [0, 0],
      matchNumber: 0,
      starter: 0,
      turn: 0,
      board: [],
      leftCount: 0,
      log: [],
      hands: [],
      results: [],
      startedAt: new Date(),
      version: 0,
    };
    this.#deal(game, undefined);
    await this.games.insertOne(game);
    return { game: game._id };
  }

  async play({ game, player, tile, side }: { game: string; player: string; tile: string; side: string }) {
    const found = await this.games.findOne({ _id: game });
    if (found === null) throw new NoSuchGame("There is no such game.");
    if (found.status !== "ACTIVE") throw new GameNotActive("That game is over.");
    if (found.players[found.turn] !== player) throw new NotYourTurn("It is not your turn.");
    const seat = found.turn;
    const pipsOfTile = parseTile(tile);
    const hand = found.hands[seat];
    const index = pipsOfTile === undefined ? -1 : hand.findIndex((t) => tileName(t) === tileName(pipsOfTile));
    if (pipsOfTile === undefined || index === -1) throw new NotInHand("That tile is not in your hand.");
    const board = placed(found.board, pipsOfTile, side === "LEFT" ? "LEFT" : "RIGHT");
    if (board === undefined) throw new IllegalPlay("That tile does not match that end of the board.");

    const toLeft = side === "LEFT" && found.board.length > 0;
    const updated: Game = {
      ...found,
      board,
      leftCount: (found.leftCount ?? 0) + (toLeft ? 1 : 0),
      hands: found.hands.map((h) => [...h]),
      log: [...(found.log ?? []), { matchNumber: found.matchNumber, seat, move: "PLAYED", tile: tileName(pipsOfTile) }],
    };
    updated.hands[seat].splice(index, 1);
    this.#afterPlay(updated, seat);

    const { version } = found;
    const result = await this.games.replaceOne({ _id: game, version }, { ...updated, version: version + 1 });
    // Someone else changed the game since we read it (a double click, say); it is no longer this turn.
    if (result.modifiedCount === 0) throw new NotYourTurn("It is not your turn.");
    return { game };
  }

  async abandon({ game }: { game: string }) {
    const found = await this.games.findOne({ _id: game });
    if (found === null) throw new NoSuchGame("There is no such game.");
    const result = await this.games.updateOne(
      { _id: game, status: "ACTIVE" },
      { $set: { status: "ABANDONED" }, $inc: { version: 1 } },
    );
    if (result.modifiedCount === 0) throw new GameNotActive("That game is over.");
    return { game };
  }

  async _activeAt({ place }: { place: string }) {
    const found = await this.games.findOne({ place, status: "ACTIVE" });
    return found === null ? [] : [{ game: found._id }];
  }

  async _latestAt({ place }: { place: string }) {
    const found = await this.games.find({ place }).sort({ startedAt: -1 }).limit(1).next();
    return found === null ? [] : [{ game: found._id }];
  }

  async _summary({ game }: { game: string }) {
    const found = await this.games.findOne({ _id: game });
    if (found === null) return [];
    return [
      {
        status: found.status,
        target: found.target,
        matchNumber: found.matchNumber,
        scoreA: found.teamScores[0],
        scoreB: found.teamScores[1],
        turnPlayer: found.players[found.turn],
      },
    ];
  }

  async _players({ game }: { game: string }) {
    const found = await this.games.findOne({ _id: game });
    if (found === null) return [];
    return found.players.map((player, position) => ({
      position,
      player,
      tileCount: found.hands[position].length,
    }));
  }

  async _hand({ game, player }: { game: string; player: string }) {
    const found = await this.games.findOne({ _id: game });
    const seat = found?.players.indexOf(player) ?? -1;
    if (found === null || seat === -1) return [];
    return [...found.hands[seat]]
      .sort(([a1, b1], [a2, b2]) => a1 - a2 || b1 - b2)
      .map((tile) => ({ tile: tileName(tile) }));
  }

  async _board({ game }: { game: string }) {
    const found = await this.games.findOne({ _id: game });
    if (found === null) return [];
    const first = found.leftCount ?? 0;
    return found.board.map(([left, right], index) => ({
      tile: tileName([left, right]),
      left,
      right,
      fromFirst: index - first,
    }));
  }

  async _log({ game }: { game: string }) {
    const found = await this.games.findOne({ _id: game });
    if (found === null) return [];
    return (found.log ?? []).map(({ matchNumber, seat, move, tile }, index) => ({
      turn: index + 1,
      matchNumber,
      player: found.players[seat],
      move,
      tile,
    }));
  }

  async _lastResult({ game }: { game: string }) {
    const found = await this.games.findOne({ _id: game });
    const last = found?.results.at(-1);
    return last === undefined ? [] : [last];
  }

  /** Deals a new match. The first match opens with the double six; later ones with the given starter. */
  #deal(game: Game, starter: number | undefined) {
    const tiles = this.shuffle(fullSet());
    game.matchNumber += 1;
    game.hands = [...Array(SEATS).keys()].map((seat) => tiles.slice(seat * HAND_SIZE, (seat + 1) * HAND_SIZE));
    game.board = [];
    game.leftCount = 0;
    if (starter !== undefined) {
      game.starter = starter;
      game.turn = starter;
      return;
    }
    const holder = game.hands.findIndex((hand) => hand.some(([a, b]) => a === 6 && b === 6));
    game.starter = holder;
    game.hands[holder] = game.hands[holder].filter(([a, b]) => !(a === 6 && b === 6));
    game.board = [[6, 6]];
    game.log.push({ matchNumber: game.matchNumber, seat: holder, move: "PLAYED", tile: "6-6" });
    this.#afterPlay(game, holder);
  }

  /** Ends the match if it is over, and otherwise passes the turn to the next player who can play. */
  #afterPlay(game: Game, seat: number) {
    if (game.hands[seat].length === 0) {
      const points = pips(game.hands.filter((_, other) => other !== seat).flat());
      return this.#endMatch(game, seat, teamOf(seat), points, "DOMINO");
    }
    const skipped: number[] = [];
    for (let candidate = next(seat), step = 0; step < SEATS; candidate = next(candidate), step++) {
      if (canPlay(game.hands[candidate], game.board)) {
        for (const passed of skipped) {
          game.log.push({ matchNumber: game.matchNumber, seat: passed, move: "SKIPPED", tile: "" });
        }
        game.turn = candidate;
        return;
      }
      skipped.push(candidate);
    }
    // Nobody can play: a tranque.
    const teamPips = [0, 1].map((team) => pips(game.hands.filter((_, s) => teamOf(s) === team).flat()));
    if (teamPips[0] === teamPips[1]) return this.#endMatch(game, game.starter, -1, 0, "TRANQUE");
    const team = teamPips[0] < teamPips[1] ? 0 : 1;
    const winner = teamOf(game.starter) === team ? game.starter : next(game.starter);
    this.#endMatch(game, winner, team, teamPips[0] + teamPips[1], "TRANQUE");
  }

  #endMatch(game: Game, winner: number, team: number, points: number, ending: Ending) {
    if (team !== -1) game.teamScores[team] += points;
    game.results.push({ matchNumber: game.matchNumber, winner: game.players[winner], team, points, ending });
    if (team !== -1 && game.teamScores[team] >= game.target) {
      game.status = "FINISHED";
      game.turn = winner;
      return;
    }
    this.#deal(game, winner);
  }
}
