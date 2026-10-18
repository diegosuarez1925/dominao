// Walks through guest sessions against a running backend: bun scripts/try-api.ts
import { createHttpClient } from "@mit-sdg/sync-engine-http/client";
import type { DominaoWireHttp } from "../generated/wire.ts";

const client = createHttpClient<DominaoWireHttp>({ baseUrl: "http://127.0.0.1:3000/api" });

const started = await client.guests.start({ displayName: "Abuelo" });
console.log("start Abuelo:", started);
if ("error" in started) process.exit(1);

console.log("me:", await client.guests.me({ token: started.token }));
console.log("start with a blank name:", await client.guests.start({ displayName: "   " }));
console.log("me with a made-up token:", await client.guests.me({ token: "made-up" }));
console.log("leave:", await client.guests.leave({ token: started.token }));
console.log("me after leaving:", await client.guests.me({ token: started.token }));
