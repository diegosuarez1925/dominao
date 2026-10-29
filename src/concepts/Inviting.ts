import { MongoServerError, type Collection, type Db } from "mongodb";

export class SelfInvite extends Error {}
export class AlreadyInvited extends Error {}
export class NoSuchInvite extends Error {}

interface Invite {
  _id: string;
  from: string;
  to: string;
  place: string;
  sentAt: Date;
}

function isDuplicate(error: unknown): boolean {
  return error instanceof MongoServerError && error.code === 11000;
}

export class InvitingConcept {
  private readonly invites: Collection<Invite>;
  private indexed = false;

  constructor(
    db: Db,
    private readonly clock: () => Date = () => new Date(),
  ) {
    this.invites = db.collection<Invite>("inviting.invites");
  }

  async invite({ from, to, place }: { from: string; to: string; place: string }) {
    await this.#ensureIndexes();
    if (from === to) throw new SelfInvite("You can't invite yourself.");
    if (await this.invites.findOne({ to, place })) throw new AlreadyInvited("They're already invited.");
    // The unique index catches two invites sent at the same moment.
    const invite = crypto.randomUUID();
    try {
      await this.invites.insertOne({ _id: invite, from, to, place, sentAt: this.clock() });
    } catch (error) {
      if (isDuplicate(error)) throw new AlreadyInvited("They're already invited.");
      throw error;
    }
    return { invite };
  }

  async accept({ invite, to }: { invite: string; to: string }) {
    const found = await this.invites.findOneAndDelete({ _id: invite, to });
    if (found === null) throw new NoSuchInvite("That invite is no longer there.");
    return { invite, place: found.place };
  }

  async decline({ invite, to }: { invite: string; to: string }) {
    const found = await this.invites.findOneAndDelete({ _id: invite, to });
    if (found === null) throw new NoSuchInvite("That invite is no longer there.");
    return { invite, place: found.place };
  }

  async withdraw({ place }: { place: string }) {
    await this.invites.deleteMany({ place });
    return { place };
  }

  async forget({ user }: { user: string }) {
    await this.invites.deleteMany({ $or: [{ from: user }, { to: user }] });
    return { user };
  }

  async _invitesFor({ to }: { to: string }) {
    const rows = await this.invites.find({ to }).sort({ sentAt: -1 }).toArray();
    return rows.map((row) => ({ invite: row._id, from: row.from, place: row.place, sentAt: row.sentAt.getTime() }));
  }

  async _sentBy({ from }: { from: string }) {
    const rows = await this.invites.find({ from }).sort({ sentAt: 1 }).toArray();
    return rows.map((row) => ({ invite: row._id, to: row.to, place: row.place }));
  }

  async _inviteTo({ to, place }: { to: string; place: string }) {
    const found = await this.invites.findOne({ to, place });
    return found === null ? [] : [{ invite: found._id }];
  }

  async _invite({ invite }: { invite: string }) {
    const found = await this.invites.findOne({ _id: invite });
    return found === null ? [] : [{ from: found.from, to: found.to, place: found.place }];
  }

  async #ensureIndexes() {
    if (this.indexed) return;
    await this.invites.createIndex({ to: 1, place: 1 }, { unique: true });
    await this.invites.createIndex({ place: 1 });
    await this.invites.createIndex({ from: 1 });
    this.indexed = true;
  }
}
