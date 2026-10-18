# DOMINAO design notes (P2: MVP)

## Core user journey

Abuelo opens DOMINAO, types his name and is playing as a guest right away. He
creates a private table and gets a six-letter join code, which he sends to his three
brothers. Each brother types a name, enters the code and takes a seat; seats across
from each other are partners. Abuelo starts the game, and everyone sees their own
seven tiles face up, how many tiles the others hold, and the board in the middle.
They take turns placing a matching tile on either end, or passing when they can't.
The hand ends when someone plays their last tile or nobody can move (a tranque),
and the winning team gets the points. Then the table is open again for a rematch.

## Initial plan

Each step ends with its tests and `bun run check` passing, and gets its own commit.

1. **Guest sessions.** GuestSessioning spec, Mongo implementation and tests, plus
   endpoints to start a session, resume it, and leave. Evaluated by concept tests,
   endpoint tests, and calls against the running backend.
2. **Private tables.** Table and CodeGenerating, plus endpoints to open a table, join
   by code and view the lobby. Evaluated by tests and a script that seats four
   guests through the API.
3. **The game.** A new concept for the domino hand itself (deal, play, pass, end of
   hand, scoring), with reactions that deal when the table starts and reopen the
   table when the hand ends. Evaluated by tests that play a whole hand.
4. **Vue frontend.** Name screen, home, lobby and game board, refreshing by polling.
   Evaluated by playing in four browser tabs.
5. **Wrap-up.** These notes, and a dry run of the two-minute demo.

Matchmaking (the "Play!" button with strangers) is left for P3, and the MVP plays
one hand rather than a full game to 500 points.

## Progress log

### Step 1: guest sessions

Replaced the sample Reservations app with the first DOMINAO concept.

Changes to the P1 GuestSessioning design:

- **The concept makes its own token.** P1 had reactions asking CodeGenerating for a
  token and passing it to `start`. That splits one secret across two concepts for no
  gain, and the P1 `start` spec already said it made the token itself. CodeGenerating
  will still make table join codes.
- **A session id and a token are different things.** The session id is the public
  identity other players will see at a table; the token is the secret only the
  guest's browser holds. Endpoints take the token and resolve it to a session.
- **`resume` also returns the display name**, so one call tells the page who is back.
- **`end` takes the token**, so nobody can end someone else's session by knowing
  their public session id.
- **Expiry is checked when a token is used**, instead of through a separate
  `system_expire` action. The inactivity limit is 12 hours, long enough for a
  chemotherapy session.
- **`rename` is left out** of the MVP.

Decision: the browser keeps the token in `sessionStorage`, which is separate for each
tab, so one person can test a four-player table with four tabs.

The page in `web/` is a throwaway plain-TypeScript page for trying sessions; the Vue
frontend replaces it in step 4.

### Step 1b: tokens come from CodeGenerating

I had first let GuestSessioning make its own tokens. Reviewing it, I went back to
the P1 design: CodeGenerating is a general concept for unique codes within a
context, and the same concept will make table join codes in step 2. So:

- **CodeGenerating** is implemented from the P1 spec. Codes are unique per context
  (enforced by a unique MongoDB index, with a retry if two requests draw the same
  code). They use `crypto.getRandomValues`, the same secure source as
  `crypto.randomUUID`, over 32 easy-to-read symbols with no I, O, 0 or 1.
- **GuestSessioning.start now takes the token** instead of making one, and only keeps
  it unique.
- **`/guests/start` chains the two P1 reactions**: generate a 32-character code in
  the `SESSION_TOKENS` context, then start the session with it as the token. That is
  160 random bits, far too many to guess.
- **FreeTokenOnSessionEnd** (from P1) returns the token to CodeGenerating when a
  session ends.

Challenge: the endpoint hung until it timed out. The cause was in sync-engine 1.1.0
itself: when it records an action it drops any input field named `length`, so the
rule waiting for `generate(length: 32)` never matched. I renamed the input to
`size`. P1's `_isAvailable` returns a Boolean; in the spec format that type is
called `Flag`.

Future work: if a guest submits a blank name, a token is generated before the name
is refused and stays reserved. Tokens of sessions that expire (rather than being
ended) also stay reserved. Neither does harm, given how many codes there are.

### Step 2: private tables

Scope for this step: Table only handles creating a table, joining it
by code, and getting rid of it. It knows nothing about the game, so P1's `rules`,
the OPEN/PLAYING status, `start`, `finish`, `setRules` and `moveSeat` are left out
for now. They will come back with the game (or move into the game concept) in a
later step.

Changes to the P1 Table design:

- **Table holds its join code.** P1's reactions call `Table.open(host, rules, code)`
  and `_getByCode(code)`, but the P1 state had no code. Table now has
  `a unique code String`, and the code comes from CodeGenerating in a
  `TABLE_CODES` context (6 characters).
- **`leave` no longer deletes the table; `close` does.** P1's `leave` deleted an
  empty table, but the P1 reactions CloseEmptyTable and FreeTableCode expect a
  separate `Table.close` that hands back the code. I followed the reactions, so
  "delete when empty" is now an app decision (a reaction), not hidden inside Table.
- **A player sits at only one table at a time**, enforced with a unique index on the
  seat's player, as P1's "player is not seated at any table" requires.
- **New queries** for the lobby: `_get`, `_seats` and `_tableOf`.

App decisions in the composition:

- Every endpoint resolves the guest's token to their session first, and that session
  is the player, so nobody can act in someone else's name.
- An unknown join code is answered `NO_SUCH_TABLE` (HTTP 404) by the endpoint itself.
- Only the host can close a table that still has people at it (`NOT_HOST`, 403).
- **LeaveTableOnSessionEnd** (new): a guest who ends their session also leaves
  their table, so empty tables still close.
- The lobby is a former: the guest's table, its code and host, and each seat with
  the sitter's display name, joined from GuestSessioning. The page refreshes it every
  2 seconds (polling), which is enough for an MVP.

Challenges: the HTTP layer reports refusals by category (`NOT_FOUND`, `CONFLICT`,
`FORBIDDEN`) rather than by the concept's code, so the page translates categories
into messages. And the "Play as guest" form stayed visible after signing in, because
the stylesheet's `display: flex` overrode the `hidden` attribute; fixed in CSS.

Future work: a join code that is generated for a guest who is already seated stays
reserved, like the blank-name token in step 1b.
