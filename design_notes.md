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

### Step 3: the domino game

P1 had no concept for the game itself, so this step adds **DominoPlaying**, written
from the rules as I play them:

- Games are to 200 points, in two teams of partners sitting across from each other.
- Each match deals 7 random tiles of the double-six set to each player. In the first
  match, whoever holds the double six plays it at once; later matches are opened, with
  any tile, by the previous match's winner.
- On their turn a player must play a tile matching one end of the line; its other
  number becomes the new end. A player with no such tile is skipped automatically,
  and nobody can pass by choice (there is no pass action at all).
- A **domino** (a player runs out of tiles) scores the pips in the other three hands
  for that player's team.
- A **tranque** (nobody can play) scores all the pips in the four hands for the team
  whose two hands hold fewer pips; the next match is started by that team's player
  who comes first in the match's turn order.

Decisions I had to make where the rules were silent:

- **Turn order is seat order** (seat 0, 1, 2, 3, then 0 again), and counterclockwise
  is simply the direction the seats are numbered. Seats 0 and 2 are partners.
- **"Earliest in turn order" in a tranque** is counted from the player who started
  that match.
- **A tied tranque** scores nothing, and the same player starts the next match.
- **The player picks the end.** `play` takes `side` (LEFT or RIGHT); the page only
  asks when a tile fits two different ends.

Design:

- DominoPlaying is independent of tables: a game is played at a `Place` by four
  `Player`s given in turn order. The app binds Place to Table and Player to a guest
  session, and the start endpoint passes the table's seats 0 to 3 in order.
- Table stays game-free. It only gained a generic `_isFull` query, so the start
  endpoint can say "the table is not full" instead of timing out.
- Starting needs the host of a full table. Anyone getting up from the table (or the
  host closing it) **abandons** the game, since it cannot go on with three players.
- Each player's view of the game (a former) includes only their own hand.
- The concept takes a shuffle function, so tests can deal known hands; tests also
  set up exact positions to check domino, tranque, tie and game-over scoring, and
  play 15 random games to the end checking that no tile is ever lost.

Challenge: the page redraws every 2 seconds, and a redraw could remove a tile button
just as it was being clicked. It now redraws only when the game actually changed.

Future work: Matchmaking (public games), the real Vue frontend, showing the board as
a proper line of dominoes, and letting the host change the target score.

### Step 3b: the move log and a continuous board

Asked for: a log of what each player played on each turn, and whether they were
skipped; and a board that keeps snaking continuously instead of wrapping onto a new
line once it gets long.

- **The log lives in DominoPlaying.** The concept already decides when a player is
  skipped (inside `play`), so it records each turn as PLAYED with the tile, or
  SKIPPED. The opening double six counts as the holder's play. A tranque adds no
  skip rows, since the match simply ends. A new `_log` query answers the turns,
  numbered 1, 2, 3, … across the game.
- **Why the turn number:** the view's `each(...)` treats rows as a set, so two skips
  by the same player in the same match were identical rows and the second one
  vanished. The number keeps every row distinct; a test plays a whole game through
  the API and checks there are no gaps.
- **The board needed one more fact:** `_board` now says how far each tile is from the
  first tile played (`fromFirst`: negative on the left, positive on the right). The
  concept counts tiles added on the left to work this out.
- **Snake layout (page only):** the board is a 16-unit-wide grid. The first tile sits
  in the middle; the right arm runs right and, at the edge, stands a tile up and
  comes back along the row below; the left arm does the same upward. Each tile shows
  its numbers in the order they are reached, so touching halves always match.
- The log is shown under the hand, grouped by match, newest last, with skips greyed.

Future work: doubles drawn crosswise, as on a real table.

### Step 4: the Vue frontend

Asked for: replace the temporary page with Vue, keeping everything it did.

- **How Vue is built.** The starter serves the page with `bun web/server.ts`, whose
  bundler builds `index.html` on the fly. Rather than bring in a second build tool
  (Vite), a small Bun plugin (`web/vue-plugin.ts`, registered in `bunfig.toml`) compiles
  single-file components with Vue's own `compiler-sfc`. `bun run dev`, `bun run start`
  and the container all work as before.
- **Components** use the Composition API with `<script setup>`, as in the Vue prep:
  `App` picks the screen; `NameForm`, `HomeScreen` and `TableLobby` cover joining;
  `GameScreen` holds the scores, players, `GameBoard`, `PlayerHand` and `MoveLog`;
  `DominoTile` draws one domino. Each keeps its own scoped styles.
- **One place talks to the backend.** `web/session.ts` holds the tab's state (guest,
  table, game, message) and every action; `web/api.ts` has the typed client and the
  response types taken from the generated wire, so a backend change that breaks the
  page shows up in `bun run check`. The snake layout moved to `web/board.ts`.
- **Polling stays** at every 2 seconds. The game is only replaced when it changed, and
  Vue's keyed lists keep hand buttons in place, so clicks are not lost to a redraw.
- `.vue` files are not type-checked by `tsc` (that would need `vue-tsc`); the logic
  they use lives in the typed `.ts` files for that reason.
