/**
 * Fills the app with about 100 plausible accounts for user testing, each with made-up
 * statistics for every rule set, so the Stats screen looks lived in. Every account's
 * password is the one given below; the usernames are written to seed/users.md.
 *
 *   MONGODB_URL=<the deployed app's database> bun scripts/seed-users.ts
 *
 * Accounts are registered through PasswordAuthenticating, as signing up would. The
 * statistics are written straight into Tallying's records: they stand for games played
 * before the test, which have no game ids to count one by one. Running it again skips
 * usernames that already exist and leaves their statistics alone.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { PasswordAuthenticatingConcept, UsernameTaken } from "../src/concepts/PasswordAuthenticating.ts";
import { client, db } from "../src/db.ts";

const PASSWORD = "SoyPirata77.";
const RULES = { DEFAULT: { matchesPerGame: 7, best: [45, 160] }, SHORT: { matchesPerGame: 4, best: [30, 110] }, LONG: { matchesPerGame: 12, best: [90, 330] } } as const;

// The same "random" accounts on every run, so the list and the data always agree.
let seed = 61040;
const random = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const between = (low: number, high: number) => Math.floor(low + random() * (high - low + 1));
const pick = <T>(items: readonly T[]) => items[Math.floor(random() * items.length)];
/** How many of `count` tries come out won, each with chance `p`. */
const wins = (count: number, p: number) => Array.from({ length: count }).filter(() => random() < p).length;

const FIRST = ["icy", "sunny", "lucky", "brave", "happy", "quiet", "swift", "cosmic", "golden", "misty", "salty", "tiny", "mighty", "sleepy", "fuzzy", "breezy", "clever", "jolly", "rapid", "silver", "crimson", "coral", "mango", "coco", "papaya", "island", "starry", "rocky", "zesty", "chill"];
const SECOND = ["lion", "coqui", "parrot", "turtle", "panda", "falcon", "otter", "tiger", "dolphin", "fox", "owl", "gecko", "moose", "koala", "hawk", "whale", "rabbit", "pelican", "iguana", "lynx", "bear", "comet", "rocket", "wave", "palm", "cloud", "pixel", "mango", "taco", "breeze"];
const NAMES = ["ana", "luis", "carmen", "javi", "sofia", "tito", "marisol", "pedro", "lola", "nico", "gaby", "rafa", "isa", "manny", "yari", "chris", "dani", "kevin", "emily", "maya"];

/** About 100 usernames in the styles people use: icy_lion88, ana.rivera, tigerwave, Coqui-Kid... */
function usernames(count: number) {
  const made = new Set<string>();
  while (made.size < count) {
    const style = between(0, 4);
    const name =
      style === 0 ? `${pick(FIRST)}_${pick(SECOND)}${between(1, 99)}`
      : style === 1 ? `${pick(NAMES)}.${pick(SECOND)}`
      : style === 2 ? `${pick(FIRST)}${pick(SECOND)}`
      : style === 3 ? `${pick(NAMES)}${between(1990, 2009)}`
      : `${pick(SECOND)}_${pick(NAMES)}`;
    if (name.length <= 20 && ![...made].some((other) => other.toLowerCase() === name.toLowerCase())) made.add(name);
  }
  return [...made];
}

/** A player's record in one rule set: some never played it, regulars played dozens. */
function record(rules: keyof typeof RULES, skill: number, activity: number) {
  const games = Math.max(0, Math.round(activity * between(0, 40) * (rules === "LONG" ? 0.4 : 1)));
  const gamesWon = wins(games, skill);
  const matches = games === 0 ? 0 : Math.round(games * RULES[rules].matchesPerGame * (0.8 + random() * 0.4));
  // A team that wins games wins a little over half its matches, not all of them.
  const matchesWon = wins(matches, 0.5 + (skill - 0.5) * 0.4);
  const [low, high] = RULES[rules].best;
  // The more matches won, the likelier one of them was a big one.
  const best = matchesWon === 0 ? 0 : Math.round(low + (high - low) * (1 - Math.exp(-matchesWon / 15)) * (0.7 + 0.3 * random()));
  return { matchesWon, matchesLost: matches - matchesWon, gamesWon, gamesLost: games - gamesWon, bestMatchPoints: best };
}

const accounts = new PasswordAuthenticatingConcept(db);
const records = db.collection("tallying.records");
const added: string[] = [];
const skipped: string[] = [];

for (const username of usernames(100)) {
  const skill = 0.3 + random() * 0.4;
  // A few newcomers, most casual players, some regulars.
  const activity = pick([0, 0.2, 0.5, 0.5, 1, 1, 1, 1.5, 2, 3]);
  let user: string;
  try {
    ({ user } = await accounts.register({ username, password: PASSWORD }));
  } catch (error) {
    if (!(error instanceof UsernameTaken)) throw error;
    skipped.push(username);
    continue;
  }
  for (const rules of Object.keys(RULES) as (keyof typeof RULES)[]) {
    const row = record(rules, skill, activity);
    if (row.matchesWon + row.matchesLost + row.gamesWon + row.gamesLost === 0) continue;
    await records.updateOne({ _id: `${user}\u0000${rules}` as never }, { $set: { player: user, rules, ...row } }, { upsert: true });
  }
  added.push(username);
}

mkdirSync(new URL("../seed", import.meta.url), { recursive: true });
const list = [...added, ...skipped].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
writeFileSync(
  new URL("../seed/users.md", import.meta.url),
  `# Test accounts\n\nEvery account's password is \`${PASSWORD}\`. Each has made-up statistics for the rule sets it "played" (a few have none, as new players would).\n\n` +
    list.map((name) => `- ${name}`).join("\n") +
    "\n",
);
console.log(`Added ${added.length} accounts${skipped.length > 0 ? `, skipped ${skipped.length} that already existed` : ""}. Usernames are in seed/users.md.`);
await client.close();
