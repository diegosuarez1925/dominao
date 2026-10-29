import { assemble } from "@mit-sdg/sync-engine/assembly";
import type { Db } from "mongodb";
import { composition as accounts } from "./compositions/Accounts.ts";
import { composition as games } from "./compositions/Games.ts";
import { composition as guests } from "./compositions/Guests.ts";
import { composition as matchmaking } from "./compositions/Matchmaking.ts";
import { composition as seats } from "./compositions/Seats.ts";
import { composition as tables } from "./compositions/Tables.ts";
import { BottingConcept } from "./concepts/Botting.ts";
import { CodeGeneratingConcept } from "./concepts/CodeGenerating.ts";
import { DominoPlayingConcept, randomMove, randomShuffle, type MoveChooser } from "./concepts/DominoPlaying.ts";
import { FriendingConcept } from "./concepts/Friending.ts";
import { GuestingConcept } from "./concepts/Guesting.ts";
import { InvitingConcept } from "./concepts/Inviting.ts";
import { MatchmakingConcept } from "./concepts/Matchmaking.ts";
import { PasswordAuthenticatingConcept } from "./concepts/PasswordAuthenticating.ts";
import { SeeingConcept } from "./concepts/Seeing.ts";
import { SessioningConcept } from "./concepts/Sessioning.ts";
import { ThrottlingConcept } from "./concepts/Throttling.ts";
import { TableConcept } from "./concepts/Table.ts";
import { applicationConceptSet } from "./concepts.ts";
import { db } from "./db.ts";

// Tests pass their own database (and may shorten the matchmaking countdown, or set the
// clock that sessions, games and lobbies tell time by); the app uses the one in .env.
//
// How bots play is `chooseMove`: DominoPlaying hands it every legal move and plays the
// one it picks. Swap randomMove for a smarter chooser here to change every bot.
export function assembleApplication(
  database: Db = db,
  options: { matchmakingCountdownMs?: number; clock?: () => Date; chooseMove?: MoveChooser } = {},
) {
  const clock = options.clock ?? (() => new Date());
  return assemble({
    conceptSet: applicationConceptSet,
    instances: {
      Botting: new BottingConcept(database),
      CodeGenerating: new CodeGeneratingConcept(database),
      DominoPlaying: new DominoPlayingConcept(database, randomShuffle, clock, options.chooseMove ?? randomMove),
      Friending: new FriendingConcept(database, clock),
      Guesting: new GuestingConcept(database),
      Inviting: new InvitingConcept(database, clock),
      Matchmaking: new MatchmakingConcept(database, clock, undefined, options.matchmakingCountdownMs),
      PasswordAuthenticating: new PasswordAuthenticatingConcept(database, clock),
      Seeing: new SeeingConcept(database, clock),
      Sessioning: new SessioningConcept(database, clock),
      Throttling: new ThrottlingConcept(database, clock),
      Table: new TableConcept(database),
    },
    composition: { Guests: guests, Accounts: accounts, Tables: tables, Games: games, Seats: seats, Matchmaking: matchmaking },
    // Print what went wrong. Otherwise a failure only shows up as INTERNAL_ERROR.
    rawFaultReporter: ({ error }) => console.error(error),
  });
}
