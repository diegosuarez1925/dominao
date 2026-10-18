import type { Collection, Db } from "mongodb";

export class InvalidName extends Error {}
export class UnknownSession extends Error {}

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

  async start({ displayName }: { displayName: string }) {
    const name = displayName.trim();
    if (name.length < 1 || name.length > 20) {
      throw new InvalidName("A display name must be 1 to 20 characters long.");
    }
    await this.#ensureIndex();
    const session = crypto.randomUUID();
    // Two UUIDs give 244 random bits, far too many to guess.
    const token = (crypto.randomUUID() + crypto.randomUUID()).replaceAll("-", "");
    await this.sessions.insertOne({ _id: session, token, displayName: name, lastSeen: this.clock() });
    return { session, token };
  }

  async resume({ token }: { token: string }) {
    const now = this.clock();
    const found = await this.sessions.findOne({ token });
    if (found === null) throw new UnknownSession("This guest session is not active.");
    if (found.lastSeen.getTime() + INACTIVITY_LIMIT_MS < now.getTime()) {
      await this.sessions.deleteOne({ _id: found._id });
      throw new UnknownSession("This guest session is not active.");
    }
    await this.sessions.updateOne({ _id: found._id }, { $set: { lastSeen: now } });
    return { session: found._id, displayName: found.displayName };
  }

  async end({ token }: { token: string }) {
    const found = await this.sessions.findOneAndDelete({ token });
    if (found === null) throw new UnknownSession("This guest session is not active.");
    return { session: found._id };
  }

  async _getName({ session }: { session: string }) {
    const found = await this.sessions.findOne({ _id: session });
    return found === null ? [] : [{ displayName: found.displayName }];
  }

  async #ensureIndex() {
    if (this.indexed) return;
    await this.sessions.createIndex({ token: 1 }, { unique: true });
    this.indexed = true;
  }
}
