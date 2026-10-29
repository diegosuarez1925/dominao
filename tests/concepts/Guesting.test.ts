import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import { GuestingConcept, InvalidName, NoSuchGuest } from "../../src/concepts/Guesting.ts";
import { openTestDb, type TestDb } from "../test-db.ts";

let testDb: TestDb;
let guests: GuestingConcept;

beforeAll(async () => {
  testDb = await openTestDb();
}, 120_000);

beforeEach(async () => {
  await testDb.db.dropDatabase();
  guests = new GuestingConcept(testDb.db);
});

afterAll(async () => {
  await testDb.close();
});

test("principle: a guest plays under a name until they are forgotten, and then the name means nobody", async () => {
  const { guest } = await guests.create({ displayName: "Abuelo" });
  expect(await guests._name({ guest })).toEqual([{ displayName: "Abuelo" }]);
  expect(await guests.forget({ guest })).toEqual({ guest });
  expect(await guests._name({ guest })).toEqual([]);
  // Another guest may take the same name.
  const again = await guests.create({ displayName: "Abuelo" });
  expect(again.guest).not.toBe(guest);
});

test("the name is trimmed", async () => {
  const { guest } = await guests.create({ displayName: "   Tío Cheo \t" });
  expect(await guests._name({ guest })).toEqual([{ displayName: "Tío Cheo" }]);
});

test("a name must be 1 to 20 characters after trimming", async () => {
  for (const displayName of ["", "   ", "\t\n", "x".repeat(21), ` ${"y".repeat(21)} `]) {
    await expect(guests.create({ displayName })).rejects.toThrow(InvalidName);
  }
  await expect(guests.create({ displayName: "" })).rejects.toThrow("A display name must be 1 to 20 characters long.");
  expect(await testDb.db.collection("guesting.guests").countDocuments()).toBe(0);
});

test("names of exactly 1 and 20 characters are fine, and so are spaces around them", async () => {
  for (const displayName of ["A", "x".repeat(20), `  ${"z".repeat(20)}  `]) {
    const { guest } = await guests.create({ displayName });
    expect((await guests._name({ guest }))[0].displayName).toBe(displayName.trim());
  }
});

test("names are kept as typed: accents, emoji and case", async () => {
  for (const displayName of ["Doña Carmen", "PAPO", "papo", "🁣 Nando"]) {
    const { guest } = await guests.create({ displayName });
    expect(await guests._name({ guest })).toEqual([{ displayName }]);
  }
});

test("two guests may share a name and are still two guests", async () => {
  const a = await guests.create({ displayName: "Papo" });
  const b = await guests.create({ displayName: "Papo" });
  expect(a.guest).not.toBe(b.guest);
  await guests.forget({ guest: a.guest });
  expect(await guests._name({ guest: b.guest })).toEqual([{ displayName: "Papo" }]);
});

test("forget refuses a guest who does not exist, or was already forgotten", async () => {
  await expect(guests.forget({ guest: "made-up" })).rejects.toThrow(NoSuchGuest);
  const { guest } = await guests.create({ displayName: "Abuelo" });
  await guests.forget({ guest });
  await expect(guests.forget({ guest })).rejects.toThrow("There is no such guest.");
});

test("_name answers nothing for someone who is not a guest", async () => {
  expect(await guests._name({ guest: "an-account-id" })).toEqual([]);
  expect(await guests._name({ guest: "" })).toEqual([]);
});
