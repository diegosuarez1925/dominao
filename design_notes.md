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
