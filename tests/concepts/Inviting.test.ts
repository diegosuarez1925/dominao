import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import { AlreadyInvited, InvitingConcept, NoSuchInvite, SelfInvite } from "../../src/concepts/Inviting.ts";
import { openTestDb, type TestDb } from "../test-db.ts";

let testDb: TestDb;
let now: Date;
let inviting: InvitingConcept;
const later = (ms: number) => {
  now = new Date(now.getTime() + ms);
};

beforeAll(async () => {
  testDb = await openTestDb();
}, 120_000);

beforeEach(async () => {
  await testDb.db.dropDatabase();
  now = new Date("2026-10-29T12:00:00Z");
  inviting = new InvitingConcept(testDb.db, () => now);
});

afterAll(async () => {
  await testDb.close();
});

test("principle: accepted, declined and withdrawn invites are all gone", async () => {
  const titi = await inviting.invite({ from: "abuelo", to: "titi", place: "mesa" });
  expect(await inviting._invitesFor({ to: "titi" })).toEqual([
    { invite: titi.invite, from: "abuelo", place: "mesa", sentAt: now.getTime() },
  ]);
  expect(await inviting._invite({ invite: titi.invite })).toEqual([{ from: "abuelo", to: "titi", place: "mesa" }]);
  expect(await inviting.accept({ invite: titi.invite, to: "titi" })).toEqual({ invite: titi.invite, place: "mesa" });
  expect(await inviting._invitesFor({ to: "titi" })).toEqual([]);
  expect(await inviting._invite({ invite: titi.invite })).toEqual([]);

  const papo = await inviting.invite({ from: "abuelo", to: "papo", place: "mesa" });
  expect(await inviting.decline({ invite: papo.invite, to: "papo" })).toEqual({ invite: papo.invite, place: "mesa" });
  expect(await inviting._invitesFor({ to: "papo" })).toEqual([]);

  await inviting.invite({ from: "abuelo", to: "mami", place: "mesa" });
  expect(await inviting.withdraw({ place: "mesa" })).toEqual({ place: "mesa" });
  expect(await inviting._invitesFor({ to: "mami" })).toEqual([]);
});

test("nobody can invite themselves", async () => {
  await expect(inviting.invite({ from: "abuelo", to: "abuelo", place: "mesa" })).rejects.toBeInstanceOf(SelfInvite);
});

test("the same person cannot be invited to the same place twice at once, even by someone else", async () => {
  await inviting.invite({ from: "abuelo", to: "titi", place: "mesa" });
  await expect(inviting.invite({ from: "abuelo", to: "titi", place: "mesa" })).rejects.toBeInstanceOf(AlreadyInvited);
  await expect(inviting.invite({ from: "papo", to: "titi", place: "mesa" })).rejects.toBeInstanceOf(AlreadyInvited);
  // A different place is a different invite.
  await inviting.invite({ from: "papo", to: "titi", place: "patio" });
  expect(await inviting._invitesFor({ to: "titi" })).toHaveLength(2);
});

test("once answered, someone can be invited to the place again", async () => {
  const first = await inviting.invite({ from: "abuelo", to: "titi", place: "mesa" });
  await inviting.decline({ invite: first.invite, to: "titi" });
  const second = await inviting.invite({ from: "abuelo", to: "titi", place: "mesa" });
  expect(second.invite).not.toBe(first.invite);
});

test("only the person invited can accept or decline, and only once", async () => {
  const { invite } = await inviting.invite({ from: "abuelo", to: "titi", place: "mesa" });
  await expect(inviting.accept({ invite, to: "abuelo" })).rejects.toBeInstanceOf(NoSuchInvite);
  await expect(inviting.decline({ invite, to: "papo" })).rejects.toBeInstanceOf(NoSuchInvite);
  await inviting.accept({ invite, to: "titi" });
  await expect(inviting.accept({ invite, to: "titi" })).rejects.toBeInstanceOf(NoSuchInvite);
  await expect(inviting.decline({ invite, to: "titi" })).rejects.toBeInstanceOf(NoSuchInvite);
  await expect(inviting.accept({ invite: "made-up", to: "titi" })).rejects.toBeInstanceOf(NoSuchInvite);
});

test("withdrawing a place leaves other places' invites alone, and works with none", async () => {
  await inviting.invite({ from: "abuelo", to: "titi", place: "mesa" });
  const kept = await inviting.invite({ from: "papo", to: "titi", place: "patio" });
  await inviting.withdraw({ place: "mesa" });
  expect((await inviting._invitesFor({ to: "titi" })).map((row) => row.invite)).toEqual([kept.invite]);
  expect(await inviting.withdraw({ place: "nowhere" })).toEqual({ place: "nowhere" });
});

test("invites are listed newest first for the invitee, and in order sent for the sender", async () => {
  const one = await inviting.invite({ from: "abuelo", to: "titi", place: "mesa" });
  later(1000);
  const two = await inviting.invite({ from: "papo", to: "titi", place: "patio" });
  expect((await inviting._invitesFor({ to: "titi" })).map((row) => row.invite)).toEqual([two.invite, one.invite]);
  const three = await inviting.invite({ from: "abuelo", to: "mami", place: "mesa" });
  expect(await inviting._sentBy({ from: "abuelo" })).toEqual([
    { invite: one.invite, to: "titi", place: "mesa" },
    { invite: three.invite, to: "mami", place: "mesa" },
  ]);
});

test("the invite of someone to a place can be looked up", async () => {
  const { invite } = await inviting.invite({ from: "abuelo", to: "titi", place: "mesa" });
  expect(await inviting._inviteTo({ to: "titi", place: "mesa" })).toEqual([{ invite }]);
  expect(await inviting._inviteTo({ to: "titi", place: "patio" })).toEqual([]);
  expect(await inviting._inviteTo({ to: "papo", place: "mesa" })).toEqual([]);
});

test("forget removes invites sent by and to a user only", async () => {
  await inviting.invite({ from: "abuelo", to: "titi", place: "mesa" });
  await inviting.invite({ from: "papo", to: "abuelo", place: "patio" });
  const kept = await inviting.invite({ from: "papo", to: "titi", place: "patio" });
  expect(await inviting.forget({ user: "abuelo" })).toEqual({ user: "abuelo" });
  expect((await inviting._invitesFor({ to: "titi" })).map((row) => row.invite)).toEqual([kept.invite]);
  expect(await inviting._invitesFor({ to: "abuelo" })).toEqual([]);
  expect(await inviting._sentBy({ from: "abuelo" })).toEqual([]);
});

test("two invites to the same person and place at the same moment: only one is kept", async () => {
  const results = await Promise.allSettled([
    inviting.invite({ from: "abuelo", to: "titi", place: "mesa" }),
    inviting.invite({ from: "abuelo", to: "titi", place: "mesa" }),
  ]);
  expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  expect(await inviting._invitesFor({ to: "titi" })).toHaveLength(1);
});
