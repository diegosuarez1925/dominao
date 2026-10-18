import { MongoServerError, type Collection, type Db } from "mongodb";

export class InvalidLength extends Error {}
export class NoSuchCode extends Error {}

interface Code {
  context: string;
  code: string;
}

// Capital letters and digits without the look-alikes I, O, 0 and 1, so a code is
// easy to read aloud. Exactly 32 symbols, so each random byte maps evenly onto one.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const DEFAULT_SIZE = 6;
const MAX_ATTEMPTS = 20;

export class CodeGeneratingConcept {
  private readonly codes: Collection<Code>;
  private indexed = false;

  constructor(db: Db) {
    this.codes = db.collection<Code>("codeGenerating.codes");
  }

  // The input is called size, not length: sync-engine 1.1.0 drops any input field
  // named "length" when it records an action, so reactions could never match it.
  async generate({ context, size }: { context: string; size?: number }) {
    const characters = size ?? DEFAULT_SIZE;
    if (!Number.isInteger(characters) || characters <= 5) {
      throw new InvalidLength("A code must be a whole number of characters greater than 5.");
    }
    await this.#ensureIndex();
    // The unique index decides: if another request took the same code first, the
    // insert fails and we draw again.
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const code = randomCode(characters);
      try {
        await this.codes.insertOne({ context, code });
        return { code };
      } catch (error) {
        if (!(error instanceof MongoServerError && error.code === 11000)) throw error;
      }
    }
    throw new Error(`No free code of ${characters} characters found in ${context} after ${MAX_ATTEMPTS} tries.`);
  }

  async remove({ context, code }: { context: string; code: string }) {
    const result = await this.codes.deleteOne({ context, code });
    if (result.deletedCount === 0) throw new NoSuchCode("That code is not in use in this context.");
    return { code };
  }

  async _isAvailable({ context, code }: { context: string; code: string }) {
    return { available: (await this.codes.findOne({ context, code })) === null };
  }

  async #ensureIndex() {
    if (this.indexed) return;
    await this.codes.createIndex({ context: 1, code: 1 }, { unique: true });
    this.indexed = true;
  }
}

// crypto.getRandomValues is the same secure source crypto.randomUUID draws from,
// but it gives any length and a readable alphabet instead of fixed-length hex.
function randomCode(characters: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(characters));
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join("");
}
