import type { Collection, Db } from "mongodb";

interface Look {
  _id: string;
  user: string;
  part: string;
  seenAt: Date;
}

export class SeeingConcept {
  private readonly looks: Collection<Look>;

  constructor(
    db: Db,
    private readonly clock: () => Date = () => new Date(),
  ) {
    this.looks = db.collection<Look>("seeing.looks");
  }

  async see({ user, part }: { user: string; part: string }) {
    // One look per user and part, so its id is the two together.
    await this.looks.updateOne({ _id: `${user}\u0000${part}` }, { $set: { user, part, seenAt: this.clock() } }, { upsert: true });
    return { user, part };
  }

  async forget({ user }: { user: string }) {
    await this.looks.deleteMany({ user });
    return { user };
  }

  async _seenAt({ user, part }: { user: string; part: string }) {
    const found = await this.looks.findOne({ _id: `${user}\u0000${part}` });
    return { seenAt: found?.seenAt.getTime() ?? 0 };
  }
}
