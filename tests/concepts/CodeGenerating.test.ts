import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import { CodeGeneratingConcept, InvalidLength, NoSuchCode } from "../../src/concepts/CodeGenerating.ts";
import { openTestDb, type TestDb } from "../test-db.ts";

let testDb: TestDb;
let codes: CodeGeneratingConcept;

beforeAll(async () => {
  testDb = await openTestDb();
}, 120_000);

beforeEach(async () => {
  await testDb.db.dropDatabase();
  codes = new CodeGeneratingConcept(testDb.db);
});

afterAll(async () => {
  await testDb.close();
});

test("principle: a code is taken until it is removed", async () => {
  const { code } = await codes.generate({ context: "TABLE_CODES", size: 6 });
  expect(await codes._isAvailable({ context: "TABLE_CODES", code })).toEqual({ available: false });
  expect(await codes._isAvailable({ context: "SESSION_TOKENS", code })).toEqual({ available: true });

  expect(await codes.remove({ context: "TABLE_CODES", code })).toEqual({ code });
  expect(await codes._isAvailable({ context: "TABLE_CODES", code })).toEqual({ available: true });
});

test("codes have the requested size, 6 by default, and a readable alphabet", async () => {
  expect((await codes.generate({ context: "TABLE_CODES" })).code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  expect((await codes.generate({ context: "SESSION_TOKENS", size: 32 })).code).toHaveLength(32);
});

test("sizes of 5 or less, or fractions, are refused", async () => {
  await expect(codes.generate({ context: "TABLE_CODES", size: 5 })).rejects.toThrow(InvalidLength);
  await expect(codes.generate({ context: "TABLE_CODES", size: 6.5 })).rejects.toThrow(InvalidLength);
});

test("codes never repeat within a context, even when requested at the same moment", async () => {
  const many = await Promise.all(
    Array.from({ length: 300 }, () => codes.generate({ context: "TABLE_CODES" })),
  );
  expect(new Set(many.map(({ code }) => code)).size).toBe(300);
});

test("removing a code that is not in use is refused", async () => {
  await expect(codes.remove({ context: "TABLE_CODES", code: "AAAAAA" })).rejects.toThrow(NoSuchCode);
  const { code } = await codes.generate({ context: "TABLE_CODES" });
  await expect(codes.remove({ context: "SESSION_TOKENS", code })).rejects.toThrow(NoSuchCode);
});
