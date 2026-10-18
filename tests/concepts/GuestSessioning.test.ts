import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import {
  GuestSessioningConcept,
  INACTIVITY_LIMIT_MS,
  InvalidName,
  UnknownSession,
} from "../../src/concepts/GuestSessioning.ts";
import { openTestDb, type TestDb } from "../test-db.ts";

let testDb: TestDb;
let now: Date;
let guests: GuestSessioningConcept;

beforeAll(async () => {
  testDb = await openTestDb();
}, 120_000);

beforeEach(async () => {
  await testDb.db.dropDatabase();
  now = new Date("2026-10-18T12:00:00Z");
  guests = new GuestSessioningConcept(testDb.db, () => now);
});

afterAll(async () => {
  await testDb.close();
});

test("principle: a guest resumes with their token, until they stay away too long", async () => {
  const { session, token } = await guests.start({ displayName: "Abuelo" });
  expect(await guests.resume({ token })).toEqual({ session, displayName: "Abuelo" });

  now = new Date(now.getTime() + INACTIVITY_LIMIT_MS + 1);
  await expect(guests.resume({ token })).rejects.toThrow(UnknownSession);
  expect(await guests._getName({ session })).toEqual([]);
});

test("resuming counts as activity, so an active guest never expires", async () => {
  const { token } = await guests.start({ displayName: "Abuelo" });
  for (let i = 0; i < 3; i++) {
    now = new Date(now.getTime() + INACTIVITY_LIMIT_MS - 1000);
    await guests.resume({ token });
  }
  await expect(guests.resume({ token })).resolves.toHaveProperty("displayName", "Abuelo");
});

test("display names are trimmed and must be 1 to 20 characters", async () => {
  const { session } = await guests.start({ displayName: "  Tío Papo  " });
  expect(await guests._getName({ session })).toEqual([{ displayName: "Tío Papo" }]);
  await expect(guests.start({ displayName: "   " })).rejects.toThrow(InvalidName);
  await expect(guests.start({ displayName: "x".repeat(21) })).rejects.toThrow(InvalidName);
});

test("two guests may share a name but never a token", async () => {
  const a = await guests.start({ displayName: "Pedro" });
  const b = await guests.start({ displayName: "Pedro" });
  expect(a.session).not.toBe(b.session);
  expect(a.token).not.toBe(b.token);
  expect(a.token.length).toBeGreaterThanOrEqual(32);
});

test("an invented token is refused", async () => {
  await expect(guests.resume({ token: "not-a-real-token" })).rejects.toThrow(UnknownSession);
});

test("ending a session makes its token unknown", async () => {
  const { session, token } = await guests.start({ displayName: "Abuelo" });
  expect(await guests.end({ token })).toEqual({ session });
  await expect(guests.resume({ token })).rejects.toThrow(UnknownSession);
  await expect(guests.end({ token })).rejects.toThrow(UnknownSession);
});
