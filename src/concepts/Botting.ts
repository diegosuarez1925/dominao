import type { Collection, Db } from "mongodb";

interface Bot {
  _id: string;
  name: string;
  createdAt: Date;
}

// Bots get everyday Puerto Rican nicknames, so a table of them still sounds like home.
const NAMES = ["Chago", "Monchi", "Tito", "Lalo", "Cuca", "Nena", "Pepo", "Toño", "Wichi", "Fela"];

export class BottingConcept {
  private readonly bots: Collection<Bot>;

  constructor(db: Db) {
    this.bots = db.collection<Bot>("botting.bots");
  }

  async create() {
    const bot = crypto.randomUUID();
    const name = `Bot ${NAMES[crypto.getRandomValues(new Uint32Array(1))[0] % NAMES.length]}`;
    await this.bots.insertOne({ _id: bot, name, createdAt: new Date() });
    return { bot };
  }

  async _name({ bot }: { bot: string }) {
    const found = await this.bots.findOne({ _id: bot });
    return found === null ? [] : [{ name: found.name }];
  }
}
