import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import {
  InvalidLifetime,
  NotIdle,
  SessioningConcept,
  TokenInUse,
  UnknownSession,
} from "../../src/concepts/Sessioning.ts";
import { openTestDb, type TestDb } from "../test-db.ts";

const HOUR = 60 * 60 * 1000;

let testDb: TestDb;
let now: Date;
let sessions: SessioningConcept;
let tokens = 0;

// In the app, CodeGenerating supplies tokens and Guesting the players; here any unique strings will do.
function start(player: string, lifetime = 12 * HOUR) {
  const token = `token-${++tokens}`;
  return sessions.start({ player, token, lifetime }).then(({ session }) => ({ session, token }));
}
const later = (ms: number) => {
  now = new Date(now.getTime() + ms);
};

beforeAll(async () => {
  testDb = await openTestDb();
}, 120_000);

beforeEach(async () => {
  await testDb.db.dropDatabase();
  now = new Date("2026-10-18T12:00:00Z");
  sessions = new SessioningConcept(testDb.db, () => now);
});

afterAll(async () => {
  await testDb.close();
});

test("principle: a player resumes with their token, until they stay away too long and expire", async () => {
  const { session, token } = await start("abuelo");
  expect(await sessions.resume({ token })).toEqual({ session, player: "abuelo" });
  later(5 * HOUR);
  expect(await sessions._idleFor({ player: "abuelo" })).toEqual([{ idleMs: 5 * HOUR }]);

  later(12 * HOUR + 1);
  await expect(sessions.resume({ token })).rejects.toThrow(UnknownSession);
  expect(await sessions._idle()).toEqual([{ session, player: "abuelo" }]);
  expect(await sessions.expire({ session })).toEqual({ session, player: "abuelo", token });
  expect(await sessions._idle()).toEqual([]);
  expect(await sessions._idleFor({ player: "abuelo" })).toEqual([]);
});

test("start refuses a lifetime that is not a positive number", async () => {
  for (const lifetime of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    await expect(sessions.start({ player: "abuelo", token: `t${lifetime}`, lifetime })).rejects.toThrow(InvalidLifetime);
  }
  expect(await sessions._tokens({ player: "abuelo" })).toEqual([]);
});

test("start refuses a token another session already has, even for the same player", async () => {
  await sessions.start({ player: "abuelo", token: "shared", lifetime: HOUR });
  await expect(sessions.start({ player: "papo", token: "shared", lifetime: HOUR })).rejects.toThrow(TokenInUse);
  await expect(sessions.start({ player: "abuelo", token: "shared", lifetime: HOUR })).rejects.toThrow(TokenInUse);
  expect(await sessions._tokens({ player: "papo" })).toEqual([]);
  expect(await sessions._tokens({ player: "abuelo" })).toEqual([{ token: "shared" }]);
});

test("a token freed by ending its session can start a new one", async () => {
  await sessions.start({ player: "abuelo", token: "again", lifetime: HOUR });
  await sessions.end({ token: "again" });
  const { session } = await sessions.start({ player: "papo", token: "again", lifetime: HOUR });
  expect(await sessions.resume({ token: "again" })).toEqual({ session, player: "papo" });
});

test("each session gets its own id", async () => {
  const a = await start("abuelo");
  const b = await start("abuelo");
  expect(a.session).not.toBe(b.session);
});

test("resume refuses a token nobody has", async () => {
  await expect(sessions.resume({ token: "nope" })).rejects.toThrow(UnknownSession);
  await expect(sessions.resume({ token: "" })).rejects.toThrow("This session is not active.");
});

test("resume works right up to the lifetime and not a millisecond after", async () => {
  const { token } = await start("abuelo", HOUR);
  later(HOUR);
  expect((await sessions.resume({ token })).player).toBe("abuelo");
  later(HOUR + 1);
  await expect(sessions.resume({ token })).rejects.toThrow(UnknownSession);
});

test("resuming counts as being seen, so a used session lasts", async () => {
  const { token } = await start("abuelo", HOUR);
  for (let i = 0; i < 5; i++) {
    later(HOUR - 1);
    await sessions.resume({ token });
  }
  expect(await sessions._idleFor({ player: "abuelo" })).toEqual([{ idleMs: 0 }]);
  expect(await sessions._idle()).toEqual([]);
});

test("a refused resume does not count as being seen", async () => {
  const { session, token } = await start("abuelo", HOUR);
  later(HOUR + 1);
  await expect(sessions.resume({ token })).rejects.toThrow(UnknownSession);
  expect(await sessions._idleFor({ player: "abuelo" })).toEqual([{ idleMs: HOUR + 1 }]);
  expect(await sessions._idle()).toEqual([{ session, player: "abuelo" }]);
});

test("each session keeps its own lifetime", async () => {
  const short = await start("guest", HOUR);
  const long = await start("account", 30 * 24 * HOUR);
  later(2 * HOUR);
  await expect(sessions.resume({ token: short.token })).rejects.toThrow(UnknownSession);
  expect((await sessions.resume({ token: long.token })).player).toBe("account");
  expect(await sessions._idle()).toEqual([{ session: short.session, player: "guest" }]);
});

test("end deletes the session at once and answers whose it was", async () => {
  const { session, token } = await start("abuelo");
  expect(await sessions.end({ token })).toEqual({ session, player: "abuelo" });
  await expect(sessions.resume({ token })).rejects.toThrow(UnknownSession);
  await expect(sessions.end({ token })).rejects.toThrow(UnknownSession);
  await expect(sessions.expire({ session })).rejects.toThrow(UnknownSession);
});

test("end works on a stale session too, so a player can always sign out", async () => {
  const { session, token } = await start("abuelo", HOUR);
  later(2 * HOUR);
  expect(await sessions.end({ token })).toEqual({ session, player: "abuelo" });
  expect(await sessions._idle()).toEqual([]);
});

test("ending one of a player's sessions leaves the others", async () => {
  const phone = await start("abuelo");
  const laptop = await start("abuelo");
  await sessions.end({ token: phone.token });
  expect(await sessions.resume({ token: laptop.token })).toEqual({ session: laptop.session, player: "abuelo" });
  expect(await sessions._tokens({ player: "abuelo" })).toEqual([{ token: laptop.token }]);
});

test("only an idle session can expire, and only once", async () => {
  const active = await start("abuelo", HOUR);
  await expect(sessions.expire({ session: active.session })).rejects.toThrow(NotIdle);
  later(HOUR);
  await expect(sessions.expire({ session: active.session })).rejects.toThrow("That session is still in use.");
  later(1);
  await sessions.expire({ session: active.session });
  await expect(sessions.expire({ session: active.session })).rejects.toThrow(UnknownSession);
  await expect(sessions.expire({ session: "made-up" })).rejects.toThrow(UnknownSession);
});

test("a refused expire changes nothing", async () => {
  const { session, token } = await start("abuelo");
  await expect(sessions.expire({ session })).rejects.toThrow(NotIdle);
  expect(await sessions.resume({ token })).toEqual({ session, player: "abuelo" });
});

test("_idle lists idle sessions only, the longest unused first", async () => {
  const first = await start("abuelo", HOUR);
  later(10);
  const second = await start("papo", HOUR);
  later(10);
  await start("nando", 10 * HOUR);
  later(2 * HOUR);
  expect(await sessions._idle()).toEqual([
    { session: first.session, player: "abuelo" },
    { session: second.session, player: "papo" },
  ]);
});

test("_idleFor counts the player's most recently used session", async () => {
  const phone = await start("abuelo");
  later(HOUR);
  await start("abuelo");
  later(HOUR);
  expect(await sessions._idleFor({ player: "abuelo" })).toEqual([{ idleMs: HOUR }]);
  await sessions.resume({ token: phone.token });
  expect(await sessions._idleFor({ player: "abuelo" })).toEqual([{ idleMs: 0 }]);
  expect(await sessions._idleFor({ player: "nobody" })).toEqual([]);
});

test("_idleFor still answers for a stale session, so the app can tell how long a player has been away", async () => {
  await start("abuelo", HOUR);
  later(3 * HOUR);
  expect(await sessions._idleFor({ player: "abuelo" })).toEqual([{ idleMs: 3 * HOUR }]);
});

test("_tokens lists every token a player has, oldest first, and nobody else's", async () => {
  const a = await start("abuelo");
  later(1);
  await start("papo");
  later(1);
  const b = await start("abuelo");
  expect(await sessions._tokens({ player: "abuelo" })).toEqual([{ token: a.token }, { token: b.token }]);
  expect(await sessions._tokens({ player: "nobody" })).toEqual([]);
});

test("many sessions started at once all get distinct ids and all resume", async () => {
  const started = await Promise.all(Array.from({ length: 20 }, (_, i) => start(`p${i}`)));
  expect(new Set(started.map((s) => s.session)).size).toBe(20);
  for (const [i, { token }] of started.entries()) expect((await sessions.resume({ token })).player).toBe(`p${i}`);
});

test("the same token started twice at once gives one session and one TOKEN_IN_USE", async () => {
  const results = await Promise.allSettled([
    sessions.start({ player: "a", token: "race", lifetime: HOUR }),
    sessions.start({ player: "b", token: "race", lifetime: HOUR }),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  const refused = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
  expect(refused.reason).toBeInstanceOf(TokenInUse);
});
