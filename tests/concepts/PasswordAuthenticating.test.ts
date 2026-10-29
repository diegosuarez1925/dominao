import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import {
  InvalidUsername,
  NoSuchUser,
  PasswordAuthenticatingConcept,
  passwordWeaknesses,
  UsernameTaken,
  WeakPassword,
  WrongPassword,
} from "../../src/concepts/PasswordAuthenticating.ts";
import { openTestDb, type TestDb } from "../test-db.ts";

let testDb: TestDb;
let accounts: PasswordAuthenticatingConcept;

const STRONG = "Fichas-de-1957";
const OTHER = "Mesa.Del.Patio.42";

beforeAll(async () => {
  testDb = await openTestDb();
}, 120_000);

beforeEach(async () => {
  await testDb.db.dropDatabase();
  accounts = new PasswordAuthenticatingConcept(testDb.db, () => new Date("2026-10-29T12:00:00Z"));
});

afterAll(async () => {
  await testDb.close();
});

test("principle: register, sign in from anywhere with the same pair, and nothing else gets in", async () => {
  const { user } = await accounts.register({ username: "abuelo_pr", password: STRONG });
  expect(await accounts._verify({ username: "abuelo_pr", password: STRONG })).toEqual([{ user }]);
  expect(await accounts._verify({ username: "abuelo_pr", password: OTHER })).toEqual([]);
  await expect(accounts.register({ username: "Abuelo_PR", password: OTHER })).rejects.toThrow(UsernameTaken);
  await accounts.changePassword({ user, current: STRONG, password: OTHER });
  expect(await accounts._verify({ username: "abuelo_pr", password: STRONG })).toEqual([]);
  expect(await accounts._verify({ username: "abuelo_pr", password: OTHER })).toEqual([{ user }]);
  await accounts.unregister({ user, password: OTHER });
  const again = await accounts.register({ username: "abuelo_pr", password: STRONG });
  expect(again.user).not.toBe(user);
});

// Usernames

test("usernames of 3 to 20 letters, digits, _ . and -, starting with a letter or digit, are accepted", async () => {
  for (const username of ["abc", "A1_", "x".repeat(20), "9lives", "tio.cheo", "papo-23", "Nando_PR"]) {
    const { user } = await accounts.register({ username, password: STRONG });
    expect(await accounts._username({ user })).toEqual([{ username }]);
  }
});

test("usernames that break the rule are refused, and nothing is stored", async () => {
  const bad = ["", "ab", "x".repeat(21), "_abuelo", ".abuelo", "-abuelo", "abuelo pr", "abuelo!", "abuelo@pr", "tío", "a\nb", " abuelo"];
  for (const username of bad) {
    await expect(accounts.register({ username, password: STRONG })).rejects.toThrow(InvalidUsername);
  }
  await expect(accounts.register({ username: "ab", password: STRONG })).rejects.toThrow(
    "A username is 3 to 20 letters, digits, _ . or -, starting with a letter or digit.",
  );
  expect(await testDb.db.collection("passwordAuthenticating.users").countDocuments()).toBe(0);
});

test("usernames are unique whatever their case, and keep the case they were typed in", async () => {
  const { user } = await accounts.register({ username: "AbueloPR", password: STRONG });
  for (const username of ["abuelopr", "ABUELOPR", "aBuElOpR"]) {
    await expect(accounts.register({ username, password: OTHER })).rejects.toThrow("That username is taken.");
  }
  expect(await accounts._username({ user })).toEqual([{ username: "AbueloPR" }]);
  expect(await accounts._byUsername({ username: "abuelopr" })).toEqual([{ user }]);
  expect(await accounts._byUsername({ username: "ABUELOPR" })).toEqual([{ user }]);
});

test("a taken username is refused before the password is judged", async () => {
  await accounts.register({ username: "abuelo", password: STRONG });
  await expect(accounts.register({ username: "abuelo", password: "weak" })).rejects.toThrow(UsernameTaken);
});

test("two people registering the same username at once: exactly one gets it", async () => {
  const results = await Promise.allSettled([
    accounts.register({ username: "papo", password: STRONG }),
    accounts.register({ username: "PAPO", password: OTHER }),
    accounts.register({ username: "Papo", password: STRONG }),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  for (const r of results.filter((r) => r.status === "rejected")) {
    expect((r as PromiseRejectedResult).reason).toBeInstanceOf(UsernameTaken);
  }
});

// Passwords

test("strong passwords are accepted", async () => {
  const strong = [STRONG, OTHER, "correct horse Battery", "Tr3s-golpes-en-la-mesa", "ÑAPA-de-domino-77", "zapato9VERDE", "Gallo#Pinto8"];
  for (const [i, password] of strong.entries()) {
    expect(passwordWeaknesses(`user${i}`, password)).toEqual([]);
    await accounts.register({ username: `user${i}`, password });
  }
});

test("LENGTH: under 10 or over 128 characters", () => {
  expect(passwordWeaknesses("abuelo", "Ab1!Ab1!A")).toContain("LENGTH");
  expect(passwordWeaknesses("abuelo", "Ab1!Ab1!Ab")).not.toContain("LENGTH");
  expect(passwordWeaknesses("abuelo", `Aa1-${"x".repeat(124)}`)).not.toContain("LENGTH");
  expect(passwordWeaknesses("abuelo", `Aa1-${"x".repeat(125)}`)).toContain("LENGTH");
  expect(passwordWeaknesses("abuelo", "")).toContain("LENGTH");
});

test("VARIETY: fewer than three kinds of character", () => {
  expect(passwordWeaknesses("abuelo", "fichasdelamesa")).toContain("VARIETY");
  expect(passwordWeaknesses("abuelo", "FICHASDELAMESA")).toContain("VARIETY");
  expect(passwordWeaknesses("abuelo", "fichas1957mesa")).toContain("VARIETY");
  expect(passwordWeaknesses("abuelo", "Fichasdelamesa")).toContain("VARIETY");
  expect(passwordWeaknesses("abuelo", "73920184657392")).toContain("VARIETY");
  // Any three of the four kinds will do, and a space counts as a symbol.
  expect(passwordWeaknesses("abuelo", "Fichas1957mesa")).not.toContain("VARIETY");
  expect(passwordWeaknesses("abuelo", "fichas-1957-mesa")).not.toContain("VARIETY");
  expect(passwordWeaknesses("abuelo", "fichas de la Mesa")).not.toContain("VARIETY");
  expect(passwordWeaknesses("abuelo", "FICHAS-1957-MESA")).not.toContain("VARIETY");
});

test("CONTAINS_USERNAME: the username anywhere inside, ignoring case", () => {
  expect(passwordWeaknesses("abuelo", "Abuelo-1957!")).toContain("CONTAINS_USERNAME");
  expect(passwordWeaknesses("abuelo", "mi-ABUELO-77x")).toContain("CONTAINS_USERNAME");
  expect(passwordWeaknesses("Papo", "Fichas-papo-1957")).toContain("CONTAINS_USERNAME");
  expect(passwordWeaknesses("abuelo", "Abue-lo-1957!")).not.toContain("CONTAINS_USERNAME");
});

test("COMMON: well-known passwords, and well-known words dressed up with digits and symbols", () => {
  for (const password of ["Password123!", "P@ssw0rd2026", "Pa$$w0rd!!", "D0m1n0es-2026", "Qw3rty!2345", "Qwerty12345", "qwerty12345", "Dominoes2026!", "Welcome1!!!", "1q2w3e4r5t", "Letmein-2026", "aaaaaaaaaaaa", "1234567890"]) {
    expect({ password, broken: passwordWeaknesses("someone", password) }).toEqual({
      password,
      broken: expect.arrayContaining(["COMMON"]),
    });
  }
  expect(passwordWeaknesses("someone", "Passwordless-Mesa-9")).not.toContain("COMMON");
  expect(passwordWeaknesses("someone", "Aa1!Aa1!Aa")).toContain("COMMON");
});

test("every broken rule is listed, and _weaknesses answers one row per rule", async () => {
  expect(passwordWeaknesses("abuelo", "abuelo")).toEqual(["LENGTH", "VARIETY", "CONTAINS_USERNAME"]);
  expect(await accounts._weaknesses({ username: "x1x", password: "password" })).toEqual([
    { rule: "LENGTH" },
    { rule: "VARIETY" },
    { rule: "COMMON" },
  ]);
  expect(await accounts._weaknesses({ username: "abuelo", password: STRONG })).toEqual([]);
});

test("register refuses a weak password and stores nothing", async () => {
  for (const password of ["short1A!", "alllowercaseletters", "Password123!", "Abuelo-is-1957"]) {
    await expect(accounts.register({ username: "abuelo", password })).rejects.toThrow(WeakPassword);
  }
  await expect(accounts.register({ username: "abuelo", password: "x" })).rejects.toThrow("That password is too easy to guess.");
  expect(await accounts._byUsername({ username: "abuelo" })).toEqual([]);
});

test("the password is never stored as typed", async () => {
  await accounts.register({ username: "abuelo", password: STRONG });
  const stored = await testDb.db.collection("passwordAuthenticating.users").findOne({});
  expect(JSON.stringify(stored)).not.toContain(STRONG);
  expect(stored?.passwordHash).toStartWith("$argon2id$");
});

test("two accounts with the same password get different hashes", async () => {
  await accounts.register({ username: "abuelo", password: STRONG });
  await accounts.register({ username: "papo", password: STRONG });
  const [a, b] = await testDb.db.collection("passwordAuthenticating.users").find({}).toArray();
  expect(a.passwordHash).not.toBe(b.passwordHash);
});

// Signing in

test("_verify ignores the username's case but never the password's", async () => {
  const { user } = await accounts.register({ username: "AbueloPR", password: STRONG });
  expect(await accounts._verify({ username: "abuelopr", password: STRONG })).toEqual([{ user }]);
  expect(await accounts._verify({ username: "ABUELOPR", password: STRONG })).toEqual([{ user }]);
  expect(await accounts._verify({ username: "AbueloPR", password: STRONG.toLowerCase() })).toEqual([]);
  expect(await accounts._verify({ username: "AbueloPR", password: STRONG.toUpperCase() })).toEqual([]);
  expect(await accounts._verify({ username: "AbueloPR", password: `${STRONG} ` })).toEqual([]);
  expect(await accounts._verify({ username: "AbueloPR", password: "" })).toEqual([]);
});

test("_verify answers the same nothing for an unknown username as for a wrong password", async () => {
  await accounts.register({ username: "abuelo", password: STRONG });
  expect(await accounts._verify({ username: "nobody", password: STRONG })).toEqual([]);
  expect(await accounts._verify({ username: "abuelo", password: OTHER })).toEqual([]);
  expect(await accounts._verify({ username: "", password: "" })).toEqual([]);
});

test("one account's password does not open another", async () => {
  await accounts.register({ username: "abuelo", password: STRONG });
  await accounts.register({ username: "papo", password: OTHER });
  expect(await accounts._verify({ username: "abuelo", password: OTHER })).toEqual([]);
  expect(await accounts._verify({ username: "papo", password: STRONG })).toEqual([]);
});

test("_byUsername and _username answer nothing for nobody", async () => {
  expect(await accounts._byUsername({ username: "nobody" })).toEqual([]);
  expect(await accounts._username({ user: "made-up" })).toEqual([]);
});

// Changing the password

test("changePassword needs the current password", async () => {
  const { user } = await accounts.register({ username: "abuelo", password: STRONG });
  await expect(accounts.changePassword({ user, current: OTHER, password: "Nueva-Clave-2026" })).rejects.toThrow(WrongPassword);
  await expect(accounts.changePassword({ user, current: "", password: "Nueva-Clave-2026" })).rejects.toThrow(
    "That is not the current password.",
  );
  expect(await accounts._verify({ username: "abuelo", password: STRONG })).toEqual([{ user }]);
});

test("changePassword refuses a weak new password, or the same one again", async () => {
  const { user } = await accounts.register({ username: "abuelo", password: STRONG });
  for (const password of ["weak", "Password123!", "Abuelo-1957-x", STRONG]) {
    await expect(accounts.changePassword({ user, current: STRONG, password })).rejects.toThrow(WeakPassword);
  }
  expect(await accounts._verify({ username: "abuelo", password: STRONG })).toEqual([{ user }]);
});

test("changePassword refuses an account that does not exist", async () => {
  await expect(accounts.changePassword({ user: "made-up", current: STRONG, password: OTHER })).rejects.toThrow(NoSuchUser);
});

test("changing one account's password leaves others alone", async () => {
  const { user } = await accounts.register({ username: "abuelo", password: STRONG });
  const papo = await accounts.register({ username: "papo", password: STRONG });
  await accounts.changePassword({ user, current: STRONG, password: OTHER });
  expect(await accounts._verify({ username: "papo", password: STRONG })).toEqual([{ user: papo.user }]);
});

// Unregistering

test("unregister needs the password, and frees the username", async () => {
  const { user } = await accounts.register({ username: "abuelo", password: STRONG });
  await expect(accounts.unregister({ user, password: OTHER })).rejects.toThrow(WrongPassword);
  expect(await accounts._username({ user })).toEqual([{ username: "abuelo" }]);
  expect(await accounts.unregister({ user, password: STRONG })).toEqual({ user });
  expect(await accounts._username({ user })).toEqual([]);
  expect(await accounts._byUsername({ username: "abuelo" })).toEqual([]);
  expect(await accounts._verify({ username: "abuelo", password: STRONG })).toEqual([]);
  await expect(accounts.unregister({ user, password: STRONG })).rejects.toThrow(NoSuchUser);
  await expect(accounts.changePassword({ user, current: STRONG, password: OTHER })).rejects.toThrow(NoSuchUser);
});

test("_search answers up to ten usernames starting with the text, ignoring case, alphabetically", async () => {
  const abuela = await accounts.register({ username: "Abuela.PR", password: STRONG });
  const abuelo = await accounts.register({ username: "abuelo_pr", password: STRONG });
  await accounts.register({ username: "papo-1957", password: STRONG });
  expect(await accounts._search({ text: "ABUEL" })).toEqual([
    { user: abuela.user, username: "Abuela.PR" },
    { user: abuelo.user, username: "abuelo_pr" },
  ]);
  expect(await accounts._search({ text: " abuelo " })).toEqual([{ user: abuelo.user, username: "abuelo_pr" }]);
  expect(await accounts._search({ text: "" })).toEqual([]);
  expect(await accounts._search({ text: "   " })).toEqual([]);
  expect(await accounts._search({ text: "pr" })).toEqual([]);
  // "." and "-" in the text match only themselves.
  expect(await accounts._search({ text: "abuela." })).toEqual([{ user: abuela.user, username: "Abuela.PR" }]);
  expect(await accounts._search({ text: "abuela-" })).toEqual([]);
  expect(await accounts._search({ text: "papo-" })).toHaveLength(1);
  expect(await accounts._search({ text: ".*" })).toEqual([]);
  for (let i = 0; i < 12; i++) await accounts.register({ username: `tio${String(i).padStart(2, "0")}`, password: STRONG });
  const many = await accounts._search({ text: "tio" });
  expect(many.map((row) => row.username)).toEqual(["tio00", "tio01", "tio02", "tio03", "tio04", "tio05", "tio06", "tio07", "tio08", "tio09"]);
});
