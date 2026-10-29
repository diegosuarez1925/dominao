import { MongoServerError, type Collection, type Db } from "mongodb";

export class SelfRequest extends Error {}
export class AlreadyFriends extends Error {}
export class AlreadyRequested extends Error {}
export class RequestWaiting extends Error {}
export class NoSuchRequest extends Error {}
export class NotExpired extends Error {}

interface Request {
  _id: string;
  from: string;
  to: string;
  sentAt: Date;
}

interface Friendship {
  _id: string;
  /** The one of the pair that sorts first, so each pair is stored once. */
  first: string;
  second: string;
  /** Who sent the request the other accepted. */
  asker: string;
  since: Date;
}

/** How long a friend request waits for an answer before it runs out. */
export const REQUEST_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

function isDuplicate(error: unknown): boolean {
  return error instanceof MongoServerError && error.code === 11000;
}

const pair = (a: string, b: string) => (a < b ? { first: a, second: b } : { first: b, second: a });

export class FriendingConcept {
  private readonly requests: Collection<Request>;
  private readonly friendships: Collection<Friendship>;
  private indexed = false;

  constructor(
    db: Db,
    private readonly clock: () => Date = () => new Date(),
  ) {
    this.requests = db.collection<Request>("friending.requests");
    this.friendships = db.collection<Friendship>("friending.friendships");
  }

  /** Requests sent before this have run out. */
  #cutoff() {
    return new Date(this.clock().getTime() - REQUEST_LIFETIME_MS);
  }

  async request({ from, to }: { from: string; to: string }) {
    await this.#ensureIndexes();
    if (from === to) throw new SelfRequest("You can't send a friend request to yourself.");
    if (await this.friendships.findOne(pair(from, to))) throw new AlreadyFriends("You're already friends.");
    const live = { sentAt: { $gt: this.#cutoff() } };
    if (await this.requests.findOne({ from, to, ...live })) {
      throw new AlreadyRequested("You already sent them a friend request.");
    }
    if (await this.requests.findOne({ from: to, to: from, ...live })) {
      throw new RequestWaiting("They already sent you a friend request. Accept it instead.");
    }
    // One that ran out is cleared, so the new one can take its place.
    await this.requests.deleteOne({ from, to, sentAt: { $lte: this.#cutoff() } });
    const request = crypto.randomUUID();
    try {
      await this.requests.insertOne({ _id: request, from, to, sentAt: this.clock() });
    } catch (error) {
      if (isDuplicate(error)) throw new AlreadyRequested("You already sent them a friend request.");
      throw error;
    }
    return { request };
  }

  async accept({ request, to }: { request: string; to: string }) {
    await this.#ensureIndexes();
    const found = await this.requests.findOneAndDelete({ _id: request, to, sentAt: { $gt: this.#cutoff() } });
    if (found === null) throw new NoSuchRequest("That friend request is no longer there.");
    try {
      await this.friendships.insertOne({ _id: crypto.randomUUID(), ...pair(found.from, to), asker: found.from, since: this.clock() });
    } catch (error) {
      // Already friends (two requests crossed): nothing more to add.
      if (!isDuplicate(error)) throw error;
    }
    return { request, from: found.from, to };
  }

  async reject({ request, to }: { request: string; to: string }) {
    const found = await this.requests.findOneAndDelete({ _id: request, to, sentAt: { $gt: this.#cutoff() } });
    if (found === null) throw new NoSuchRequest("That friend request is no longer there.");
    return { request, from: found.from };
  }

  async expire({ request }: { request: string }) {
    const found = await this.requests.findOne({ _id: request });
    if (found === null) throw new NoSuchRequest("That friend request is no longer there.");
    if (found.sentAt > this.#cutoff()) throw new NotExpired("That friend request is still waiting for an answer.");
    await this.requests.deleteOne({ _id: request });
    return { request };
  }

  async forget({ user }: { user: string }) {
    await this.requests.deleteMany({ $or: [{ from: user }, { to: user }] });
    await this.friendships.deleteMany({ $or: [{ first: user }, { second: user }] });
    return { user };
  }

  async _friends({ user }: { user: string }) {
    const rows = await this.friendships.find({ $or: [{ first: user }, { second: user }] }).sort({ since: 1 }).toArray();
    return rows.map((row) => ({
      friend: row.first === user ? row.second : row.first,
      asker: row.asker,
      since: row.since.getTime(),
    }));
  }

  async _areFriends({ user, other }: { user: string; other: string }) {
    return { friends: user !== other && (await this.friendships.findOne(pair(user, other))) !== null };
  }

  async _incoming({ user }: { user: string }) {
    const rows = await this.requests.find({ to: user, sentAt: { $gt: this.#cutoff() } }).sort({ sentAt: -1 }).toArray();
    return rows.map((row) => ({ request: row._id, from: row.from, sentAt: row.sentAt.getTime() }));
  }

  async _outgoing({ user }: { user: string }) {
    const rows = await this.requests.find({ from: user, sentAt: { $gt: this.#cutoff() } }).sort({ sentAt: -1 }).toArray();
    return rows.map((row) => ({ request: row._id, to: row.to, sentAt: row.sentAt.getTime() }));
  }

  async _expired() {
    const rows = await this.requests.find({ sentAt: { $lte: this.#cutoff() } }, { projection: { _id: 1 } }).toArray();
    return rows.map(({ _id }) => ({ request: _id }));
  }

  async #ensureIndexes() {
    if (this.indexed) return;
    await this.requests.createIndex({ from: 1, to: 1 }, { unique: true });
    await this.requests.createIndex({ to: 1, sentAt: -1 });
    await this.friendships.createIndex({ first: 1, second: 1 }, { unique: true });
    await this.friendships.createIndex({ second: 1 });
    this.indexed = true;
  }
}
