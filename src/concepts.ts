import { conceptSet, registerConcept } from "@mit-sdg/sync-engine/assembly";
import codeGeneratingSpec from "@design/concepts/CodeGenerating.md" with { type: "text" };
import guestSessioningSpec from "@design/concepts/GuestSessioning.md" with { type: "text" };
import tableSpec from "@design/concepts/Table.md" with { type: "text" };
import { CodeGeneratingConcept, InvalidLength, NoSuchCode } from "./concepts/CodeGenerating.ts";
import {
  GuestSessioningConcept,
  InvalidName,
  TokenInUse,
  UnknownSession,
} from "./concepts/GuestSessioning.ts";
import {
  AlreadySeated,
  CodeInUse,
  NoSuchTable,
  NotSeated,
  TableConcept,
  TableFull,
} from "./concepts/Table.ts";

const codeGenerating = registerConcept({
  class: CodeGeneratingConcept,
  spec: codeGeneratingSpec,
  refusals: { INVALID_LENGTH: InvalidLength, NO_SUCH_CODE: NoSuchCode },
});

const guestSessioning = registerConcept({
  class: GuestSessioningConcept,
  spec: guestSessioningSpec,
  refusals: { INVALID_NAME: InvalidName, TOKEN_IN_USE: TokenInUse, UNKNOWN_SESSION: UnknownSession },
});

const table = registerConcept({
  class: TableConcept,
  spec: tableSpec,
  refusals: {
    ALREADY_SEATED: AlreadySeated,
    CODE_IN_USE: CodeInUse,
    NO_SUCH_TABLE: NoSuchTable,
    NOT_SEATED: NotSeated,
    TABLE_FULL: TableFull,
  },
});

export const applicationConceptSet = conceptSet({
  CodeGenerating: codeGenerating,
  GuestSessioning: guestSessioning,
  Table: table,
});
export const { concepts } = applicationConceptSet;
