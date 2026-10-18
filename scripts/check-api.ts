import { createHttpClient } from "@mit-sdg/sync-engine-http/client";
import type { DominaoWireHttp } from "../generated/wire.ts";

const address = process.argv.slice(2).find((arg) => !arg.startsWith("--")) ?? "http://127.0.0.1:3000";
// With --wait, keep trying for 60 seconds. That gives the containers time to start.
const deadline = Date.now() + (process.argv.includes("--wait") ? 60_000 : 0);
const client = createHttpClient<DominaoWireHttp>({ baseUrl: `${address}/api` });

while (true) {
  // A made-up token is refused, and that refusal proves the API and database answer.
  const result = await client.guests.me({ token: "health-check" });
  if ("error" in result && result.error === "UNAUTHORIZED") {
    console.log(`The API at ${address} answered.`);
    break;
  }
  if (Date.now() > deadline) {
    console.error(`Could not reach the API at ${address}. The client says ${"error" in result ? result.error : "OK"}.`);
    process.exit(1);
  }
  await Bun.sleep(1000);
}
