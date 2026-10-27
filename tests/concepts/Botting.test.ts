import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import { BottingConcept } from "../../src/concepts/Botting.ts";
import { openTestDb, type TestDb } from "../test-db.ts";

let testDb: TestDb;
let botting: BottingConcept;

beforeAll(async () => {
  testDb = await openTestDb();
}, 120_000);

beforeEach(async () => {
  await testDb.db.dropDatabase();
  botting = new BottingConcept(testDb.db);
});

afterAll(async () => {
  await testDb.close();
});

test("principle: a new bot has a name that says it is a bot, and nobody else has one", async () => {
  const { bot } = await botting.create();
  const [{ name }] = await botting._name({ bot });
  expect(name).toMatch(/^Bot [A-ZÑ][a-zñ]+$/);
  expect(await botting._name({ bot: "some-guest-session" })).toEqual([]);
});

test("every bot is a different bot, even when two are made at once", async () => {
  const made = await Promise.all([botting.create(), botting.create(), botting.create()]);
  expect(new Set(made.map(({ bot }) => bot)).size).toBe(3);
  for (const { bot } of made) expect(await botting._name({ bot })).toHaveLength(1);
});
