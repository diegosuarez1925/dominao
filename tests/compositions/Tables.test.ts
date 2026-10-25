import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { assembleApplication } from "../../src/assembly.ts";
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

const tableCodes = () => testDb.db.collection("codeGenerating.codes").countDocuments({ context: "TABLE_CODES" });

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
  expect(await tableCodes()).toBe(1);

  await call("/tables/leave", { token: abuelo.token, table });
  // Papo is host now, and the table is still open.
  expect((await call("/tables/lobby", { token: papo.token })).body.lobby.tables[0].host).toBe(papo.session);

  await call("/tables/leave", { token: papo.token, table });
  expect((await call("/tables/join", { token: abuelo.token, code })).status).toBe(404);
  expect(await tableCodes()).toBe(0);
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
  expect(await tableCodes()).toBe(0);
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
  expect(await tableCodes()).toBe(0);
});

test("a table is opened with rules, and unknown or missing rules are refused", async () => {
  const abuelo = await guest("Abuelo");
  expect(await call("/tables/open", { token: abuelo.token, rules: "BLITZ" })).toEqual({
    status: 400,
    body: { error: "INVALID_REQUEST" },
  });
  expect((await call("/tables/open", { token: abuelo.token })).status).toBe(400);
  // Nothing was left behind: no table, and no code taken.
  expect((await call("/tables/lobby", { token: abuelo.token })).body.lobby.tables).toEqual([]);
  expect(await tableCodes()).toBe(0);

  await call("/tables/open", { token: abuelo.token, rules: "LONG" });
  expect((await call("/tables/lobby", { token: abuelo.token })).body.lobby.tables[0].rules).toBe("LONG");
});
