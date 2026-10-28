import { MongoServerError, type Collection, type Db } from "mongodb";

export class AlreadySeated extends Error {}
export class CodeInUse extends Error {}
export class NoSuchTable extends Error {}
export class TableFull extends Error {}
export class NotSeated extends Error {}
export class SameSeat extends Error {}

interface TableDoc {
  _id: string;
  host: string;
  code: string;
  /** What the players agreed to play by. Table only keeps it; it never reads it. */
  rules: string;
}

interface Seat {
  _id: string;
  table: string;
  position: number;
  player: string;
}

export const SEATS_PER_TABLE = 4;

function isDuplicate(error: unknown): boolean {
  return error instanceof MongoServerError && error.code === 11000;
}

export class TableConcept {
  private readonly tables: Collection<TableDoc>;
  private readonly seats: Collection<Seat>;
  private indexed = false;

  constructor(db: Db) {
    this.tables = db.collection<TableDoc>("table.tables");
    this.seats = db.collection<Seat>("table.seats");
  }

  async open({ host, code, rules }: { host: string; code: string; rules: string }) {
    await this.#ensureIndexes();
    if (await this.seats.findOne({ player: host })) {
      throw new AlreadySeated("That player is already sitting at a table.");
    }
    const table = crypto.randomUUID();
    try {
      await this.tables.insertOne({ _id: table, host, code, rules });
    } catch (error) {
      if (isDuplicate(error)) throw new CodeInUse("Another table already has that code.");
      throw error;
    }
    try {
      await this.seats.insertOne({ _id: crypto.randomUUID(), table, position: 0, player: host });
    } catch (error) {
      // The host sat down somewhere else in the meantime: undo the table.
      await this.tables.deleteOne({ _id: table });
      if (isDuplicate(error)) throw new AlreadySeated("That player is already sitting at a table.");
      throw error;
    }
    return { table };
  }

  async join({ table, player }: { table: string; player: string }) {
    await this.#ensureIndexes();
    if (!(await this.tables.findOne({ _id: table }))) throw new NoSuchTable("There is no such table.");
    // Two players may grab the same free seat at once; the unique index lets only one
    // win, and the other tries the next free seat.
    for (let attempt = 0; attempt < SEATS_PER_TABLE; attempt++) {
      if (await this.seats.findOne({ player })) {
        throw new AlreadySeated("That player is already sitting at a table.");
      }
      const taken = new Set((await this.seats.find({ table }).toArray()).map((seat) => seat.position));
      const position = [...Array(SEATS_PER_TABLE).keys()].find((p) => !taken.has(p));
      if (position === undefined) throw new TableFull("That table is full.");
      try {
        await this.seats.insertOne({ _id: crypto.randomUUID(), table, position, player });
        return { position };
      } catch (error) {
        if (!isDuplicate(error)) throw error;
      }
    }
    throw new TableFull("That table is full.");
  }

  async leave({ table, player }: { table: string; player: string }) {
    const seat = await this.seats.findOneAndDelete({ table, player });
    if (seat === null) throw new NotSeated("That player is not sitting at that table.");
    const found = await this.tables.findOne({ _id: table });
    if (found?.host === player) {
      const next = await this.seats.find({ table }).sort({ position: 1 }).limit(1).next();
      if (next !== null) await this.tables.updateOne({ _id: table }, { $set: { host: next.player } });
    }
    return { table };
  }

  /**
   * Whoever sits at `first` moves to `second` and whoever sits at `second` moves to
   * `first`; either seat may be empty, so this also moves one player to a free seat.
   */
  async swap({ table, first, second }: { table: string; first: number; second: number }) {
    if (!(await this.tables.findOne({ _id: table }))) throw new NoSuchTable("There is no such table.");
    if (first === second) throw new SameSeat("Pick two different seats.");
    const atFirst = await this.seats.findOne({ table, position: first });
    const atSecond = await this.seats.findOne({ table, position: second });
    // Each table and position is unique, so one of the two steps aside while the other moves.
    if (atFirst !== null && atSecond !== null) {
      await this.seats.updateOne({ _id: atFirst._id }, { $set: { position: SEATS_PER_TABLE + first } });
      await this.seats.updateOne({ _id: atSecond._id }, { $set: { position: first } });
      await this.seats.updateOne({ _id: atFirst._id }, { $set: { position: second } });
    } else if (atFirst !== null) {
      await this.seats.updateOne({ _id: atFirst._id }, { $set: { position: second } });
    } else if (atSecond !== null) {
      await this.seats.updateOne({ _id: atSecond._id }, { $set: { position: first } });
    }
    return { table };
  }

  async close({ table }: { table: string }) {
    const found = await this.tables.findOneAndDelete({ _id: table });
    if (found === null) throw new NoSuchTable("There is no such table.");
    await this.seats.deleteMany({ table });
    return { code: found.code };
  }

  async _getByCode({ code }: { code: string }) {
    const found = await this.tables.findOne({ code });
    return found === null ? [] : [{ table: found._id }];
  }

  async _get({ table }: { table: string }) {
    const found = await this.tables.findOne({ _id: table });
    // Tables opened before rules existed have none.
    return found === null ? [] : [{ host: found.host, code: found.code, rules: found.rules ?? "" }];
  }

  async _seats({ table }: { table: string }) {
    const rows = await this.seats.find({ table }).sort({ position: 1 }).toArray();
    return rows.map(({ position, player }) => ({ position, player }));
  }

  async _isFull({ table }: { table: string }) {
    return { full: (await this.seats.countDocuments({ table })) === SEATS_PER_TABLE };
  }

  async _tableOf({ player }: { player: string }) {
    const seat = await this.seats.findOne({ player });
    return seat === null ? [] : [{ table: seat.table }];
  }

  async #ensureIndexes() {
    if (this.indexed) return;
    await this.tables.createIndex({ code: 1 }, { unique: true });
    await this.seats.createIndex({ player: 1 }, { unique: true });
    await this.seats.createIndex({ table: 1, position: 1 }, { unique: true });
    this.indexed = true;
  }
}
