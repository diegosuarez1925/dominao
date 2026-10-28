import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import {
  AlreadySeated,
  CodeInUse,
  NoSuchTable,
  NotSeated,
  SameSeat,
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
  const { table } = await tables.open({ host: "abuelo", code: "K7QF2M", rules: "LONG" });
  expect(await tables._getByCode({ code: "K7QF2M" })).toEqual([{ table }]);

  expect(await tables.join({ table, player: "papo" })).toEqual({ position: 1 });
  expect(await tables.join({ table, player: "nando" })).toEqual({ position: 2 });
  expect(await tables._isFull({ table })).toEqual({ full: false });
  expect(await tables.join({ table, player: "cheo" })).toEqual({ position: 3 });
  expect(await tables._isFull({ table })).toEqual({ full: true });
  await expect(tables.join({ table, player: "stranger" })).rejects.toThrow(TableFull);

  // Abuelo wants Papo as his partner, across from him: he swaps seats 1 and 2.
  expect(await tables.swap({ table, first: 1, second: 2 })).toEqual({ table });
  expect(await tables._seats({ table })).toEqual([
    { position: 0, player: "abuelo" },
    { position: 1, player: "nando" },
    { position: 2, player: "papo" },
    { position: 3, player: "cheo" },
  ]);

  // Abuelo leaves; Nando, now in the lowest seat, becomes host.
  await tables.leave({ table, player: "abuelo" });
  expect(await tables._get({ table })).toEqual([{ host: "nando", code: "K7QF2M", rules: "LONG" }]);

  for (const player of ["papo", "nando", "cheo"]) await tables.leave({ table, player });
  expect(await tables._seats({ table })).toEqual([]);
  expect(await tables.close({ table })).toEqual({ code: "K7QF2M" });
  expect(await tables._getByCode({ code: "K7QF2M" })).toEqual([]);
});

test("a player sits at only one table at a time", async () => {
  const { table } = await tables.open({ host: "abuelo", code: "AAAAAA", rules: "DEFAULT" });
  await expect(tables.open({ host: "abuelo", code: "BBBBBB", rules: "DEFAULT" })).rejects.toThrow(AlreadySeated);
  const other = await tables.open({ host: "papo", code: "BBBBBB", rules: "DEFAULT" });
  await expect(tables.join({ table: other.table, player: "abuelo" })).rejects.toThrow(AlreadySeated);
  await expect(tables.join({ table, player: "abuelo" })).rejects.toThrow(AlreadySeated);
  expect(await tables._tableOf({ player: "abuelo" })).toEqual([{ table }]);
});

test("two tables cannot share a code", async () => {
  await tables.open({ host: "abuelo", code: "AAAAAA", rules: "DEFAULT" });
  await expect(tables.open({ host: "papo", code: "AAAAAA", rules: "DEFAULT" })).rejects.toThrow(CodeInUse);
});

test("a freed seat is taken by the next player to join", async () => {
  const { table } = await tables.open({ host: "abuelo", code: "AAAAAA", rules: "DEFAULT" });
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
  const { table } = await tables.open({ host: "abuelo", code: "AAAAAA", rules: "DEFAULT" });
  const results = await Promise.allSettled(
    ["a", "b", "c", "d", "e"].map((player) => tables.join({ table, player })),
  );
  expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(3);
  expect((await tables._seats({ table })).map((seat) => seat.position)).toEqual([0, 1, 2, 3]);
});

test("unknown tables and players who are not seated are refused", async () => {
  await expect(tables.join({ table: "nope", player: "papo" })).rejects.toThrow(NoSuchTable);
  await expect(tables.close({ table: "nope" })).rejects.toThrow(NoSuchTable);
  const { table } = await tables.open({ host: "abuelo", code: "AAAAAA", rules: "DEFAULT" });
  await expect(tables.leave({ table, player: "papo" })).rejects.toThrow(NotSeated);
});

test("swapping moves a player to an empty seat, keeps the host, and refuses the same seat or an unknown table", async () => {
  const { table } = await tables.open({ host: "abuelo", code: "K7QF2M", rules: "LONG" });
  await tables.join({ table, player: "papo" });
  // An empty seat on either side: the one player just moves.
  await tables.swap({ table, first: 1, second: 3 });
  expect(await tables._seats({ table })).toEqual([
    { position: 0, player: "abuelo" },
    { position: 3, player: "papo" },
  ]);
  await tables.swap({ table, first: 2, second: 0 });
  expect(await tables._seats({ table })).toEqual([
    { position: 2, player: "abuelo" },
    { position: 3, player: "papo" },
  ]);
  // Two empty seats: nothing to move, nothing changes.
  await tables.swap({ table, first: 0, second: 1 });
  expect(await tables._seats({ table })).toEqual([
    { position: 2, player: "abuelo" },
    { position: 3, player: "papo" },
  ]);
  // The host is still the host wherever he sits, and the next to join takes the lowest free seat.
  expect((await tables._get({ table }))[0].host).toBe("abuelo");
  expect(await tables.join({ table, player: "nando" })).toEqual({ position: 0 });
  await expect(tables.swap({ table, first: 2, second: 2 })).rejects.toThrow(SameSeat);
  await expect(tables.swap({ table: "no-such-table", first: 0, second: 1 })).rejects.toThrow(NoSuchTable);
  expect(await tables._seats({ table })).toEqual([
    { position: 0, player: "nando" },
    { position: 2, player: "abuelo" },
    { position: 3, player: "papo" },
  ]);
});

test("closing a table unseats everyone still there", async () => {
  const { table } = await tables.open({ host: "abuelo", code: "AAAAAA", rules: "DEFAULT" });
  await tables.join({ table, player: "papo" });
  await tables.close({ table });
  expect(await tables._tableOf({ player: "papo" })).toEqual([]);
  await expect(tables.open({ host: "papo", code: "AAAAAA", rules: "DEFAULT" })).resolves.toHaveProperty("table");
});
