import { MongoServerError, type Collection, type Db } from "mongodb";

export class InvalidUsername extends Error {}
export class UsernameTaken extends Error {}
export class WeakPassword extends Error {}
export class NoSuchUser extends Error {}
export class WrongPassword extends Error {}

interface User {
  _id: string;
  /** The username in lower case, so uniqueness and look-up ignore case. */
  usernameKey: string;
  /** The username as its owner typed it, for showing. */
  username: string;
  /** argon2id, with its own salt. The password itself is never stored. */
  passwordHash: string;
  createdAt: Date;
}

// 3 to 20 letters, digits, _ . or -, starting with a letter or digit.
const USERNAME = /^[A-Za-z0-9][A-Za-z0-9_.-]{2,19}$/;
export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 128;

/**
 * Passwords people pick first, lower case. A password is COMMON when, ignoring case, it
 * is one of these, or its letters alone are (so "Password123!" and "Qwerty2026" are
 * caught as well as "password").
 */
const COMMON = new Set(
  `password passw0rd p@ssword p@ssw0rd passwort contraseña contrasena clave secret secreto
  qwerty qwertyuiop qwertz azerty asdfgh asdfghjkl zxcvbn zxcvbnm qazwsx qwerasdf
  letmein welcome welcome1 iloveyou loveyou teamo admin administrator root login master
  dragon monkey shadow sunshine princess football baseball basketball soccer superman
  batman trustno1 starwars whatever freedom computer internet hello hellothere
  dominoes domino dominao dominos capicu chuchazo puertorico boricua borinquen
  abc abcd abcdef abcdefg abcdefgh abcdefghij changeme default guest user test tester
  1234567890 0123456789 12345678910 1q2w3e4r5t 1qaz2wsx3edc 123qwe123qwe qwe123qwe123
  qwerty123 qwerty1234 qwerty12345 password1 password12 password123 password1234
  1234qwer 1234abcd abcd1234 abc12345 aa123456 a1b2c3d4e5 111111 000000 123123 1234567
  12345678 123456789 987654321 11111111 aaaaaa summer winter spring autumn
  january february march april may june july august september october november december`
    .split(/\s+/)
    .filter((word) => word.length > 0),
);

const SWAPS: Record<string, string> = { "@": "a", "4": "a", "3": "e", "0": "o", "$": "s", "5": "s", "7": "t", "!": "i" };
function unleet(text: string, one: string) {
  return [...text].map((c) => (c === "1" ? one : (SWAPS[c] ?? c))).join("");
}

export type PasswordRule = "LENGTH" | "VARIETY" | "CONTAINS_USERNAME" | "COMMON";

/** Every password rule the password breaks; none when it is strong enough. */
export function passwordWeaknesses(username: string, password: string): PasswordRule[] {
  const broken: PasswordRule[] = [];
  const length = [...password].length;
  if (length < PASSWORD_MIN || length > PASSWORD_MAX) broken.push("LENGTH");
  const kinds = [/\p{Ll}/u, /\p{Lu}/u, /\p{Nd}/u, /[^\p{Ll}\p{Lu}\p{Nd}]/u].filter((kind) => kind.test(password));
  if (kinds.length < 3) broken.push("VARIETY");
  const lower = password.toLowerCase();
  const name = username.trim().toLowerCase();
  if (name.length > 0 && lower.includes(name)) broken.push("CONTAINS_USERNAME");
  const digits = lower.replace(/[^\p{Nd}]/gu, "");
  // "P@ssw0rd" is "password" with a disguise, so letters are also read with common swaps undone.
  // Digits and symbols before or after the word are padding, not a disguise.
  const core = lower.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
  const words = [lower, unleet(core, "i"), unleet(core, "l")].map((spelling) => spelling.replace(/[^\p{L}]/gu, ""));
  if (
    COMMON.has(lower) ||
    words.some((word) => COMMON.has(word)) ||
    (words[0].length === 0 && COMMON.has(digits)) ||
    /^(.)\1*$/u.test(lower)
  ) {
    broken.push("COMMON");
  }
  return broken;
}

export class PasswordAuthenticatingConcept {
  private readonly users: Collection<User>;
  private indexed = false;
  // Checking a password that belongs to nobody still takes as long as checking a real
  // one, so how long sign-in takes does not tell which usernames exist.
  private readonly decoy = Bun.password.hash(crypto.randomUUID(), "argon2id");

  constructor(
    db: Db,
    private readonly clock: () => Date = () => new Date(),
  ) {
    this.users = db.collection<User>("passwordAuthenticating.users");
  }

  async register({ username, password }: { username: string; password: string }) {
    if (!USERNAME.test(username)) {
      throw new InvalidUsername("A username is 3 to 20 letters, digits, _ . or -, starting with a letter or digit.");
    }
    await this.#ensureIndexes();
    const usernameKey = username.toLowerCase();
    if ((await this.users.findOne({ usernameKey })) !== null) throw new UsernameTaken("That username is taken.");
    if (passwordWeaknesses(username, password).length > 0) throw new WeakPassword("That password is too easy to guess.");
    const user = crypto.randomUUID();
    const passwordHash = await Bun.password.hash(password, "argon2id");
    try {
      await this.users.insertOne({ _id: user, usernameKey, username, passwordHash, createdAt: this.clock() });
    } catch (error) {
      // Two people registering the same name at once: the unique index decides.
      if (error instanceof MongoServerError && error.code === 11000) throw new UsernameTaken("That username is taken.");
      throw error;
    }
    return { user };
  }

  async changePassword({ user, current, password }: { user: string; current: string; password: string }) {
    const found = await this.users.findOne({ _id: user });
    if (found === null) throw new NoSuchUser("There is no such account.");
    if (!(await Bun.password.verify(current, found.passwordHash))) throw new WrongPassword("That is not the current password.");
    if (password === current || passwordWeaknesses(found.username, password).length > 0) {
      throw new WeakPassword("That password is too easy to guess.");
    }
    const passwordHash = await Bun.password.hash(password, "argon2id");
    await this.users.updateOne({ _id: user, passwordHash: found.passwordHash }, { $set: { passwordHash } });
    return { user };
  }

  async unregister({ user, password }: { user: string; password: string }) {
    const found = await this.users.findOne({ _id: user });
    if (found === null) throw new NoSuchUser("There is no such account.");
    if (!(await Bun.password.verify(password, found.passwordHash))) throw new WrongPassword("That is not the current password.");
    const deleted = await this.users.deleteOne({ _id: user });
    if (deleted.deletedCount === 0) throw new NoSuchUser("There is no such account.");
    return { user };
  }

  /** The account with this username and password; nothing for a wrong password or an unknown username alike. */
  async _verify({ username, password }: { username: string; password: string }) {
    const found = await this.users.findOne({ usernameKey: username.toLowerCase() });
    const matches = await Bun.password.verify(password, found?.passwordHash ?? (await this.decoy));
    return found !== null && matches ? [{ user: found._id }] : [];
  }

  async _byUsername({ username }: { username: string }) {
    const found = await this.users.findOne({ usernameKey: username.toLowerCase() });
    return found === null ? [] : [{ user: found._id }];
  }

  async _username({ user }: { user: string }) {
    const found = await this.users.findOne({ _id: user });
    return found === null ? [] : [{ username: found.username }];
  }

  async _weaknesses({ username, password }: { username: string; password: string }) {
    return passwordWeaknesses(username, password).map((rule) => ({ rule }));
  }

  async #ensureIndexes() {
    if (this.indexed) return;
    await this.users.createIndex({ usernameKey: 1 }, { unique: true });
    this.indexed = true;
  }
}
