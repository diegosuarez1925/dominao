import type { createGateway } from "@mit-sdg/sync-engine/boundary";
import type { BottingConcept } from "./concepts/Botting.ts";
import type { DominoPlayingConcept } from "./concepts/DominoPlaying.ts";
import type { GuestSessioningConcept } from "./concepts/GuestSessioning.ts";
import { ABSENT_MS, BOT_AFTER_MS, BOT_MOVE_MS } from "./timing.ts";

type Reads = {
  games: Pick<DominoPlayingConcept, "_running" | "_vacancies" | "_turn" | "_players">;
  sessions: Pick<GuestSessioningConcept, "_idleFor">;
  bots: Pick<BottingConcept, "_name">;
};

/**
 * Looks at every game being played and asks the app, through its endpoints, to do
 * what time calls for: seat a bot where a seat has waited too long, let a bot whose
 * turn it is play, and take out a player whose page stopped checking in. The reads
 * here only decide whom to ask about; each endpoint checks the time again itself.
 */
export async function tick(gateway: ReturnType<typeof createGateway>, { games, sessions, bots }: Reads) {
  for (const { game } of await games._running()) {
    for (const { position, vacantMs } of await games._vacancies({ game })) {
      if (vacantMs >= BOT_AFTER_MS) await gateway.invoke("/games/seat-bot", { game, position });
    }
    const [turn] = await games._turn({ game });
    if (turn !== undefined && turn.waitingMs >= BOT_MOVE_MS && (await bots._name({ bot: turn.player })).length > 0) {
      await gateway.invoke("/games/bot-move", { game });
    }
    for (const { player } of await games._players({ game })) {
      const [seen] = player === "" ? [] : await sessions._idleFor({ session: player });
      if (seen !== undefined && seen.idleMs >= ABSENT_MS) await gateway.invoke("/games/drop-absent", { game, player });
    }
  }
}

/** Runs `tick` every `everyMs`, never two at once, and answers a function that stops it. */
export function startTicker(gateway: ReturnType<typeof createGateway>, reads: Reads, everyMs: number) {
  let running = false;
  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      await tick(gateway, reads);
    } catch (error) {
      console.error("The game ticker failed:", error);
    } finally {
      running = false;
    }
  }, everyMs);
  return () => clearInterval(timer);
}
