import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { assembleApplication } from "./assembly.ts";
import { GuestSessioningConcept } from "./concepts/GuestSessioning.ts";
import { EXPIRY_INTERVAL_MS, expireIdleSessions } from "./expiry.ts";
import { policy } from "./http.ts";
import { db } from "./db.ts";
// The Vue page. Bun bundles it (with the Vue plugin from bunfig.toml) when the server
// starts, so one process serves both the page and the API, as the class platform needs.
import homepage from "../web/index.html";

const application = assembleApplication();
const gateway = createGateway({ application });
const api = createHttpHandler({ application, gateway, policy });

const server = Bun.serve({
  hostname: process.env.HOST ?? "127.0.0.1",
  port: Number(process.env.PORT ?? 3000),
  routes: {
    "/": homepage,
    "/api/*": api,
    "/health": async () => {
      try {
        await db.collection("guestSessioning.sessions").findOne({}, { maxTimeMS: 2000, timeoutMS: 3000 });
        return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
      } catch {
        return Response.json(
          { status: "unavailable" },
          { status: 503, headers: { "Cache-Control": "no-store" } },
        );
      }
    },
  },
});

// Idle guests are expired on a timer, which frees their seats and queue places.
const sessions = new GuestSessioningConcept(db);
setInterval(() => {
  expireIdleSessions(gateway, sessions).catch((error) => console.error("Expiring idle sessions failed:", error));
}, EXPIRY_INTERVAL_MS);

console.log(`Backend ready on ${server.url}`);