import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import { AlreadyReserved, NoSuchReservation, ReservingConcept } from "../src/concepts/Reserving.ts";
import { openTestDb, type TestDb } from "./test-db.ts";

let testDb: TestDb;
let reserving: ReservingConcept;

beforeAll(async () => {
  testDb = await openTestDb();
}, 120_000);

beforeEach(async () => {
  await testDb.db.dropDatabase();
  reserving = new ReservingConcept(testDb.db);
});

afterAll(async () => {
  await testDb.close();
});

test("a table can only be reserved once", async () => {
  await reserving.reserve({ user: "barish", resource: "table-4" });
  await expect(reserving.reserve({ user: "eagon", resource: "table-4" })).rejects.toThrow(AlreadyReserved);
});

test("when two people reserve at the same moment, only one gets the table", async () => {
  const results = await Promise.allSettled([
    reserving.reserve({ user: "barish", resource: "table-4" }),
    reserving.reserve({ user: "eagon", resource: "table-4" }),
  ]);
  const succeeded = results.filter((result) => result.status === "fulfilled");
  expect(succeeded).toHaveLength(1);
});

test("cancelling frees the table for someone else", async () => {
  const { reservation } = await reserving.reserve({ user: "barish", resource: "table-4" });
  await reserving.cancel({ reservation });
  await expect(reserving.reserve({ user: "carmel", resource: "table-4" })).resolves.toHaveProperty("reservation");
});

test("a reservation can't be cancelled twice", async () => {
  const { reservation } = await reserving.reserve({ user: "barish", resource: "table-4" });
  await reserving.cancel({ reservation });
  await expect(reserving.cancel({ reservation })).rejects.toThrow(NoSuchReservation);
});

test("_all lists reservations in table order", async () => {
  await reserving.reserve({ user: "carmel", resource: "table-5" });
  await reserving.reserve({ user: "barish", resource: "table-4" });
  const rows = await reserving._all({});
  expect(rows.map((row) => row.resource)).toEqual(["table-4", "table-5"]);
});