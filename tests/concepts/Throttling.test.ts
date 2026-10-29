import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import { LIMIT, LOCKOUT_MS, ThrottlingConcept, WINDOW_MS } from "../../src/concepts/Throttling.ts";
import { openTestDb, type TestDb } from "../test-db.ts";

let testDb: TestDb;
let now: Date;
let throttle: ThrottlingConcept;
const later = (ms: number) => {
  now = new Date(now.getTime() + ms);
};
const failTimes = async (key: string, times: number) => {
  let last = { key, locked: false };
  for (let i = 0; i < times; i++) last = await throttle.fail({ key });
  return last;
};

beforeAll(async () => {
  testDb = await openTestDb();
}, 120_000);

beforeEach(async () => {
  await testDb.db.dropDatabase();
  now = new Date("2026-10-29T12:00:00Z");
  throttle = new ThrottlingConcept(testDb.db, () => now);
});

afterAll(async () => {
  await testDb.close();
});

test("the limits are five failures in fifteen minutes, locking for fifteen minutes", () => {
  expect(LIMIT).toBe(5);
  expect(WINDOW_MS).toBe(15 * 60 * 1000);
  expect(LOCKOUT_MS).toBe(15 * 60 * 1000);
});

test("principle: five failures lock the key for fifteen minutes, then it opens again", async () => {
  for (let i = 1; i < LIMIT; i++) expect(await throttle.fail({ key: "abuelo" })).toEqual({ key: "abuelo", locked: false });
  expect(await throttle.fail({ key: "abuelo" })).toEqual({ key: "abuelo", locked: true });
  expect(await throttle._locked({ key: "abuelo" })).toEqual({ locked: true, secondsLeft: 15 * 60 });
  later(LOCKOUT_MS - 1000);
  expect(await throttle._locked({ key: "abuelo" })).toEqual({ locked: true, secondsLeft: 1 });
  later(1000);
  expect(await throttle._locked({ key: "abuelo" })).toEqual({ locked: false, secondsLeft: 0 });
});

test("a key nobody failed for is not locked", async () => {
  expect(await throttle._locked({ key: "nobody" })).toEqual({ locked: false, secondsLeft: 0 });
});

test("reset starts the count over", async () => {
  await failTimes("abuelo", LIMIT - 1);
  expect(await throttle.reset({ key: "abuelo" })).toEqual({ key: "abuelo" });
  expect(await failTimes("abuelo", LIMIT - 1)).toEqual({ key: "abuelo", locked: false });
  expect(await throttle.fail({ key: "abuelo" })).toEqual({ key: "abuelo", locked: true });
});

test("reset lifts a lock, and resetting a key with nothing to forget is fine", async () => {
  await failTimes("abuelo", LIMIT);
  await throttle.reset({ key: "abuelo" });
  expect(await throttle._locked({ key: "abuelo" })).toEqual({ locked: false, secondsLeft: 0 });
  expect(await throttle.reset({ key: "never-failed" })).toEqual({ key: "never-failed" });
});

test("failures spread over more than the window never lock", async () => {
  for (let i = 0; i < 20; i++) {
    expect((await throttle.fail({ key: "abuelo" })).locked).toBe(false);
    later(WINDOW_MS / (LIMIT - 1) + 1000);
  }
});

test("the window starts at the first failure, not the latest", async () => {
  await failTimes("abuelo", LIMIT - 1);
  later(WINDOW_MS + 1);
  // The window has passed, so this is failure one of a new count.
  expect(await throttle.fail({ key: "abuelo" })).toEqual({ key: "abuelo", locked: false });
  expect(await failTimes("abuelo", LIMIT - 2)).toEqual({ key: "abuelo", locked: false });
  expect(await throttle.fail({ key: "abuelo" })).toEqual({ key: "abuelo", locked: true });
});

test("the fifth failure right at the end of the window still locks", async () => {
  await failTimes("abuelo", LIMIT - 1);
  later(WINDOW_MS);
  expect(await throttle.fail({ key: "abuelo" })).toEqual({ key: "abuelo", locked: true });
});

test("failing while locked keeps it locked and does not extend the lock", async () => {
  await failTimes("abuelo", LIMIT);
  later(10 * 60 * 1000);
  expect(await throttle.fail({ key: "abuelo" })).toEqual({ key: "abuelo", locked: true });
  // The first failure is now more than the window ago, but a locked key does not start over.
  later(4 * 60 * 1000);
  expect(await throttle.fail({ key: "abuelo" })).toEqual({ key: "abuelo", locked: true });
  expect(await throttle._locked({ key: "abuelo" })).toEqual({ locked: true, secondsLeft: 60 });
});

test("after a lock runs out, a failure starts a fresh count", async () => {
  await failTimes("abuelo", LIMIT);
  later(LOCKOUT_MS);
  expect(await throttle.fail({ key: "abuelo" })).toEqual({ key: "abuelo", locked: false });
  expect(await failTimes("abuelo", LIMIT - 2)).toEqual({ key: "abuelo", locked: false });
  expect(await throttle.fail({ key: "abuelo" })).toEqual({ key: "abuelo", locked: true });
});

test("keys are counted apart", async () => {
  await failTimes("abuelo", LIMIT);
  expect(await throttle._locked({ key: "papo" })).toEqual({ locked: false, secondsLeft: 0 });
  expect(await failTimes("papo", LIMIT - 1)).toEqual({ key: "papo", locked: false });
  await throttle.reset({ key: "papo" });
  expect((await throttle._locked({ key: "abuelo" })).locked).toBe(true);
});

test("failures that arrive at once are all counted", async () => {
  const results = await Promise.all(Array.from({ length: LIMIT }, () => throttle.fail({ key: "abuelo" })));
  expect(results.filter((r) => r.locked)).toHaveLength(1);
  expect((await throttle._locked({ key: "abuelo" })).locked).toBe(true);
});
