import type { Collection, Db } from "mongodb";

export class DuplicatePlayer extends Error {}
export class GameInProgress extends Error {}
export class NoSuchGame extends Error {}
export class GameNotActive extends Error {}
export class NotYourTurn extends Error {}
export class NotInHand extends Error {}
export class IllegalPlay extends Error {}
export class UnknownRules extends Error {}
export class GamePaused extends Error {}
export class NotInGame extends Error {}
export class AlreadyPlaying extends Error {}
export class SeatTaken extends Error {}

type Status = "ACTIVE" | "PAUSED" | "FINISHED" | "ABANDONED";
type Side = "LEFT" | "RIGHT";
type Ending = "DOMINO" | "TRANQUE";
/** A turn (a tile PLAYED, or SKIPPED), or a change of who sits in a seat: LEFT or SAT. */
type Move = "PLAYED" | "SKIPPED" | "LEFT" | "SAT";
/**
 * A celebrated way to win a match by domino. CAPICU: the last tile, not a double,
 * could have been played on either end of the board. CHUCHAZO: the last tile is 0-0.
 */
type Special = "CAPICU" | "CHUCHAZO" | "NONE";

/** A tile as its two numbers, smaller first. */
type Pips = [number, number];

interface Result {
  matchNumber: number;
  winner: string;
  team: number;
  /** Everything the team scored for the match, prize included. */
  points: number;
  prize?: number;
  /** Results recorded before specials existed have neither field. */
  special?: Special;
  bonus?: number;
  ending: Ending;
}

/**
 * How a game is played. To add a rule set, add an entry here (and its name to the
 * RuleSet type in the spec); the app lists the rule sets from `_rulesets`, so the
 * page and matchmaking pick it up with no other changes.
 */
interface RuleSet {
  target: number;
  /** Who wins a tranque: the team holding fewer pips, or the team of the single player holding fewest. */
  tranque: "TEAM" | "PLAYER";
  /** Extra points for the winners of the first matches: prizes[0] for match 1, and so on. */
  prizes: number[];
  /** Extra points for winning a match with a Capicú or a Chuchazo. */
  bonuses: { CAPICU: number; CHUCHAZO: number };
  description: string;
}

export const RULESETS: Record<string, RuleSet> = {
  DEFAULT: {
    target: 200,
    tranque: "TEAM",
    prizes: [],
    bonuses: { CAPICU: 0, CHUCHAZO: 0 },
    description: "Play to 200. A tranque goes to the team whose two hands hold fewer pips.",
  },
  LONG: {
    target: 500,
    tranque: "PLAYER",
    prizes: [100, 75, 50, 25],
    bonuses: { CAPICU: 100, CHUCHAZO: 100 },
    description:
      "Play to 500. The winners of the first four matches get prizes of 100, 75, 50 and 25, and a Capicú or a Chuchazo is worth 100 more. A tranque goes to the team of the player holding the fewest pips.",
  },
  SHORT: {
    target: 100,
    tranque: "TEAM",
    prizes: [],
    bonuses: { CAPICU: 0, CHUCHAZO: 0 },
    description: "Play to 100. A tranque goes to the team whose two hands hold fewer pips.",
  },
};
const DEFAULT_RULES = "DEFAULT";

interface Turn {
  matchNumber: number;
  seat: number;
  /** Who it was: seats change hands, so the seat alone does not say. Older turns have none. */
  player?: string;
  move: Move;
  /** The tile played, or "" when the player was skipped, left or sat down. */
  tile: string;
}

/** A seat whose player left, waiting for someone to take it over. */
interface Vacancy {
  position: number;
  /** Who left it. */
  player: string;
  since: Date;
}

interface Game {
  _id: string;
  place: string;
  players: string[];
  /** Games started before rule sets existed have none and play by DEFAULT. */
  rules?: string;
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
  /** Seats nobody holds right now; the game is PAUSED while there are any. Older games have none. */
  vacancies?: Vacancy[];
  startedAt: Date;
  /** When the game last changed, so a bot can wait a moment before it moves. */
  changedAt?: Date;
  /** Bumped on every change, so two plays at the same moment cannot both apply. */
  version: number;
}

const SEATS = 4;
const HAND_SIZE = 7;

/** A move a player could make right now. */
export interface Option {
  tile: string;
  side: Side;
}

/**
 * Picks a move when the game plays for someone (a bot). It gets every legal move,
 * never an empty list, and the player's hand and the board's ends to think with.
 * Pass another one to the concept to change how bots play.
 */
export type MoveChooser = (options: Option[], seen: { hand: string[]; left?: number; right?: number }) => Option;

/** Plays any legal move, at random. */
export const randomMove: MoveChooser = (options) =>
  options[crypto.getRandomValues(new Uint32Array(1))[0] % options.length];

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

/** Whether playing this tile as the last one is a Capicú or a Chuchazo, given the board before it. */
function specialOf([a, b]: Pips, board: Pips[]): Special {
  if (a === 0 && b === 0) return "CHUCHAZO";
  const end = ends(board);
  if (end === undefined || a === b) return "NONE";
  // One number of the tile matches each end: 3-5 on ends 3 and 5 (not on 3 and 3).
  const matched = (end.left === a && end.right === b) || (end.left === b && end.right === a);
  return matched ? "CAPICU" : "NONE";
}

/** Every legal move for a hand: any tile on an empty board, otherwise each tile on each end it fits. */
function optionsFor(hand: Pips[], board: Pips[]): Option[] {
  const options: Option[] = [];
  for (const tile of hand) {
    for (const side of ["LEFT", "RIGHT"] as const) {
      if (placed(board, tile, side) !== undefined) options.push({ tile: tileName(tile), side });
      if (board.length === 0) break;
    }
  }
  return options;
}

/** Whether a game can still be played: it is being played, or paused for a missing player. */
const running = (status: Status) => status === "ACTIVE" || status === "PAUSED";

function rulesOf(game: Game): RuleSet {
  return RULESETS[game.rules ?? DEFAULT_RULES];
}

/** Seats in the match's turn order, starting with the player who started it. */
function fromStarter(game: Game): number[] {
  return [0, 1, 2, 3].map((step) => (game.starter + step) % SEATS);
}

/**
 * Team rules: the team whose two hands hold fewer pips wins, and its player earliest
 * in the match's turn order starts next. Undefined on a tie.
 */
function tranqueByTeam(game: Game): number | undefined {
  const teamPips = [0, 1].map((team) => pips(game.hands.filter((_, s) => teamOf(s) === team).flat()));
  if (teamPips[0] === teamPips[1]) return undefined;
  const team = teamPips[0] < teamPips[1] ? 0 : 1;
  return fromStarter(game).find((seat) => teamOf(seat) === team);
}

/**
 * Player rules: the player holding the fewest pips wins for their team and starts
 * next. When several hold that fewest, they win only if they are all partners (the
 * earliest of them in turn order starts); otherwise it is a tie.
 */
function tranqueByPlayer(game: Game): number | undefined {
  const order = fromStarter(game);
  const fewest = Math.min(...order.map((seat) => pips(game.hands[seat])));
  const lowest = order.filter((seat) => pips(game.hands[seat]) === fewest);
  if (new Set(lowest.map(teamOf)).size > 1) return undefined;
  return lowest[0];
}

export class DominoPlayingConcept {
  private readonly games: Collection<Game>;

  constructor(
    db: Db,
    private readonly shuffle: Shuffle = randomShuffle,
    private readonly clock: () => Date = () => new Date(),
    private readonly chooseMove: MoveChooser = randomMove,
  ) {
    this.games = db.collection<Game>("dominoPlaying.games");
  }

  async start({
    place,
    first,
    second,
    third,
    fourth,
    rules,
  }: {
    place: string;
    first: string;
    second: string;
    third: string;
    fourth: string;
    rules: string;
  }) {
    const ruleSet = RULESETS[rules];
    if (!Object.hasOwn(RULESETS, rules)) throw new UnknownRules("Those are not rules this game knows.");
    const players = [first, second, third, fourth];
    if (new Set(players).size !== SEATS) throw new DuplicatePlayer("A game needs four different players.");
    if (await this.games.findOne({ place, status: { $in: ["ACTIVE", "PAUSED"] } })) {
      throw new GameInProgress("A game is already being played there.");
    }
    const game: Game = {
      _id: crypto.randomUUID(),
      place,
      players,
      rules,
      status: "ACTIVE",
      target: ruleSet.target,
      teamScores: [0, 0],
      matchNumber: 0,
      starter: 0,
      turn: 0,
      board: [],
      leftCount: 0,
      log: [],
      hands: [],
      results: [],
      vacancies: [],
      startedAt: this.clock(),
      changedAt: this.clock(),
      version: 0,
    };
    this.#deal(game, undefined);
    await this.games.insertOne(game);
    return { game: game._id };
  }

  async play({ game, player, tile, side }: { game: string; player: string; tile: string; side: string }) {
    const found = await this.#turnOf(game, player);
    const pipsOfTile = parseTile(tile);
    const hand = found.hands[found.turn];
    const index = pipsOfTile === undefined ? -1 : hand.findIndex((t) => tileName(t) === tileName(pipsOfTile));
    if (pipsOfTile === undefined || index === -1) throw new NotInHand("That tile is not in your hand.");
    if (placed(found.board, pipsOfTile, side === "LEFT" ? "LEFT" : "RIGHT") === undefined) {
      throw new IllegalPlay("That tile does not match that end of the board.");
    }
    await this.#apply(found, pipsOfTile, side === "LEFT" ? "LEFT" : "RIGHT");
    return { game };
  }

  /** Plays for a player who cannot choose (a bot): one of their legal moves, picked by the move chooser. */
  async autoplay({ game, player }: { game: string; player: string }) {
    const found = await this.#turnOf(game, player);
    const hand = found.hands[found.turn];
    const end = ends(found.board);
    const options = optionsFor(hand, found.board);
    const chosen = this.chooseMove(options, { hand: hand.map(tileName), left: end?.left, right: end?.right });
    // A chooser that answers something illegal falls back to the first legal move.
    const move = options.find((o) => o.tile === chosen?.tile && o.side === chosen?.side) ?? options[0];
    await this.#apply(found, parseTile(move.tile)!, move.side);
    return { game };
  }

  /** A player gets up mid-game: their seat (and hand) waits for someone else, and the game pauses. */
  async vacate({ game, player }: { game: string; player: string }) {
    return this.#retrying(async () => {
      const found = await this.games.findOne({ _id: game });
      if (found === null) throw new NoSuchGame("There is no such game.");
      if (!running(found.status)) throw new GameNotActive("That game is over.");
      const position = found.players.indexOf(player);
      if (player === "" || position === -1) throw new NotInGame("That player is not playing in that game.");
      const now = this.clock();
      const players = [...found.players];
      players[position] = "";
      const log: Turn[] = [...(found.log ?? []), { matchNumber: found.matchNumber, seat: position, player, move: "LEFT", tile: "" }];
      const vacancies = [...(found.vacancies ?? []), { position, player, since: now }];
      const saved = await this.#save(found, { players, log, vacancies, status: "PAUSED", changedAt: now });
      return saved && { game, place: found.place, position };
    });
  }

  /** Someone takes over an empty seat, hand and all; once no seat is empty, play goes on. */
  async seat({ game, position, player }: { game: string; position: number; player: string }) {
    return this.#retrying(async () => {
      const found = await this.games.findOne({ _id: game });
      if (found === null) throw new NoSuchGame("There is no such game.");
      if (!running(found.status)) throw new GameNotActive("That game is over.");
      if (player === "" || found.players.includes(player)) {
        throw new AlreadyPlaying("That player is already playing in that game.");
      }
      const vacancies = found.vacancies ?? [];
      if (!vacancies.some((v) => v.position === position)) throw new SeatTaken("That seat is not empty.");
      const now = this.clock();
      const players = [...found.players];
      players[position] = player;
      const log: Turn[] = [...(found.log ?? []), { matchNumber: found.matchNumber, seat: position, player, move: "SAT", tile: "" }];
      const left = vacancies.filter((v) => v.position !== position);
      const status = left.length === 0 ? "ACTIVE" : "PAUSED";
      // The seat's turn starts now, so a bot that sits down still waits a moment before moving.
      const saved = await this.#save(found, { players, log, vacancies: left, status, changedAt: now });
      return saved && { game };
    });
  }

  async abandon({ game }: { game: string }) {
    const found = await this.games.findOne({ _id: game });
    if (found === null) throw new NoSuchGame("There is no such game.");
    const result = await this.games.updateOne(
      { _id: game, status: { $in: ["ACTIVE", "PAUSED"] } },
      { $set: { status: "ABANDONED", changedAt: this.clock() }, $inc: { version: 1 } },
    );
    if (result.modifiedCount === 0) throw new GameNotActive("That game is over.");
    return { game };
  }

  async _activeAt({ place }: { place: string }) {
    const found = await this.games.findOne({ place, status: { $in: ["ACTIVE", "PAUSED"] } });
    return found === null ? [] : [{ game: found._id }];
  }

  async _gameOf({ player }: { player: string }) {
    if (player === "") return [];
    const found = await this.games.findOne({ players: player, status: { $in: ["ACTIVE", "PAUSED"] } });
    return found === null ? [] : [{ game: found._id }];
  }

  async _running() {
    const found = await this.games.find({ status: { $in: ["ACTIVE", "PAUSED"] } }, { projection: { _id: 1 } }).toArray();
    return found.map(({ _id }) => ({ game: _id }));
  }

  async _turn({ game }: { game: string }) {
    const found = await this.games.findOne({ _id: game });
    if (found === null || found.status !== "ACTIVE") return [];
    const since = found.changedAt ?? found.startedAt;
    return [{ player: found.players[found.turn], waitingMs: this.clock().getTime() - since.getTime() }];
  }

  async _vacancies({ game }: { game: string }) {
    const found = await this.games.findOne({ _id: game });
    if (found === null || !running(found.status)) return [];
    const now = this.clock().getTime();
    return (found.vacancies ?? [])
      .toSorted((a, b) => a.position - b.position)
      .map(({ position, player, since }) => ({ position, player, vacantMs: now - since.getTime() }));
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
        rules: found.rules ?? DEFAULT_RULES,
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
    return (found.log ?? []).map(({ matchNumber, seat, player, move, tile }, index) => ({
      turn: index + 1,
      matchNumber,
      player: player ?? found.players[seat],
      move,
      tile,
    }));
  }

  async _lastResult({ game }: { game: string }) {
    const found = await this.games.findOne({ _id: game });
    const last = found?.results.at(-1);
    return last === undefined ? [] : [{ ...last, prize: last.prize ?? 0, special: last.special ?? "NONE", bonus: last.bonus ?? 0 }];
  }

  async _results({ game }: { game: string }) {
    const found = await this.games.findOne({ _id: game });
    return (found?.results ?? []).map((r) => ({ ...r, prize: r.prize ?? 0, special: r.special ?? "NONE", bonus: r.bonus ?? 0 }));
  }

  async _ruleset({ rules }: { rules: string }) {
    if (!Object.hasOwn(RULESETS, rules)) return [];
    const { target, description } = RULESETS[rules];
    return [{ target, description }];
  }

  async _rulesets() {
    return Object.entries(RULESETS).map(([rules, { target, description }]) => ({ rules, target, description }));
  }

  /** The game, if it is this player's turn in it and play can go on; refuses otherwise. */
  async #turnOf(game: string, player: string) {
    const found = await this.games.findOne({ _id: game });
    if (found === null) throw new NoSuchGame("There is no such game.");
    if (!running(found.status)) throw new GameNotActive("That game is over.");
    if (found.status === "PAUSED") throw new GamePaused("The game is paused until every seat is taken.");
    if (player === "" || found.players[found.turn] !== player) throw new NotYourTurn("It is not your turn.");
    return found;
  }

  /** Plays a tile that fits for whoever's turn it is, then scores, skips or deals as needed. */
  async #apply(found: Game, tile: Pips, side: Side) {
    const seat = found.turn;
    const toLeft = side === "LEFT" && found.board.length > 0;
    const updated: Game = {
      ...found,
      board: placed(found.board, tile, side)!,
      leftCount: (found.leftCount ?? 0) + (toLeft ? 1 : 0),
      hands: found.hands.map((h) => [...h]),
      log: [
        ...(found.log ?? []),
        { matchNumber: found.matchNumber, seat, player: found.players[seat], move: "PLAYED", tile: tileName(tile) },
      ],
      changedAt: this.clock(),
    };
    updated.hands[seat].splice(
      updated.hands[seat].findIndex((t) => tileName(t) === tileName(tile)),
      1,
    );
    this.#afterPlay(updated, seat, specialOf(tile, found.board));

    const { version } = found;
    const result = await this.games.replaceOne({ _id: found._id, version }, { ...updated, version: version + 1 });
    // Someone else changed the game since we read it (a double click, say); it is no longer this turn.
    if (result.modifiedCount === 0) throw new NotYourTurn("It is not your turn.");
  }

  /** Writes changes to a game unless it changed since it was read; answers whether it did. */
  async #save(found: Game, changes: Partial<Game>) {
    const result = await this.games.updateOne(
      { _id: found._id, version: found.version },
      { $set: changes, $inc: { version: 1 } },
    );
    return result.modifiedCount === 1;
  }

  /**
   * Runs a read-and-write until no one else changed the game in between (a play at the
   * same moment as a player leaving, say), so the change is never lost.
   */
  async #retrying<T>(attempt: () => Promise<T | false>): Promise<T> {
    for (;;) {
      const done = await attempt();
      if (done !== false) return done;
    }
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
    game.log.push({ matchNumber: game.matchNumber, seat: holder, player: game.players[holder], move: "PLAYED", tile: "6-6" });
    this.#afterPlay(game, holder);
  }

  /**
   * Ends the match if it is over, and otherwise passes the turn to the next player who
   * can play. `special` says what the tile just played would make of a domino.
   */
  #afterPlay(game: Game, seat: number, special: Special = "NONE") {
    if (game.hands[seat].length === 0) {
      const points = pips(game.hands.filter((_, other) => other !== seat).flat());
      return this.#endMatch(game, seat, teamOf(seat), points, "DOMINO", special);
    }
    const skipped: number[] = [];
    for (let candidate = next(seat), step = 0; step < SEATS; candidate = next(candidate), step++) {
      if (canPlay(game.hands[candidate], game.board)) {
        for (const passed of skipped) {
          game.log.push({ matchNumber: game.matchNumber, seat: passed, player: game.players[passed], move: "SKIPPED", tile: "" });
        }
        game.turn = candidate;
        return;
      }
      skipped.push(candidate);
    }
    // Nobody can play: a tranque. The winning team scores every pip left on the table.
    const all = pips(game.hands.flat());
    const winner = rulesOf(game).tranque === "TEAM" ? tranqueByTeam(game) : tranqueByPlayer(game);
    if (winner === undefined) return this.#endMatch(game, game.starter, -1, 0, "TRANQUE");
    this.#endMatch(game, winner, teamOf(winner), all, "TRANQUE");
  }

  #endMatch(game: Game, winner: number, team: number, points: number, ending: Ending, special: Special = "NONE") {
    // A tie wins no prize.
    const prize = team === -1 ? 0 : (rulesOf(game).prizes[game.matchNumber - 1] ?? 0);
    const bonus = special === "NONE" ? 0 : rulesOf(game).bonuses[special];
    const total = points + prize + bonus;
    if (team !== -1) game.teamScores[team] += total;
    game.results.push({
      matchNumber: game.matchNumber,
      winner: game.players[winner],
      team,
      points: total,
      prize,
      special,
      bonus,
      ending,
    });
    if (team !== -1 && game.teamScores[team] >= game.target) {
      game.status = "FINISHED";
      game.turn = winner;
      return;
    }
    this.#deal(game, winner);
  }
}
