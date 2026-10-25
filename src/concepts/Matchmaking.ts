import { MongoServerError, type Collection, type Db } from "mongodb";

export class AlreadyQueued extends Error {}
export class NotQueued extends Error {}
export class NoSuchLobby extends Error {}
export class LobbyNotFull extends Error {}
export class CountdownRunning extends Error {}

interface Entry {
  player: string;
  joinedAt: Date;
}

/** One lobby per document, so filling a seat and launching are each one atomic write. */
interface Lobby {
  _id: string;
  rules: string;
  openedAt: Date;
  fullAt?: Date;
  entries: Entry[];
}

export const LOBBY_SIZE = 4;
// How long a full lobby counts down before it can be launched.
export const COUNTDOWN_MS = 10_000;

export type Shuffle = <T>(items: T[]) => T[];

const randomShuffle: Shuffle = (items) => {
  for (let i = items.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
};

export class MatchmakingConcept {
  private readonly lobbies: Collection<Lobby>;
  private indexed = false;

  constructor(
    db: Db,
    private readonly clock: () => Date = () => new Date(),
    private readonly shuffle: Shuffle = randomShuffle,
    private readonly countdownMs: number = COUNTDOWN_MS,
  ) {
    this.lobbies = db.collection<Lobby>("matchmaking.lobbies");
  }

  async enqueue({ player, rules }: { player: string; rules: string }) {
    await this.#ensureIndex();
    if ((await this.lobbies.findOne({ "entries.player": player })) !== null) {
      throw new AlreadyQueued("That player is already waiting for a game.");
    }
    const now = this.clock();
    const entry = { player, joinedAt: now };
    try {
      // Take a seat in the earliest lobby with these rules that still has room. The
      // filter and the push are one write, so two players cannot take the last seat.
      const joined = await this.lobbies.findOneAndUpdate(
        { rules, [`entries.${LOBBY_SIZE - 1}`]: { $exists: false } },
        { $push: { entries: entry } },
        { sort: { openedAt: 1, _id: 1 }, returnDocument: "after" },
      );
      if (joined !== null) {
        if (joined.entries.length === LOBBY_SIZE) {
          await this.lobbies.updateOne({ _id: joined._id }, { $set: { fullAt: now } });
        }
        return { lobby: joined._id };
      }
      const lobby = crypto.randomUUID();
      await this.lobbies.insertOne({ _id: lobby, rules, openedAt: now, entries: [entry] });
      return { lobby };
    } catch (error) {
      // The unique index on entries.player catches the same player asking twice at once.
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new AlreadyQueued("That player is already waiting for a game.");
      }
      throw error;
    }
  }

  async cancel({ player }: { player: string }) {
    const found = await this.lobbies.findOneAndUpdate(
      { "entries.player": player },
      { $pull: { entries: { player } }, $unset: { fullAt: "" } },
      { returnDocument: "after" },
    );
    if (found === null) throw new NotQueued("That player is not waiting for a game.");
    await this.lobbies.deleteOne({ _id: found._id, entries: { $size: 0 } });
    return { lobby: found._id };
  }

  async launch({ lobby }: { lobby: string }) {
    const ready = new Date(this.clock().getTime() - this.countdownMs);
    // Only one caller can remove the lobby, however many ask at once.
    const launched = await this.lobbies.findOneAndDelete({
      _id: lobby,
      [`entries.${LOBBY_SIZE - 1}`]: { $exists: true },
      fullAt: { $lte: ready },
    });
    if (launched === null) {
      const found = await this.lobbies.findOne({ _id: lobby });
      if (found === null) throw new NoSuchLobby("There is no such lobby.");
      if (found.entries.length < LOBBY_SIZE) throw new LobbyNotFull("That lobby is still waiting for players.");
      throw new CountdownRunning("The countdown for that lobby has not finished.");
    }
    const [first, second, third, fourth] = this.shuffle(launched.entries.map((e) => e.player));
    return { first, second, third, fourth };
  }

  async _lobbyOf({ player }: { player: string }) {
    const found = await this.lobbies.findOne({ "entries.player": player });
    return found === null ? [] : [{ lobby: found._id }];
  }

  async _status({ lobby }: { lobby: string }) {
    const found = await this.lobbies.findOne({ _id: lobby });
    if (found === null) return [];
    const full = found.entries.length === LOBBY_SIZE;
    const remaining = found.fullAt === undefined ? 0 : found.fullAt.getTime() + this.countdownMs - this.clock().getTime();
    return [{ rules: found.rules, full, secondsLeft: full ? Math.max(0, Math.ceil(remaining / 1000)) : 0 }];
  }

  async _entries({ lobby }: { lobby: string }) {
    const found = await this.lobbies.findOne({ _id: lobby });
    return (found?.entries ?? []).map(({ player }) => ({ player }));
  }

  async #ensureIndex() {
    if (this.indexed) return;
    await this.lobbies.createIndex({ "entries.player": 1 }, { unique: true, sparse: true });
    await this.lobbies.createIndex({ rules: 1, openedAt: 1 });
    this.indexed = true;
  }
}
