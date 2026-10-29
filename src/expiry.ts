import type { createGateway } from "@mit-sdg/sync-engine/boundary";
import type { SessioningConcept } from "./concepts/Sessioning.ts";

// How often the server looks for idle sessions to expire.
export const EXPIRY_INTERVAL_MS = 10 * 60 * 1000;

/**
 * Asks the app to expire every idle session, through its endpoint, so the reactions
 * that free a player's seat, queue place and token run as they do when a player leaves.
 */
export async function expireIdleSessions(
  gateway: ReturnType<typeof createGateway>,
  sessions: Pick<SessioningConcept, "_idle">,
) {
  for (const { session } of await sessions._idle()) {
    await gateway.invoke("/sessions/expire", { session });
  }
}
