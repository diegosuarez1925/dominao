import type { createGateway } from "@mit-sdg/sync-engine/boundary";
import type { BottingConcept } from "./concepts/Botting.ts";
import type { DominoPlayingConcept } from "./concepts/DominoPlaying.ts";
import type { MatchmakingConcept } from "./concepts/Matchmaking.ts";
import type { SessioningConcept } from "./concepts/Sessioning.ts";
import type { TableConcept } from "./concepts/Table.ts";
import { ABSENT_MS, AWAY_BEFORE_GAME_MS, BOT_AFTER_MS, BOT_MOVE_MS } from "./timing.ts";

type Reads = {
  games: Pick<DominoPlayingConcept, "_running" | "_vacancies" | "_turn" | "_players" | "_activeAt">;
  sessions: Pick<SessioningConcept, "_idleFor">;
  bots: Pick<BottingConcept, "_name">;
  matchmaking: Pick<MatchmakingConcept, "_ready" | "_lobbies" | "_entries">;
  tables: Pick<TableConcept, "_tables" | "_seats">;
};

/**
 * Looks at every lobby of strangers and every game being played and asks the app,
 * through its endpoints, to do what time calls for: launch a full lobby whose
 * countdown is over, seat a bot where a seat has waited too long, let a bot whose
 * turn it is play, and take out a player whose page stopped checking in, whether in a
 * game, at a table waiting for one, or in the queue for strangers. The reads
 * here only decide whom to ask about; each endpoint checks the time again itself.
 */
export async function tick(gateway: ReturnType<typeof createGateway>, { games, sessions, bots, matchmaking, tables }: Reads) {
  // Someone with no session at all is gone for good, so counts as away.
  const away = async (player: string) =>
    ((await sessions._idleFor({ player }))[0]?.idleMs ?? Number.POSITIVE_INFINITY) >= AWAY_BEFORE_GAME_MS;
  for (const { lobby } of await matchmaking._lobbies()) {
    for (const { player } of await matchmaking._entries({ lobby })) {
      if (await away(player)) await gateway.invoke("/matchmaking/drop-absent", { player });
    }
  }
  for (const { lobby } of await matchmaking._ready()) await gateway.invoke("/matchmaking/launch", { lobby });
  for (const { game } of await games._running()) {
    for (const { position, vacantMs } of await games._vacancies({ game })) {
      if (vacantMs >= BOT_AFTER_MS) await gateway.invoke("/games/seat-bot", { game, position });
    }
    const [turn] = await games._turn({ game });
    if (turn !== undefined && turn.waitingMs >= BOT_MOVE_MS && (await bots._name({ bot: turn.player })).length > 0) {
      await gateway.invoke("/games/bot-move", { game });
    }
    for (const { player } of await games._players({ game })) {
      const [seen] = player === "" ? [] : await sessions._idleFor({ player });
      if (seen !== undefined && seen.idleMs >= ABSENT_MS) await gateway.invoke("/games/drop-absent", { game, player });
    }
  }
  for (const { table } of await tables._tables()) {
    if ((await games._activeAt({ place: table })).length > 0) continue;
    for (const { player } of await tables._seats({ table })) {
      if (await away(player)) await gateway.invoke("/tables/drop-absent", { player });
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
