import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import {
  AlreadyFriends,
  AlreadyRequested,
  FriendingConcept,
  NoSuchRequest,
  NotExpired,
  REQUEST_LIFETIME_MS,
  RequestWaiting,
  SelfRequest,
} from "../../src/concepts/Friending.ts";
import { openTestDb, type TestDb } from "../test-db.ts";

let testDb: TestDb;
let now: Date;
let friending: FriendingConcept;
const later = (ms: number) => {
  now = new Date(now.getTime() + ms);
};
const DAY = 24 * 60 * 60 * 1000;

beforeAll(async () => {
  testDb = await openTestDb();
}, 120_000);

beforeEach(async () => {
  await testDb.db.dropDatabase();
  now = new Date("2026-10-29T12:00:00Z");
  friending = new FriendingConcept(testDb.db, () => now);
});

afterAll(async () => {
  await testDb.close();
});

test("a request lasts a week", () => {
  expect(REQUEST_LIFETIME_MS).toBe(7 * DAY);
});

test("principle: a request accepted makes friends, one rejected does not, and both are gone", async () => {
  const { request } = await friending.request({ from: "abuelo", to: "titi" });
  expect(await friending._incoming({ user: "titi" })).toEqual([{ request, from: "abuelo", sentAt: now.getTime() }]);
  expect(await friending._outgoing({ user: "abuelo" })).toEqual([{ request, to: "titi", sentAt: now.getTime() }]);
  later(1000);
  expect(await friending.accept({ request, to: "titi" })).toEqual({ request, from: "abuelo", to: "titi" });
  expect(await friending._incoming({ user: "titi" })).toEqual([]);
  expect(await friending._outgoing({ user: "abuelo" })).toEqual([]);
  expect(await friending._friends({ user: "abuelo" })).toEqual([{ friend: "titi", asker: "abuelo", since: now.getTime() }]);
  expect(await friending._friends({ user: "titi" })).toEqual([{ friend: "abuelo", asker: "abuelo", since: now.getTime() }]);
  expect(await friending._areFriends({ user: "titi", other: "abuelo" })).toEqual({ friends: true });

  const papo = await friending.request({ from: "abuelo", to: "papo" });
  expect(await friending.reject({ request: papo.request, to: "papo" })).toEqual({ request: papo.request, from: "abuelo" });
  expect(await friending._incoming({ user: "papo" })).toEqual([]);
  expect(await friending._areFriends({ user: "abuelo", other: "papo" })).toEqual({ friends: false });
  expect((await friending._friends({ user: "abuelo" })).map((row) => row.friend)).toEqual(["titi"]);
});

test("nobody can befriend themselves", async () => {
  await expect(friending.request({ from: "abuelo", to: "abuelo" })).rejects.toBeInstanceOf(SelfRequest);
  expect(await friending._areFriends({ user: "abuelo", other: "abuelo" })).toEqual({ friends: false });
});

test("a second request to the same person is refused while the first waits", async () => {
  await friending.request({ from: "abuelo", to: "titi" });
  await expect(friending.request({ from: "abuelo", to: "titi" })).rejects.toBeInstanceOf(AlreadyRequested);
  expect(await friending._incoming({ user: "titi" })).toHaveLength(1);
});

test("asking someone who already asked you is refused: accept theirs instead", async () => {
  await friending.request({ from: "abuelo", to: "titi" });
  await expect(friending.request({ from: "titi", to: "abuelo" })).rejects.toBeInstanceOf(RequestWaiting);
  expect(await friending._incoming({ user: "abuelo" })).toEqual([]);
});

test("friends cannot ask each other again, in either direction", async () => {
  const { request } = await friending.request({ from: "abuelo", to: "titi" });
  await friending.accept({ request, to: "titi" });
  await expect(friending.request({ from: "abuelo", to: "titi" })).rejects.toBeInstanceOf(AlreadyFriends);
  await expect(friending.request({ from: "titi", to: "abuelo" })).rejects.toBeInstanceOf(AlreadyFriends);
});

test("only the person a request was sent to can answer it", async () => {
  const { request } = await friending.request({ from: "abuelo", to: "titi" });
  await expect(friending.accept({ request, to: "papo" })).rejects.toBeInstanceOf(NoSuchRequest);
  await expect(friending.reject({ request, to: "abuelo" })).rejects.toBeInstanceOf(NoSuchRequest);
  expect(await friending._incoming({ user: "titi" })).toHaveLength(1);
  expect(await friending._friends({ user: "papo" })).toEqual([]);
});

test("an answered request cannot be answered again", async () => {
  const { request } = await friending.request({ from: "abuelo", to: "titi" });
  await friending.accept({ request, to: "titi" });
  await expect(friending.accept({ request, to: "titi" })).rejects.toBeInstanceOf(NoSuchRequest);
  await expect(friending.reject({ request, to: "titi" })).rejects.toBeInstanceOf(NoSuchRequest);
  await expect(friending.accept({ request: "made-up", to: "titi" })).rejects.toBeInstanceOf(NoSuchRequest);
  expect(await friending._friends({ user: "titi" })).toHaveLength(1);
});

test("a request runs out after a week: hidden, unanswerable, and can be sent again", async () => {
  const { request } = await friending.request({ from: "abuelo", to: "titi" });
  later(7 * DAY - 1);
  expect(await friending._incoming({ user: "titi" })).toHaveLength(1);
  expect(await friending._expired()).toEqual([]);
  later(1);
  expect(await friending._incoming({ user: "titi" })).toEqual([]);
  expect(await friending._outgoing({ user: "abuelo" })).toEqual([]);
  expect(await friending._expired()).toEqual([{ request }]);
  await expect(friending.accept({ request, to: "titi" })).rejects.toBeInstanceOf(NoSuchRequest);
  // Titi may now ask Abuelo herself, and Abuelo may ask again.
  const again = await friending.request({ from: "abuelo", to: "titi" });
  expect(again.request).not.toBe(request);
  expect(await friending._incoming({ user: "titi" })).toEqual([{ request: again.request, from: "abuelo", sentAt: now.getTime() }]);
  expect(await friending._expired()).toEqual([]);
});

test("expire clears only requests that have run out", async () => {
  const { request } = await friending.request({ from: "abuelo", to: "titi" });
  await expect(friending.expire({ request })).rejects.toBeInstanceOf(NotExpired);
  later(7 * DAY);
  expect(await friending.expire({ request })).toEqual({ request });
  expect(await friending._expired()).toEqual([]);
  await expect(friending.expire({ request })).rejects.toBeInstanceOf(NoSuchRequest);
  expect(await testDb.db.collection("friending.requests").countDocuments()).toBe(0);
});

test("lists are newest first, and friends oldest first", async () => {
  const one = await friending.request({ from: "abuelo", to: "titi" });
  later(1000);
  const two = await friending.request({ from: "papo", to: "titi" });
  expect((await friending._incoming({ user: "titi" })).map((row) => row.request)).toEqual([two.request, one.request]);
  await friending.accept({ request: two.request, to: "titi" });
  later(1000);
  await friending.accept({ request: one.request, to: "titi" });
  expect((await friending._friends({ user: "titi" })).map((row) => row.friend)).toEqual(["papo", "abuelo"]);
});

test("the asker is whoever sent the request, whichever of the pair sorts first", async () => {
  const { request } = await friending.request({ from: "zoe", to: "ana" });
  await friending.accept({ request, to: "ana" });
  expect(await friending._friends({ user: "ana" })).toEqual([{ friend: "zoe", asker: "zoe", since: now.getTime() }]);
  expect(await friending._friends({ user: "zoe" })).toEqual([{ friend: "ana", asker: "zoe", since: now.getTime() }]);
});

test("forget removes every request and friendship of a user, and nobody else's", async () => {
  const a = await friending.request({ from: "abuelo", to: "titi" });
  await friending.accept({ request: a.request, to: "titi" });
  await friending.request({ from: "abuelo", to: "papo" });
  await friending.request({ from: "mami", to: "abuelo" });
  const kept = await friending.request({ from: "mami", to: "titi" });
  expect(await friending.forget({ user: "abuelo" })).toEqual({ user: "abuelo" });
  expect(await friending._friends({ user: "titi" })).toEqual([]);
  expect(await friending._incoming({ user: "papo" })).toEqual([]);
  expect(await friending._outgoing({ user: "mami" })).toEqual([{ request: kept.request, to: "titi", sentAt: now.getTime() }]);
  // Forgetting someone with nothing is fine too.
  expect(await friending.forget({ user: "nadie" })).toEqual({ user: "nadie" });
});

test("two requests sent at the same moment: only one is kept", async () => {
  const results = await Promise.allSettled([
    friending.request({ from: "abuelo", to: "titi" }),
    friending.request({ from: "abuelo", to: "titi" }),
  ]);
  expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  expect(await friending._incoming({ user: "titi" })).toHaveLength(1);
});
