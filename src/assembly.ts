import { assemble } from "@mit-sdg/sync-engine/assembly";
import type { Db } from "mongodb";
import { composition as guests } from "./compositions/Guests.ts";
import { CodeGeneratingConcept } from "./concepts/CodeGenerating.ts";
import { GuestSessioningConcept } from "./concepts/GuestSessioning.ts";
import { applicationConceptSet } from "./concepts.ts";
import { db } from "./db.ts";

// Tests pass their own database; the app uses the one in .env.
export function assembleApplication(database: Db = db) {
  return assemble({
    conceptSet: applicationConceptSet,
    instances: {
      CodeGenerating: new CodeGeneratingConcept(database),
      GuestSessioning: new GuestSessioningConcept(database),
    },
    composition: { Guests: guests },
    // Print what went wrong. Otherwise a failure only shows up as INTERNAL_ERROR.
    rawFaultReporter: ({ error }) => console.error(error),
  });
}
