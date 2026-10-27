import { MongoServerError, type Collection, type Db } from "mongodb";

export class InvalidName extends Error {}
export class TokenInUse extends Error {}
export class UnknownSession extends Error {}
export class NotIdle extends Error {}

interface Session {
  _id: string;
  token: string;
  displayName: string;
  lastSeen: Date;
}

// A guest who has not been seen for this long must start a new session.
export const INACTIVITY_LIMIT_MS = 12 * 60 * 60 * 1000;

export class GuestSessioningConcept {
  private readonly sessions: Collection<Session>;
  private indexed = false;

  constructor(
    db: Db,
    private readonly clock: () => Date = () => new Date(),
  ) {
    this.sessions = db.collection<Session>("guestSessioning.sessions");
  }

  async start({ displayName, token }: { displayName: string; token: string }) {
    const name = displayName.trim();
    if (name.length < 1 || name.length > 20) {
      throw new InvalidName("A display name must be 1 to 20 characters long.");
    }
    await this.#ensureIndex();
    // The token's secrecy is the caller's job; this concept only keeps it unique.
    const session = crypto.randomUUID();
    try {
      await this.sessions.insertOne({ _id: session, token, displayName: name, lastSeen: this.clock() });
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
    // An idle session stays until expire ends it, so the app can clean up after it.
    const found = await this.sessions.findOneAndUpdate(
      { token, lastSeen: { $gte: this.#idleSince(now) } },
      { $set: { lastSeen: now } },
    );
    if (found === null) throw new UnknownSession("This guest session is not active.");
    return { session: found._id, displayName: found.displayName };
  }

  async end({ token }: { token: string }) {
    const found = await this.sessions.findOneAndDelete({ token });
    if (found === null) throw new UnknownSession("This guest session is not active.");
    return { session: found._id };
  }

  /** Ends a session nobody has used for longer than the inactivity limit. */
  async expire({ session }: { session: string }) {
    const found = await this.sessions.findOneAndDelete({ _id: session, lastSeen: { $lt: this.#idleSince(this.clock()) } });
    if (found !== null) return { session, token: found.token };
    if (await this.sessions.findOne({ _id: session })) throw new NotIdle("That guest session is still in use.");
    throw new UnknownSession("This guest session is not active.");
  }

  async _idle() {
    const found = await this.sessions.find({ lastSeen: { $lt: this.#idleSince(this.clock()) } }).toArray();
    return found.map(({ _id }) => ({ session: _id }));
  }

  async _getName({ session }: { session: string }) {
    const found = await this.sessions.findOne({ _id: session });
    return found === null ? [] : [{ displayName: found.displayName }];
  }

  #idleSince(now: Date) {
    return new Date(now.getTime() - INACTIVITY_LIMIT_MS);
  }

  async #ensureIndex() {
    if (this.indexed) return;
    await this.sessions.createIndex({ token: 1 }, { unique: true });
    this.indexed = true;
  }
}
