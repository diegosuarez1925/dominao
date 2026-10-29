import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { assembleApplication } from "./assembly.ts";
import { BottingConcept } from "./concepts/Botting.ts";
import { DominoPlayingConcept } from "./concepts/DominoPlaying.ts";
import { FriendingConcept } from "./concepts/Friending.ts";
import { MatchmakingConcept } from "./concepts/Matchmaking.ts";
import { SessioningConcept } from "./concepts/Sessioning.ts";
import { TableConcept } from "./concepts/Table.ts";
import { EXPIRY_INTERVAL_MS, expireIdleSessions, expireOldRequests } from "./expiry.ts";
import { startTicker } from "./ticker.ts";
import { TICK_MS } from "./timing.ts";
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
        await db.collection("sessioning.sessions").findOne({}, { maxTimeMS: 2000, timeoutMS: 3000 });
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

// Idle sessions are expired on a timer, which frees their seats and queue places, and
// friend requests nobody answered within a week are cleared away.
const sessions = new SessioningConcept(db);
const friending = new FriendingConcept(db);
setInterval(() => {
  expireIdleSessions(gateway, sessions).catch((error) => console.error("Expiring idle sessions failed:", error));
  expireOldRequests(gateway, friending).catch((error) => console.error("Expiring old friend requests failed:", error));
}, EXPIRY_INTERVAL_MS);

// Full lobbies whose countdown is over are launched, empty seats get bots, bots take
// their turns, and players who vanished are taken out of their games, tables and the
// queue, on a one-second timer.
startTicker(
  gateway,
  {
    games: new DominoPlayingConcept(db),
    sessions,
    bots: new BottingConcept(db),
    matchmaking: new MatchmakingConcept(db),
    tables: new TableConcept(db),
  },
  TICK_MS,
);

console.log(`Backend ready on ${server.url}`);