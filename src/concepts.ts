import { conceptSet, registerConcept } from "@mit-sdg/sync-engine/assembly";
import codeGeneratingSpec from "@design/concepts/CodeGenerating.md" with { type: "text" };
import dominoPlayingSpec from "@design/concepts/DominoPlaying.md" with { type: "text" };
import matchmakingSpec from "@design/concepts/Matchmaking.md" with { type: "text" };
import guestingSpec from "@design/concepts/Guesting.md" with { type: "text" };
import passwordAuthenticatingSpec from "@design/concepts/PasswordAuthenticating.md" with { type: "text" };
import sessioningSpec from "@design/concepts/Sessioning.md" with { type: "text" };
import throttlingSpec from "@design/concepts/Throttling.md" with { type: "text" };
import tableSpec from "@design/concepts/Table.md" with { type: "text" };
import { CodeGeneratingConcept, InvalidLength, NoSuchCode } from "./concepts/CodeGenerating.ts";
import { BottingConcept } from "./concepts/Botting.ts";
import botSpec from "@design/concepts/Botting.md" with { type: "text" };
import {
  AlreadyPlaying,
  DominoPlayingConcept,
  DuplicatePlayer,
  GameInProgress,
  GameNotActive,
  IllegalPlay,
  NoSuchGame,
  GamePaused,
  NotInGame,
  NotInHand,
  NotYourTurn,
  SeatTaken,
  UnknownRules,
} from "./concepts/DominoPlaying.ts";
import { GuestingConcept, InvalidName, NoSuchGuest } from "./concepts/Guesting.ts";
import {
  InvalidUsername,
  NoSuchUser,
  PasswordAuthenticatingConcept,
  UsernameTaken,
  WeakPassword,
  WrongPassword,
} from "./concepts/PasswordAuthenticating.ts";
import { InvalidLifetime, NotIdle, SessioningConcept, TokenInUse, UnknownSession } from "./concepts/Sessioning.ts";
import { ThrottlingConcept } from "./concepts/Throttling.ts";
import {
  AlreadyQueued,
  CountdownRunning,
  NoSuchPlace,
  PlaceKnown,
  LobbyNotFull,
  MatchmakingConcept,
  NoSuchLobby,
  NotQueued,
} from "./concepts/Matchmaking.ts";
import {
  AlreadySeated,
  CodeInUse,
  NoSuchTable,
  NotSeated,
  SameSeat,
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
    UNKNOWN_RULES: UnknownRules,
    GAME_PAUSED: GamePaused,
    NOT_IN_GAME: NotInGame,
    ALREADY_PLAYING: AlreadyPlaying,
    SEAT_TAKEN: SeatTaken,
  },
});

const botting = registerConcept({
  class: BottingConcept,
  spec: botSpec,
  refusals: {},
});

const guesting = registerConcept({
  class: GuestingConcept,
  spec: guestingSpec,
  refusals: { INVALID_NAME: InvalidName, NO_SUCH_GUEST: NoSuchGuest },
});

const passwordAuthenticating = registerConcept({
  class: PasswordAuthenticatingConcept,
  spec: passwordAuthenticatingSpec,
  refusals: {
    INVALID_USERNAME: InvalidUsername,
    USERNAME_TAKEN: UsernameTaken,
    WEAK_PASSWORD: WeakPassword,
    NO_SUCH_USER: NoSuchUser,
    WRONG_PASSWORD: WrongPassword,
  },
});

const throttling = registerConcept({
  class: ThrottlingConcept,
  spec: throttlingSpec,
  refusals: {},
});

const sessioning = registerConcept({
  class: SessioningConcept,
  spec: sessioningSpec,
  refusals: {
    TOKEN_IN_USE: TokenInUse,
    UNKNOWN_SESSION: UnknownSession,
    NOT_IDLE: NotIdle,
    INVALID_LIFETIME: InvalidLifetime,
  },
});

const matchmaking = registerConcept({
  class: MatchmakingConcept,
  spec: matchmakingSpec,
  refusals: {
    ALREADY_QUEUED: AlreadyQueued,
    NOT_QUEUED: NotQueued,
    NO_SUCH_LOBBY: NoSuchLobby,
    LOBBY_NOT_FULL: LobbyNotFull,
    COUNTDOWN_RUNNING: CountdownRunning,
    PLACE_KNOWN: PlaceKnown,
    NO_SUCH_PLACE: NoSuchPlace,
  },
});

const table = registerConcept({
  class: TableConcept,
  spec: tableSpec,
  refusals: {
    ALREADY_SEATED: AlreadySeated,
    CODE_IN_USE: CodeInUse,
    NO_SUCH_TABLE: NoSuchTable,
    NOT_SEATED: NotSeated,
    SAME_SEAT: SameSeat,
    TABLE_FULL: TableFull,
  },
});

export const applicationConceptSet = conceptSet({
  Botting: botting,
  CodeGenerating: codeGenerating,
  DominoPlaying: dominoPlaying,
  Guesting: guesting,
  Matchmaking: matchmaking,
  PasswordAuthenticating: passwordAuthenticating,
  Sessioning: sessioning,
  Throttling: throttling,
  Table: table,
});
export const { concepts } = applicationConceptSet;
