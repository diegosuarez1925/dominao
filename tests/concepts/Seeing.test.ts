import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import { SeeingConcept } from "../../src/concepts/Seeing.ts";
import { openTestDb, type TestDb } from "../test-db.ts";

let testDb: TestDb;
let now: Date;
let seeing: SeeingConcept;
const later = (ms: number) => {
  now = new Date(now.getTime() + ms);
};

beforeAll(async () => {
  testDb = await openTestDb();
}, 120_000);

beforeEach(async () => {
  await testDb.db.dropDatabase();
  now = new Date("2026-10-29T12:00:00Z");
  seeing = new SeeingConcept(testDb.db, () => now);
});

afterAll(async () => {
  await testDb.close();
});

test("principle: what was never seen answers 0, and each look moves the time on", async () => {
  expect(await seeing._seenAt({ user: "titi", part: "REQUESTS" })).toEqual({ seenAt: 0 });
  expect(await seeing.see({ user: "titi", part: "REQUESTS" })).toEqual({ user: "titi", part: "REQUESTS" });
  expect(await seeing._seenAt({ user: "titi", part: "REQUESTS" })).toEqual({ seenAt: now.getTime() });
  later(5000);
  await seeing.see({ user: "titi", part: "REQUESTS" });
  expect(await seeing._seenAt({ user: "titi", part: "REQUESTS" })).toEqual({ seenAt: now.getTime() });
  expect(await testDb.db.collection("seeing.looks").countDocuments()).toBe(1);
});

test("each part and each user is kept apart", async () => {
  await seeing.see({ user: "titi", part: "REQUESTS" });
  expect(await seeing._seenAt({ user: "titi", part: "INVITES" })).toEqual({ seenAt: 0 });
  expect(await seeing._seenAt({ user: "papo", part: "REQUESTS" })).toEqual({ seenAt: 0 });
});

test("forget removes every look of a user only", async () => {
  await seeing.see({ user: "titi", part: "REQUESTS" });
  await seeing.see({ user: "titi", part: "INVITES" });
  await seeing.see({ user: "papo", part: "REQUESTS" });
  expect(await seeing.forget({ user: "titi" })).toEqual({ user: "titi" });
  expect(await seeing._seenAt({ user: "titi", part: "REQUESTS" })).toEqual({ seenAt: 0 });
  expect(await seeing._seenAt({ user: "titi", part: "INVITES" })).toEqual({ seenAt: 0 });
  expect(await seeing._seenAt({ user: "papo", part: "REQUESTS" })).toEqual({ seenAt: now.getTime() });
});
