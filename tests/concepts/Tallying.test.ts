import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import { AlreadyCounted, TallyingConcept } from "../../src/concepts/Tallying.ts";
import { openTestDb, type TestDb } from "../test-db.ts";

let testDb: TestDb;
let tallying: TallyingConcept;

beforeAll(async () => {
  testDb = await openTestDb();
}, 120_000);

beforeEach(async () => {
  await testDb.db.dropDatabase();
  tallying = new TallyingConcept(testDb.db);
});

afterAll(async () => {
  await testDb.close();
});

const empty = {
  matchesWon: 0,
  matchesLost: 0,
  matchesPlayed: 0,
  matchWinrate: 0,
  gamesWon: 0,
  gamesLost: 0,
  gamesPlayed: 0,
  gameWinrate: 0,
};

test("principle: a won match, a lost match and a won game, each counted once", async () => {
  expect(await tallying.recordMatch({ player: "abuelo", rules: "DEFAULT", game: "g1", match: 1, won: true, points: 63 })).toEqual({
    player: "abuelo",
  });
  await tallying.recordMatch({ player: "abuelo", rules: "DEFAULT", game: "g1", match: 2, won: false, points: 0 });
  await tallying.recordGame({ player: "abuelo", rules: "DEFAULT", game: "g1", won: true });
  expect(await tallying._records({ player: "abuelo" })).toEqual([
    {
      rules: "DEFAULT",
      matchesWon: 1,
      matchesLost: 1,
      matchesPlayed: 2,
      matchWinrate: 50,
      gamesWon: 1,
      gamesLost: 0,
      gamesPlayed: 1,
      gameWinrate: 100,
      bestMatchPoints: 63,
    },
  ]);
  // Reported again, nothing is counted twice.
  await expect(
    tallying.recordMatch({ player: "abuelo", rules: "DEFAULT", game: "g1", match: 1, won: true, points: 63 }),
  ).rejects.toBeInstanceOf(AlreadyCounted);
  await expect(tallying.recordGame({ player: "abuelo", rules: "DEFAULT", game: "g1", won: true })).rejects.toBeInstanceOf(AlreadyCounted);
  expect((await tallying._records({ player: "abuelo" }))[0].matchesPlayed).toBe(2);
});

test("someone who never played has no records and all-zero totals", async () => {
  expect(await tallying._records({ player: "nadie" })).toEqual([]);
  expect(await tallying._overall({ player: "nadie" })).toEqual(empty);
});

test("the best match keeps the most points won, and points of a lost match never count", async () => {
  await tallying.recordMatch({ player: "abuelo", rules: "LONG", game: "g", match: 1, won: true, points: 40 });
  await tallying.recordMatch({ player: "abuelo", rules: "LONG", game: "g", match: 2, won: true, points: 175 });
  await tallying.recordMatch({ player: "abuelo", rules: "LONG", game: "g", match: 3, won: true, points: 90 });
  await tallying.recordMatch({ player: "abuelo", rules: "LONG", game: "g", match: 4, won: false, points: 500 });
  expect((await tallying._records({ player: "abuelo" }))[0].bestMatchPoints).toBe(175);
});

test("a record that starts with a game, before any match, starts its matches at zero", async () => {
  await tallying.recordGame({ player: "abuelo", rules: "SHORT", game: "g", won: false });
  expect(await tallying._records({ player: "abuelo" })).toEqual([
    { rules: "SHORT", ...empty, gamesLost: 1, gamesPlayed: 1, bestMatchPoints: 0 },
  ]);
});

test("records are kept apart per rules and per player, and add up overall", async () => {
  await tallying.recordMatch({ player: "abuelo", rules: "DEFAULT", game: "g1", match: 1, won: true, points: 30 });
  await tallying.recordMatch({ player: "abuelo", rules: "DEFAULT", game: "g1", match: 2, won: true, points: 20 });
  await tallying.recordGame({ player: "abuelo", rules: "DEFAULT", game: "g1", won: true });
  await tallying.recordMatch({ player: "abuelo", rules: "SHORT", game: "g2", match: 1, won: false, points: 0 });
  await tallying.recordGame({ player: "abuelo", rules: "SHORT", game: "g2", won: false });
  await tallying.recordGame({ player: "abuelo", rules: "SHORT", game: "g3", won: false });
  await tallying.recordMatch({ player: "papo", rules: "DEFAULT", game: "g1", match: 1, won: false, points: 0 });

  const records = await tallying._records({ player: "abuelo" });
  expect(records.map((row) => [row.rules, row.matchesWon, row.matchesLost, row.gamesWon, row.gamesLost])).toEqual([
    ["DEFAULT", 2, 0, 1, 0],
    ["SHORT", 0, 1, 0, 2],
  ]);
  expect(await tallying._overall({ player: "abuelo" })).toEqual({
    matchesWon: 2,
    matchesLost: 1,
    matchesPlayed: 3,
    matchWinrate: 67,
    gamesWon: 1,
    gamesLost: 2,
    gamesPlayed: 3,
    gameWinrate: 33,
  });
  expect((await tallying._records({ player: "papo" }))[0].matchesLost).toBe(1);
});

test("the same match number in another game, or for another player, is a different match", async () => {
  await tallying.recordMatch({ player: "abuelo", rules: "DEFAULT", game: "g1", match: 1, won: true, points: 10 });
  await tallying.recordMatch({ player: "abuelo", rules: "DEFAULT", game: "g2", match: 1, won: true, points: 10 });
  await tallying.recordMatch({ player: "papo", rules: "DEFAULT", game: "g1", match: 1, won: false, points: 0 });
  expect((await tallying._records({ player: "abuelo" }))[0].matchesWon).toBe(2);
  expect(await tallying._matchCounted({ player: "abuelo", game: "g1", match: 1 })).toEqual({ counted: true });
  expect(await tallying._matchCounted({ player: "abuelo", game: "g1", match: 2 })).toEqual({ counted: false });
  expect(await tallying._gameCounted({ player: "abuelo", game: "g1" })).toEqual({ counted: false });
  await tallying.recordGame({ player: "abuelo", rules: "DEFAULT", game: "g1", won: true });
  expect(await tallying._gameCounted({ player: "abuelo", game: "g1" })).toEqual({ counted: true });
  expect(await tallying._gameCounted({ player: "papo", game: "g1" })).toEqual({ counted: false });
});

test("winrates are whole percentages, rounded", async () => {
  for (let match = 1; match <= 3; match++) {
    await tallying.recordMatch({ player: "abuelo", rules: "DEFAULT", game: "g", match, won: match === 1, points: 10 });
  }
  expect((await tallying._records({ player: "abuelo" }))[0].matchWinrate).toBe(33);
  await tallying.recordMatch({ player: "abuelo", rules: "DEFAULT", game: "g", match: 4, won: true, points: 10 });
  await tallying.recordMatch({ player: "abuelo", rules: "DEFAULT", game: "g", match: 5, won: true, points: 10 });
  await tallying.recordMatch({ player: "abuelo", rules: "DEFAULT", game: "g", match: 6, won: true, points: 10 });
  // 4 of 6 is 66.7%.
  expect((await tallying._records({ player: "abuelo" }))[0].matchWinrate).toBe(67);
});

test("the same match reported twice at the same moment is counted once", async () => {
  const results = await Promise.allSettled([
    tallying.recordMatch({ player: "abuelo", rules: "DEFAULT", game: "g", match: 1, won: true, points: 10 }),
    tallying.recordMatch({ player: "abuelo", rules: "DEFAULT", game: "g", match: 1, won: true, points: 10 }),
  ]);
  expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  expect((await tallying._records({ player: "abuelo" }))[0].matchesWon).toBe(1);
});

test("forget removes a player's records and what was counted for them only", async () => {
  await tallying.recordMatch({ player: "abuelo", rules: "DEFAULT", game: "g", match: 1, won: true, points: 10 });
  await tallying.recordGame({ player: "abuelo", rules: "DEFAULT", game: "g", won: true });
  await tallying.recordMatch({ player: "papo", rules: "DEFAULT", game: "g", match: 1, won: false, points: 0 });
  expect(await tallying.forget({ player: "abuelo" })).toEqual({ player: "abuelo" });
  expect(await tallying._records({ player: "abuelo" })).toEqual([]);
  expect(await tallying._matchCounted({ player: "abuelo", game: "g", match: 1 })).toEqual({ counted: false });
  expect(await tallying._records({ player: "papo" })).toHaveLength(1);
});
