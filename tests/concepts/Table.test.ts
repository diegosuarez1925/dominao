import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import {
  AlreadySeated,
  CodeInUse,
  NoSuchTable,
  NotSeated,
  TableConcept,
  TableFull,
} from "../../src/concepts/Table.ts";
import { openTestDb, type TestDb } from "../test-db.ts";

let testDb: TestDb;
let tables: TableConcept;

beforeAll(async () => {
  testDb = await openTestDb();
}, 120_000);

beforeEach(async () => {
  await testDb.db.dropDatabase();
  tables = new TableConcept(testDb.db);
});

afterAll(async () => {
  await testDb.close();
});

test("principle: four sit by code, a fifth is refused, the host passes on, and the empty table closes", async () => {
  const { table } = await tables.open({ host: "abuelo", code: "K7QF2M" });
  expect(await tables._getByCode({ code: "K7QF2M" })).toEqual([{ table }]);

  expect(await tables.join({ table, player: "papo" })).toEqual({ position: 1 });
  expect(await tables.join({ table, player: "nando" })).toEqual({ position: 2 });
  expect(await tables._isFull({ table })).toEqual({ full: false });
  expect(await tables.join({ table, player: "cheo" })).toEqual({ position: 3 });
  expect(await tables._isFull({ table })).toEqual({ full: true });
  await expect(tables.join({ table, player: "stranger" })).rejects.toThrow(TableFull);

  await tables.leave({ table, player: "abuelo" });
  expect(await tables._get({ table })).toEqual([{ host: "papo", code: "K7QF2M" }]);

  for (const player of ["papo", "nando", "cheo"]) await tables.leave({ table, player });
  expect(await tables._seats({ table })).toEqual([]);
  expect(await tables.close({ table })).toEqual({ code: "K7QF2M" });
  expect(await tables._getByCode({ code: "K7QF2M" })).toEqual([]);
});

test("a player sits at only one table at a time", async () => {
  const { table } = await tables.open({ host: "abuelo", code: "AAAAAA" });
  await expect(tables.open({ host: "abuelo", code: "BBBBBB" })).rejects.toThrow(AlreadySeated);
  const other = await tables.open({ host: "papo", code: "BBBBBB" });
  await expect(tables.join({ table: other.table, player: "abuelo" })).rejects.toThrow(AlreadySeated);
  await expect(tables.join({ table, player: "abuelo" })).rejects.toThrow(AlreadySeated);
  expect(await tables._tableOf({ player: "abuelo" })).toEqual([{ table }]);
});

test("two tables cannot share a code", async () => {
  await tables.open({ host: "abuelo", code: "AAAAAA" });
  await expect(tables.open({ host: "papo", code: "AAAAAA" })).rejects.toThrow(CodeInUse);
});

test("a freed seat is taken by the next player to join", async () => {
  const { table } = await tables.open({ host: "abuelo", code: "AAAAAA" });
  await tables.join({ table, player: "papo" });
  await tables.join({ table, player: "nando" });
  await tables.leave({ table, player: "papo" });
  expect(await tables.join({ table, player: "cheo" })).toEqual({ position: 1 });
  expect(await tables._seats({ table })).toEqual([
    { position: 0, player: "abuelo" },
    { position: 1, player: "cheo" },
    { position: 2, player: "nando" },
  ]);
});

test("when five rush for three seats at once, exactly three sit down", async () => {
  const { table } = await tables.open({ host: "abuelo", code: "AAAAAA" });
  const results = await Promise.allSettled(
    ["a", "b", "c", "d", "e"].map((player) => tables.join({ table, player })),
  );
  expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(3);
  expect((await tables._seats({ table })).map((seat) => seat.position)).toEqual([0, 1, 2, 3]);
});

test("unknown tables and players who are not seated are refused", async () => {
  await expect(tables.join({ table: "nope", player: "papo" })).rejects.toThrow(NoSuchTable);
  await expect(tables.close({ table: "nope" })).rejects.toThrow(NoSuchTable);
  const { table } = await tables.open({ host: "abuelo", code: "AAAAAA" });
  await expect(tables.leave({ table, player: "papo" })).rejects.toThrow(NotSeated);
});

test("closing a table unseats everyone still there", async () => {
  const { table } = await tables.open({ host: "abuelo", code: "AAAAAA" });
  await tables.join({ table, player: "papo" });
  await tables.close({ table });
  expect(await tables._tableOf({ player: "papo" })).toEqual([]);
  await expect(tables.open({ host: "papo", code: "AAAAAA" })).resolves.toHaveProperty("table");
});
