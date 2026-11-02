/**
 * Fills a database with the test accounts for user studies (see src/seed.ts) and lists
 * their usernames in seed/users.md.
 *
 *   MONGODB_URL=<database> bun scripts/seed-users.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { client, db } from "../src/db.ts";
import { PASSWORD, seedUsers } from "../src/seed.ts";

const { added, skipped } = await seedUsers(db);
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
