import { conceptSet, registerConcept } from "@mit-sdg/sync-engine/assembly";
import guestSessioningSpec from "@design/concepts/GuestSessioning.md" with { type: "text" };
import { GuestSessioningConcept, InvalidName, UnknownSession } from "./concepts/GuestSessioning.ts";

const guestSessioning = registerConcept({
  class: GuestSessioningConcept,
  spec: guestSessioningSpec,
  refusals: { INVALID_NAME: InvalidName, UNKNOWN_SESSION: UnknownSession },
});

export const applicationConceptSet = conceptSet({ GuestSessioning: guestSessioning });
export const { concepts } = applicationConceptSet;
