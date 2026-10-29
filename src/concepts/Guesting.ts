import type { Collection, Db } from "mongodb";

export class InvalidName extends Error {}
export class NoSuchGuest extends Error {}

interface Guest {
  _id: string;
  displayName: string;
}

export class GuestingConcept {
  private readonly guests: Collection<Guest>;

  constructor(db: Db) {
    this.guests = db.collection<Guest>("guesting.guests");
  }

  async create({ displayName }: { displayName: string }) {
    const name = displayName.trim();
    if (name.length < 1 || name.length > 20) {
      throw new InvalidName("A display name must be 1 to 20 characters long.");
    }
    const guest = crypto.randomUUID();
    await this.guests.insertOne({ _id: guest, displayName: name });
    return { guest };
  }

  async forget({ guest }: { guest: string }) {
    const found = await this.guests.findOneAndDelete({ _id: guest });
    if (found === null) throw new NoSuchGuest("There is no such guest.");
    return { guest };
  }

  async _name({ guest }: { guest: string }) {
    const found = await this.guests.findOne({ _id: guest });
    return found === null ? [] : [{ displayName: found.displayName }];
  }
}
