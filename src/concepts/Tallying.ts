import { MongoServerError, type Collection, type Db } from "mongodb";

export class AlreadyCounted extends Error {}

interface Record {
  _id: string;
  player: string;
  rules: string;
  matchesWon: number;
  matchesLost: number;
  gamesWon: number;
  gamesLost: number;
  bestMatchPoints: number;
}

interface Counted {
  /** The player, the game and the match (or "game" for the whole game) together. */
  _id: string;
  player: string;
  game: string;
}

function isDuplicate(error: unknown): boolean {
  return error instanceof MongoServerError && error.code === 11000;
}

/** The share won as a whole percentage, 0 when nothing was played. */
const winrate = (won: number, played: number) => (played === 0 ? 0 : Math.round((won * 100) / played));

const recordId = (player: string, rules: string) => `${player}\u0000${rules}`;
const matchId = (player: string, game: string, match: number) => `${player}\u0000${game}\u0000${match}`;
const gameId = (player: string, game: string) => `${player}\u0000${game}\u0000game`;

export class TallyingConcept {
  private readonly records: Collection<Record>;
  private readonly counted: Collection<Counted>;

  constructor(db: Db) {
    this.records = db.collection<Record>("tallying.records");
    this.counted = db.collection<Counted>("tallying.counted");
  }

  async recordMatch({
    player,
    rules,
    game,
    match,
    won,
    points,
  }: {
    player: string;
    rules: string;
    game: string;
    match: number;
    won: boolean;
    points: number;
  }) {
    await this.#count(matchId(player, game, match), player, game);
    await this.records.updateOne(
      { _id: recordId(player, rules) },
      {
        $setOnInsert: { player, rules, gamesWon: 0, gamesLost: 0 },
        $inc: { matchesWon: won ? 1 : 0, matchesLost: won ? 0 : 1 },
        $max: { bestMatchPoints: won ? points : 0 },
      },
      { upsert: true },
    );
    return { player };
  }

  async recordGame({ player, rules, game, won }: { player: string; rules: string; game: string; won: boolean }) {
    await this.#count(gameId(player, game), player, game);
    await this.records.updateOne(
      { _id: recordId(player, rules) },
      {
        $setOnInsert: { player, rules, matchesWon: 0, matchesLost: 0, bestMatchPoints: 0 },
        $inc: { gamesWon: won ? 1 : 0, gamesLost: won ? 0 : 1 },
      },
      { upsert: true },
    );
    return { player };
  }

  async forget({ player }: { player: string }) {
    await this.records.deleteMany({ player });
    await this.counted.deleteMany({ player });
    return { player };
  }

  async _records({ player }: { player: string }) {
    const rows = await this.records.find({ player }).sort({ rules: 1 }).toArray();
    return rows.map((row) => ({
      rules: row.rules,
      matchesWon: row.matchesWon,
      matchesLost: row.matchesLost,
      matchesPlayed: row.matchesWon + row.matchesLost,
      matchWinrate: winrate(row.matchesWon, row.matchesWon + row.matchesLost),
      gamesWon: row.gamesWon,
      gamesLost: row.gamesLost,
      gamesPlayed: row.gamesWon + row.gamesLost,
      gameWinrate: winrate(row.gamesWon, row.gamesWon + row.gamesLost),
      bestMatchPoints: row.bestMatchPoints,
    }));
  }

  async _overall({ player }: { player: string }) {
    const rows = await this.records.find({ player }).toArray();
    const sum = (field: "matchesWon" | "matchesLost" | "gamesWon" | "gamesLost") => rows.reduce((total, row) => total + row[field], 0);
    const [matchesWon, matchesLost, gamesWon, gamesLost] = [sum("matchesWon"), sum("matchesLost"), sum("gamesWon"), sum("gamesLost")];
    return {
      matchesWon,
      matchesLost,
      matchesPlayed: matchesWon + matchesLost,
      matchWinrate: winrate(matchesWon, matchesWon + matchesLost),
      gamesWon,
      gamesLost,
      gamesPlayed: gamesWon + gamesLost,
      gameWinrate: winrate(gamesWon, gamesWon + gamesLost),
    };
  }

  async _matchCounted({ player, game, match }: { player: string; game: string; match: number }) {
    return { counted: (await this.counted.findOne({ _id: matchId(player, game, match) })) !== null };
  }

  async _gameCounted({ player, game }: { player: string; game: string }) {
    return { counted: (await this.counted.findOne({ _id: gameId(player, game) })) !== null };
  }

  /** Remembers something as counted, or refuses if it already was (the id makes it once only). */
  async #count(_id: string, player: string, game: string) {
    try {
      await this.counted.insertOne({ _id, player, game });
    } catch (error) {
      if (isDuplicate(error)) throw new AlreadyCounted("That was already counted.");
      throw error;
    }
  }
}
