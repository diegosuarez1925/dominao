import { MongoServerError, type Collection, type Db } from "mongodb";

export class TokenInUse extends Error {}
export class UnknownSession extends Error {}
export class NotIdle extends Error {}
export class InvalidLifetime extends Error {}

interface Session {
  _id: string;
  token: string;
  player: string;
  /** How long the session may go unused before it ends. */
  lifetimeMs: number;
  startedAt: Date;
  lastSeen: Date;
}

export class SessioningConcept {
  private readonly sessions: Collection<Session>;
  private indexed = false;

  constructor(
    db: Db,
    private readonly clock: () => Date = () => new Date(),
  ) {
    this.sessions = db.collection<Session>("sessioning.sessions");
  }

  async start({ player, token, lifetime }: { player: string; token: string; lifetime: number }) {
    if (!Number.isFinite(lifetime) || lifetime <= 0) throw new InvalidLifetime("A session must last for some time.");
    await this.#ensureIndexes();
    // The token's secrecy is the caller's job; this concept only keeps it unique.
    const session = crypto.randomUUID();
    const now = this.clock();
    try {
      await this.sessions.insertOne({ _id: session, token, player, lifetimeMs: lifetime, startedAt: now, lastSeen: now });
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new TokenInUse("That token already belongs to another session.");
      }
      throw error;
    }
    return { session };
  }

  async resume({ token }: { token: string }) {
    const now = this.clock();
    // A session past its lifetime stays until expire ends it, so the app can clean up after it.
    const found = await this.sessions.findOneAndUpdate(
      { token, $expr: { $gte: ["$lastSeen", { $subtract: [now, "$lifetimeMs"] }] } },
      { $set: { lastSeen: now } },
    );
    if (found === null) throw new UnknownSession("This session is not active.");
    return { session: found._id, player: found.player };
  }

  async end({ token }: { token: string }) {
    const found = await this.sessions.findOneAndDelete({ token });
    if (found === null) throw new UnknownSession("This session is not active.");
    return { session: found._id, player: found.player };
  }

  /** Ends a session nobody has used for longer than its lifetime. */
  async expire({ session }: { session: string }) {
    const found = await this.sessions.findOneAndDelete({ _id: session, ...this.#idleFilter(this.clock()) });
    if (found !== null) return { session, player: found.player, token: found.token };
    if (await this.sessions.findOne({ _id: session })) throw new NotIdle("That session is still in use.");
    throw new UnknownSession("This session is not active.");
  }

  async _idle() {
    const found = await this.sessions.find(this.#idleFilter(this.clock())).sort({ lastSeen: 1, _id: 1 }).toArray();
    return found.map(({ _id, player }) => ({ session: _id, player }));
  }

  /** How long since any of the player's sessions was last used: how long they have been away. */
  async _idleFor({ player }: { player: string }) {
    const latest = await this.sessions.find({ player }).sort({ lastSeen: -1 }).limit(1).next();
    return latest === null ? [] : [{ idleMs: this.clock().getTime() - latest.lastSeen.getTime() }];
  }

  /** The tokens of every session the player has, so the app can end them. */
  async _tokens({ player }: { player: string }) {
    const found = await this.sessions.find({ player }).sort({ startedAt: 1, _id: 1 }).toArray();
    return found.map(({ token }) => ({ token }));
  }

  #idleFilter(now: Date) {
    return { $expr: { $lt: ["$lastSeen", { $subtract: [now, "$lifetimeMs"] }] } };
  }

  async #ensureIndexes() {
    if (this.indexed) return;
    await this.sessions.createIndex({ token: 1 }, { unique: true });
    await this.sessions.createIndex({ player: 1, lastSeen: -1 });
    this.indexed = true;
  }
}
