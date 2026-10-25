import { assemble } from "@mit-sdg/sync-engine/assembly";
import type { Db } from "mongodb";
import { composition as games } from "./compositions/Games.ts";
import { composition as guests } from "./compositions/Guests.ts";
import { composition as matchmaking } from "./compositions/Matchmaking.ts";
import { composition as tables } from "./compositions/Tables.ts";
import { CodeGeneratingConcept } from "./concepts/CodeGenerating.ts";
import { DominoPlayingConcept } from "./concepts/DominoPlaying.ts";
import { GuestSessioningConcept } from "./concepts/GuestSessioning.ts";
import { MatchmakingConcept } from "./concepts/Matchmaking.ts";
import { TableConcept } from "./concepts/Table.ts";
import { applicationConceptSet } from "./concepts.ts";
import { db } from "./db.ts";

// Tests pass their own database (and may shorten the matchmaking countdown); the app
// uses the one in .env.
export function assembleApplication(database: Db = db, options: { matchmakingCountdownMs?: number } = {}) {
  return assemble({
    conceptSet: applicationConceptSet,
    instances: {
      CodeGenerating: new CodeGeneratingConcept(database),
      DominoPlaying: new DominoPlayingConcept(database),
      GuestSessioning: new GuestSessioningConcept(database),
      Matchmaking: new MatchmakingConcept(database, undefined, undefined, options.matchmakingCountdownMs),
      Table: new TableConcept(database),
    },
    composition: { Guests: guests, Tables: tables, Games: games, Matchmaking: matchmaking },
    // Print what went wrong. Otherwise a failure only shows up as INTERNAL_ERROR.
    rawFaultReporter: ({ error }) => console.error(error),
  });
}
