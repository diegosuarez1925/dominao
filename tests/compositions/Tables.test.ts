import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { assembleApplication } from "../../src/assembly.ts";
import { CodeGeneratingConcept } from "../../src/concepts/CodeGenerating.ts";
import { policy } from "../../src/http.ts";
import { openTestDb, type TestDb } from "../test-db.ts";

let testDb: TestDb;
let api: (request: Request) => Promise<Response>;

beforeAll(async () => {
  testDb = await openTestDb();
  const application = assembleApplication(testDb.db);
  api = createHttpHandler({ application, gateway: createGateway({ application }), policy });
}, 120_000);

beforeEach(async () => {
  await testDb.db.dropDatabase();
});

afterAll(async () => {
  await testDb.close();
});

async function call(path: string, body: unknown) {
  const response = await api(
    new Request(`http://127.0.0.1:3000/api${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
  return { status: response.status, body: await response.json() };
}

async function guest(displayName: string) {
  const { body } = await call("/guests/start", { displayName });
  return body as { session: string; token: string };
}

/** Whether CodeGenerating still holds a table code, asked through its own query. */
const taken = async (code: string) =>
  !(await new CodeGeneratingConcept(testDb.db)._isAvailable({ context: "TABLE_CODES", code })).available;

test("the journey: Abuelo opens a table and his three brothers join by code", async () => {
  const abuelo = await guest("Abuelo");
  const opened = await call("/tables/open", { token: abuelo.token, rules: "DEFAULT" });
  expect(opened.status).toBe(200);
  const { table, code } = opened.body;
  expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);

  const brothers = [await guest("Papo"), await guest("Nando"), await guest("Cheo")];
  for (const [i, brother] of brothers.entries()) {
    expect((await call("/tables/join", { token: brother.token, code })).body).toEqual({ table, position: i + 1 });
  }
  const fifth = await guest("Stranger");
  expect((await call("/tables/join", { token: fifth.token, code })).status).toBe(409);

  const { body } = await call("/tables/lobby", { token: brothers[1].token });
  expect(body.lobby.tables).toEqual([
    {
      table,
      code,
      host: abuelo.session,
      rules: "DEFAULT",
      seats: [
        { position: 0, player: abuelo.session, displayName: "Abuelo" },
        { position: 1, player: brothers[0].session, displayName: "Papo" },
        { position: 2, player: brothers[1].session, displayName: "Nando" },
        { position: 3, player: brothers[2].session, displayName: "Cheo" },
      ],
    },
  ]);
});

test("a code that belongs to no table is not found", async () => {
  const papo = await guest("Papo");
  expect(await call("/tables/join", { token: papo.token, code: "ZZZZZZ" })).toEqual({
    status: 404,
    body: { error: "NOT_FOUND" },
  });
});

test("an invented token cannot open a table", async () => {
  expect((await call("/tables/open", { token: "made-up", rules: "DEFAULT" })).status).toBe(401);
});

test("when the last player leaves, the table closes and its code is freed", async () => {
  const abuelo = await guest("Abuelo");
  const papo = await guest("Papo");
  const { table, code } = (await call("/tables/open", { token: abuelo.token, rules: "DEFAULT" })).body;
  await call("/tables/join", { token: papo.token, code });
  expect(await taken(code)).toBe(true);

  await call("/tables/leave", { token: abuelo.token, table });
  // Papo is host now, and the table is still open.
  expect((await call("/tables/lobby", { token: papo.token })).body.lobby.tables[0].host).toBe(papo.session);

  await call("/tables/leave", { token: papo.token, table });
  expect((await call("/tables/join", { token: abuelo.token, code })).status).toBe(404);
  expect(await taken(code)).toBe(false);
});

test("only the host can close a table with people at it", async () => {
  const abuelo = await guest("Abuelo");
  const papo = await guest("Papo");
  const { table, code } = (await call("/tables/open", { token: abuelo.token, rules: "DEFAULT" })).body;
  await call("/tables/join", { token: papo.token, code });

  expect(await call("/tables/close", { token: papo.token, table })).toEqual({
    status: 403,
    body: { error: "FORBIDDEN" },
  });
  expect((await call("/tables/close", { token: abuelo.token, table })).body).toEqual({ table });
  expect((await call("/tables/lobby", { token: papo.token })).body.lobby.tables).toEqual([]);
  expect(await taken(code)).toBe(false);
});

test("a guest who leaves the app also leaves their table", async () => {
  const abuelo = await guest("Abuelo");
  const papo = await guest("Papo");
  const { code } = (await call("/tables/open", { token: abuelo.token, rules: "DEFAULT" })).body;
  await call("/tables/join", { token: papo.token, code });

  await call("/guests/leave", { token: papo.token });
  const seats = (await call("/tables/lobby", { token: abuelo.token })).body.lobby.tables[0].seats;
  expect(seats.map((seat: { displayName: string }) => seat.displayName)).toEqual(["Abuelo"]);

  // The last guest leaving the app closes the table and frees its code.
  await call("/guests/leave", { token: abuelo.token });
  expect(await taken(code)).toBe(false);
});

test("a table is opened with rules, and unknown or missing rules are refused", async () => {
  const abuelo = await guest("Abuelo");
  expect(await call("/tables/open", { token: abuelo.token, rules: "BLITZ" })).toEqual({
    status: 400,
    body: { error: "INVALID_REQUEST" },
  });
  expect((await call("/tables/open", { token: abuelo.token })).status).toBe(400);
  // Nothing was left behind: no table, and Abuelo is free to open one.
  expect((await call("/tables/lobby", { token: abuelo.token })).body.lobby.tables).toEqual([]);

  await call("/tables/open", { token: abuelo.token, rules: "LONG" });
  expect((await call("/tables/lobby", { token: abuelo.token })).body.lobby.tables[0].rules).toBe("LONG");
});

test("a guest already seated cannot join a second table, nor leave one they are not at", async () => {
  const abuelo = await guest("Abuelo");
  const papo = await guest("Papo");
  const first = (await call("/tables/open", { token: abuelo.token, rules: "DEFAULT" })).body;
  const second = (await call("/tables/open", { token: papo.token, rules: "DEFAULT" })).body;

  expect((await call("/tables/join", { token: abuelo.token, code: second.code })).status).toBe(409);
  expect((await call("/tables/join", { token: abuelo.token, code: first.code })).status).toBe(409);
  expect((await call("/tables/leave", { token: abuelo.token, table: second.table })).status).toBe(404);
  // Both tables are as they were.
  expect((await call("/tables/lobby", { token: papo.token })).body.lobby.tables[0].seats).toHaveLength(1);
  expect((await call("/tables/lobby", { token: abuelo.token })).body.lobby.tables[0].seats).toHaveLength(1);
});

test("a guest at a table cannot also wait for a game with strangers", async () => {
  const abuelo = await guest("Abuelo");
  await call("/tables/open", { token: abuelo.token, rules: "DEFAULT" });
  expect((await call("/matchmaking/enqueue", { token: abuelo.token, rules: "DEFAULT", midway: false })).status).toBe(409);
});
