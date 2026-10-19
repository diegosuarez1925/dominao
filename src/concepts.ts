import { conceptSet, registerConcept } from "@mit-sdg/sync-engine/assembly";
import codeGeneratingSpec from "@design/concepts/CodeGenerating.md" with { type: "text" };
import dominoPlayingSpec from "@design/concepts/DominoPlaying.md" with { type: "text" };
import guestSessioningSpec from "@design/concepts/GuestSessioning.md" with { type: "text" };
import tableSpec from "@design/concepts/Table.md" with { type: "text" };
import { CodeGeneratingConcept, InvalidLength, NoSuchCode } from "./concepts/CodeGenerating.ts";
import {
  DominoPlayingConcept,
  DuplicatePlayer,
  GameInProgress,
  GameNotActive,
  IllegalPlay,
  NoSuchGame,
  NotInHand,
  NotYourTurn,
} from "./concepts/DominoPlaying.ts";
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

const dominoPlaying = registerConcept({
  class: DominoPlayingConcept,
  spec: dominoPlayingSpec,
  refusals: {
    DUPLICATE_PLAYER: DuplicatePlayer,
    GAME_IN_PROGRESS: GameInProgress,
    NO_SUCH_GAME: NoSuchGame,
    GAME_NOT_ACTIVE: GameNotActive,
    NOT_YOUR_TURN: NotYourTurn,
    NOT_IN_HAND: NotInHand,
    ILLEGAL_PLAY: IllegalPlay,
  },
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
  DominoPlaying: dominoPlaying,
  GuestSessioning: guestSessioning,
  Table: table,
});
export const { concepts } = applicationConceptSet;
