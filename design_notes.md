# DOMINAO design notes 

# Original User Journey

My grandpa, an adamant Puerto Rican Domino player, wants to be able to play domino with his three brothers that moved away. Because he cant meet them in person, he opens Dominao, an app to play dominos with the ruleset he is used to. He has never used it, but, upon login, he is given the option join as a guest under a name. He enters "Ángel" and logs in, without any email login or verification required, going straight to the main screen. He then decides to open a private table, so that his brothers and him can play together. This shows him a 6-character code that his brother can use to join and play with him, so he gives each of them a call and tells them to open Dominao and enter that code to join his table. Each of them logs in as guests as well, and enter the code my grandpa gave them. Upon joining, my grandpa finally starts the game, and the proceed to run a match of dominos without having to be present.

# Updated User Journey

My grandpa, while in a bus taking him to the town plaza, is feeling a littl bored, and wants to play dominos to kill the boredom. So, he hops on Dominao, and logs in as a guest, skipping sign up and email confirmations. Because he has around 10 minutes until he gets to the plaza, he decides to play a quick match instead of the usual game to 200pts - so, he chooses the ruleset he would like for the game, and hops in a public lobby. After a few seconds, people queue in and a game starts, and he plays on until the game is over, just before arriving at the plaza. After his visit to a store, his brother calls him and tells him they need a fourth player for a match to 500pts, and sends him a code to join, which my grandfather uses to join the private table and play with his friends and family remotely.


## Initial plan

The plan, as of now, is to start by implementing GuestSessioning. The most basic action of the application is to be able to join and have a session, so it stands to reason this should be implemented first. From there, CodeGenerating should be implemented to refactor GuestSessioning's implementation. The first implementation of GuestSessioning can use whatever token format it wants, so long as the it works in testing - implementing CodeGenerating will formalize the process of creating tokens, as well as lay out the groundwork for implementing join codes for private tables, so it makes sense to work on that afterwards. Once that is done, Tables is the next item on the list. I want there to be random matchmaking as well, but, for the MVP, the most important part of the app is to be able to play with friends, and thats the whole purpose of Tables, so I'll work on implementing the fundamentals of creating, joining, and ending private games. After that - and, perhaps, the last thing I'll implement for the MVP - is the actual game itself. I'll need to implement the whole game engine design, which is something which sounds very engaging. This should be enough to provide a complete user jounery experience, the very bare bones of it. Each step will have tests written out for it, to make sure everything is working gradually.


## Progress log

### Guest sessions

- Now, the concept hold its own token. P1 had reactions asking CodeGenerating for a
  token and passing it to `start`, which seems to split one secret across two concepts for no
  gain, and the P1 `start` spec already said it made the token itself. CodeGenerating
  will still make table join codes.
- Tokens are implemented will be a random string for the moment, nothing fancy. for now, this       concept will creat its own tokens, which will change later
- Also implemented clear distinctions between sessionIDs and tokens. The first is pretty much
  the displayname everyone gets to see on guest sessions, the second the actual tokens used
  to remember users.
- **`resume`** now also returns the display name so one call tells the page who is back.
- **`end`** now takes the token so nobody can end someone else's session by knowing
  their public session id.
- expiry is now checked when tokens are used instead of through a system check. I set a limit
  of 12 hours per guest session, which should be plenty
- **`rename`** will be left out of the MVP; not really necessary for the core user journey
- also, the browser keeps the token in `sessionStorage`, which is separate for each
  tab, so one person can test a four-player table with four tabs.

The page in `web/` is a throwaway plain-TypeScript page for trying sessions; i'll work on using Vue later down the line


### Tokens come from CodeGenerating

- generation is implemented from the P1 spec. Codes are unique per context
  (enforced by a unique MongoDB index, with a retry if two requests draw the same
  code). They use `crypto.getRandomValues`, the same secure source as
  `crypto.randomUUID`, over 32 easy-to-read symbols with no I, O, 0 or 1.
- went back and refactored **`GuestSessioning.start`** to take in a token instead of creating it
- **FreeTokenOnSessionEnd**  returns the token to CodeGenerating when a
  session ends.
- I ran into some very particular issues with naming in sync-engine. had to change the name
  of the input fiuld `length`, renaming it to `size` (i dont fully understand why this caused
  issues, but tim happy a simple fix fixed it). Also needed to change a type name from
  `Boolean` to `Flag` for the `_isAvailable` query


### Private tables

Scope: I want to handle only table creation for now, knowing nothing about the game.
This means I'll work on creation, joiniung, and deletion: i'll leave out custom rules
for later, because that isnt as essential.

I need to modify the P1 design I had for Tables, here are some important changes:

- Now, each table holds its join code. I cant believe I forgot to include it in P1. 
  P1's reactions call `Table.open(host, rules, code)` and `_getByCode(code)`, but the 
  P1 state had no code. Table now gets its code from CodeGenerating and holds it,
  generate under the `TABLE_CODES` context
- Now, `leave` is not responsible for table deletion: `close` is. P1's `leave` deleted an
  empty table, but the P1 reactions CloseEmptyTable and FreeTableCode expect a
  separate `Table.close` that hands back the code. I followed the reactions, so
  "delete when empty" is now a reaction, not hidden inside Table.
- For now, player can sit at only one table at a time. It makes intuitive sense to enforce
  this for the time being. Playing in multiple tables at once could be something for the future
  though.
- I added some new queries for the lobby: `_get`, `_seats` and `_tableOf`.

Some other decisions during implementation include:

- Every endpoint resolves the guest's token to their session first, and that session
  is the player, so nobody can act in someone else's name.
- An unknown join code is answered `NO_SUCH_TABLE` with HTTP 404 by the endpoint itself.
- Only the host can close a table that still has people at it (`NOT_HOST`, 403).
- **LeaveTableOnSessionEnd** (new): a guest who ends their session also leaves
  their table, so empty tables still close.
- The lobby is a former: the guest's table, its code and host, and each seat with
  the sitter's display name, joined from GuestSessioning. The page refreshes it every
  2 seconds, which is enough for an MVP.

Challenges: the HTTP layer reports refusals by category (`NOT_FOUND`, `CONFLICT`,
`FORBIDDEN`) rather than by the concept's code, so the page translates categories
into messages. And the "Play as guest" form stayed visible after signing in, because
the stylesheet's `display: flex` overrode the `hidden` attribute. Had to dive into CSS
to fix this one.


### The domino game

P1 had no concept for the game itself, so this step adds **DominoPlaying**, written
from the rules as its commonly played in Puerto Rico. Here are the rules:

- Games are to 200 points, in two teams of partners sitting across from each other.
- Each match deals 7 random tiles of the double-six set to each player. In the first
  match, whoever holds the double six plays it at once; later matches are opened, with
  any tile, by the previous match's winner.
- On their turn a player must play a tile matching one end of the board; its other
  number becomes the new end. A player with no such tile is skipped automatically,
  and nobody can pass by choice.
- The awarded score for winning is the sum of the pips in the other three hands
  for that player's team.
- In *tranques* (a state when nobody has a legal move), each team sums up the pips in their
  hands. The team with lower pip count wins, and gets the whole sum of pips of everyone as
  the winning score.

Some design notes:

- I designed DominoPlaying to be independent of Table. Games are played at a `Place` by four
  `Player`s given in turn order. The app binds Place to Table and Player to a guest
  session, and the start endpoint passes the table's seats 0 to 3 in order.
- Table stays game-free. It only gained a generic `_isFull` query, so the start
  endpoint can say "the table is not full" instead of timing out.
- Starting needs the host of a full table. Anyone getting up from the table (or the
  host closing it) **abandons** the game, since it cannot go on with three players. This
  seems a little wrong, but for now, thats how sudden leaves are handled.
- Each player's view of the game includes only their own hand.
- The concept takes a shuffle function, so tests can deal known hands; tests also
  set up exact positions to check domino, tranque, tie and game-over scoring, and
  play 15 random games to the end checking that no tile is ever lost.

Challenge: the page redraws every 2 seconds, and a redraw could remove a tile button
just as it was being clicked. I changed it so that it now redraws only when the game 
actually changed.

Future work: Matchmaking (public games), the real Vue frontend, showing the board as
a proper line of dominoes, and letting the host change the target score.


### Vue frontend

up until now, the frontend was just a temporary page that would be changed to use Vue.
Not a particular fan of Vue, but now is the time the frontend changes. I had Calude really
help me out a lot for this part, here are the notes he wrote on everything that was done:

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


## P3 TO-DO list

So, for P3, I need to get the following things done:
- Implement customizable rules for games (how tranques are handles, score goals, etc.)
- Implement random matchmaking (public tables)
- Implement actual sessioning with accounts, authentication, and all of that
- Completely revamp the frontend so that it looks good
- Clean up a lot of the code

Among many other things

## P3 progress log

### Deployment

- The class platform runs one process (the `start` script) on port 3000, but the app
  had two: the backend, and `web/server.ts` serving the page on 8080. The backend now
  serves the Vue page at `/` as well, so `bun run start` is the whole app. The page is
  still bundled by Bun with the Vue plugin, once at startup in production.
- `packageManager` now names Bun 1.4, since the lockfile is written by Bun 1.4 and the
  platform installs with the version named there.
- The demo video is out of git (and `.mov`/`.mp4` are ignored): the platform rejects
  commits over 50 MB, and the recording belongs on YouTube anyway.
- `bun run preview` runs the app exactly as the platform does, for checking before a deploy.

### Matchmaking

Asked for: a button to look for a game with strangers, a waiting lobby that fills as
people join (a new one when none has room), a countdown once four are in, a way to
leave before the game starts, and the same game as private tables afterwards. Custom
rules come later, but lobbies must only mix players who want the same rules.

- **Changed from P1.** P1's Matchmaking was a plain queue whose `formGroup` took the
  four longest-waiting players at once. Players now wait *in a lobby* they can see
  filling up, so the concept keeps lobbies: `enqueue` puts a player in the earliest
  lobby with the same rules and room left (or opens one), `cancel` takes them out,
  and `launch` hands out a full lobby's players in random order. The P1 shuffle for
  random partners is kept.
- **The countdown lives in the concept.** A lobby records when it filled; `launch` is
  refused until the countdown (10 s) has run out, and anyone leaving clears it. The
  page counts down and asks to launch at zero; the server decides, so a tab cannot
  start a game early, and when all four tabs ask at once only the first gets through
  (one atomic delete). I picked this over a server timer because sync-engine has no
  timers, and it is the same "check when used" idea as session expiry.
- **A matched game is a private-table game.** A reaction turns a launched lobby into a
  new table (first player opens it, the others join in shuffled order) and starts
  the game. Everything after that, the lobby screen, the game, leaving, is the
  private-table code with no changes. Matchmaking, Table and DominoPlaying still never
  refer to each other.
- **Rules are a parameter already.** `enqueue` takes a rule set and only matches
  lobbies with the same one. (Step 6 replaced the placeholder `STANDARD` with real rule sets.)
- **Queue and table exclude each other.** A seated guest cannot queue (`AT_TABLE`), and
  a queued guest cannot open or join a table (`IN_QUEUE`); ending a session also
  leaves the queue.
- **Same waiting room.** The four-place list is now one component (`LobbySeats`) used
  by both the table lobby and the matchmaking lobby, so restyling one restyles both.

Known gaps: if all four players close their tabs during the countdown, nobody asks to
launch and the lobby stays full until someone leaves it. The matched table still shows
a join code, which nobody needs.

### Rule sets

- **DominoPlaying owns the rules.** A rule set is a named entry in one table in the
  concept (`RULESETS` in `src/concepts/DominoPlaying.ts`): the score to reach, how a
  tranque is settled (`TEAM` or `PLAYER`), the prizes for the first matches, and a
  sentence describing it. `DEFAULT` is 200 by team, `LONG` is 500 by player with
  prizes 100/75/50/25, `SHORT` is 100 by team. `start` takes the rule set's name and
  refuses one it does not know (`UNKNOWN_RULES`, answered as 400).
- **Adding a rule set is one entry.** The home screen's picker, the lobby texts and
  `/games/rulesets` all read the same list, so a new entry shows up everywhere with no
  other change. A brand-new kind of rule (not just new numbers) needs a field in
  `RuleSet` and the code that uses it.
- **Table and Matchmaking only carry the name.** Both keep the rule set they were
  opened or queued with as an opaque `Rules` value and never read it; the syncs check
  it against DominoPlaying before opening a table or queueing, and pass it on when the
  game starts. Matchmaking already matched only equal rules, so strangers who picked
  different rule sets never share a lobby.
- **Choices I made where the request was open** (easy to change):
  - Prizes go by match number and go to the team that wins the match; a tied
    tranque wins nothing, and that match's prize is not carried over.
  - In a `PLAYER` tranque the winning team scores all four hands' pips, as in a team
    tranque, and the winner starts the next match. If the fewest pips are tied
    between opponents it is a tie (no points); if tied between partners, the one
    earlier in turn order starts.
  - Tables opened before rule sets existed have no rules and their games play
    `DEFAULT`.

### Home screen styling

- **One stylesheet for shared pieces.** `web/styles.css` starts with design tokens
  (colors, fonts, spacing, corners, shadows as CSS variables), then the base page,
  layout helpers (`.page`, `.grid-2`, `.row`, `.stack`) and components (`.logo`, `.btn`
  with `--secondary`/`--ghost`/`--small`/`--block`, `.input`, `.select`, `.field`,
  `.panel`, `.media`, `.avatar`, `.chip`, `.notice`, `.divider`). Every action button is
  a `.btn`, so changing that one rule restyles all of them. Components keep only
  one-off styles in their own `.vue` file.
- **Colors:** a muted red (`--red-*`) for the page and main buttons, light blue
  (`--blue-*`) for accents (panel strips, focus rings, the logo's "!"), cream and white
  for panels. Fonts: Bungee for the logo and panel titles, Nunito for text (Google Fonts).
- **Background:** an SVG pattern of white outlined dominoes on a red gradient, on a
  fixed layer that drifts diagonally over 90 s; it holds still for people who ask their
  system for reduced motion.
- **Layout:** a header with the logo on the left and the guest's chip (initial, name,
  Leave) on the right; it wraps under the logo on phones. The two ways to play are two
  panels side by side that stack below about 42rem. Each panel has its own rules
  picker (`RulesPicker.vue`).
- Lobbies and the game are not restyled yet; they sit in a plain panel so they stay
  readable on the red background.

### Lobby and game screens

- **Screens slide into each other.** `App.vue` picks one screen (name, home, table
  lobby, matchmaking lobby, starting, game) and swaps them with a shared `screen`
  transition (fade and rise, out-in). Smaller shared transitions live in
  `styles.css` too: `pop` (things appearing), `fold` (panels opening), `tile` (tiles
  joining or leaving a hand). All motion stops for people who ask for reduced motion.
- **Lobbies are a square table.** `LobbyTable.vue` draws the table (`.felt`, the
  same cloth as the game board) with a `PlayerBadge` on each side: the guest at the
  bottom, then counter-clockwise. A private table shows the join code in the middle;
  matchmaking shows a spinner, then the countdown. On phones the side seats move
  above the table, two by two.
- **The game is laid out around the table.** The guest sits at the bottom with their
  hand face up and standing; the next player in turn order is on the right, the
  partner across, the player before on the left, each with their hand face down so
  the tile count shows. The player whose turn it is gets a glowing light-blue ring.
  On phones the other three sit in a row above the board (left, across, right) so
  the board gets the full width.
- **Board turns take two standing tiles.** `layOut` in `web/board.ts` now places two
  vertical tiles at every turn, so runs are separated by an empty row
  (`tests/web/board.test.ts` checks no overlaps and the gap).
- **Dominoes show pips** instead of digits (`DominoTile.vue`), and can be face down.
- **Score table and move log fold away.** The score card (us vs them, points to go,
  rules, match, last result) folds to one line; the move log is a side bar opened by a
  tab on the right edge. Both remember open or closed per device (localStorage).
- **A finished or stopped game stays on screen** with its result and a "Back to
  lobby" button (and "Play again" for the host of a full table); going back is
  remembered in the page (`dismissedGame`), and a new game shows again on its own.
- Known gap: the score card shows the last match only; a match-by-match history would
  need the backend to keep every result.

### Capicú, Chuchazo, crossways doubles and match animations

- **Capicú and Chuchazo live in DominoPlaying.** A domino whose last tile is 0-0 is a
  `CHUCHAZO`; one whose last tile is not a double and whose two numbers are the
  board's two ends before it was played (one each) is a `CAPICU`. Every rule set records them in the match result
  (`special`, `bonus`); only LONG pays (`bonuses: { CAPICU: 100, CHUCHAZO: 100 }` in
  its `RULESETS` entry), on top of the pips and any prize.
  - Decided: ends showing the same number do not make a Capicú. 3-5 is a Capicú
    only on ends 3 and 5, not on 3 and 3 (asked and confirmed).
- **Doubles lie across the line.** `layOut` stands a double across a flat run (and
  lays it across a drop), centred on the line. At a corner a double keeps the snake
  going from one of its ends, never its long side; `tests/web/board.test.ts` checks
  no overlaps and that every tile touches the one before it.
- **Match celebrations.** When a match ends, `MatchCelebration.vue` covers the table:
  ¡Dominó! / ¡Tranque! / ¡Capicú! / ¡Chuchazo!, who won, then the points line by line
  (pips, prize, bonus) and a counting total, with falling dominoes. Capicú adds
  turning light rays and a glow; Chuchazo slams a double blank down and shakes the
  screen. The score table holds the old scores until it closes, then counts up. Tap to
  skip. Opening the page later does not replay it.
- **Passes.** A player who is skipped shows a "¡Paso!" bubble and shakes their head;
  several skips play one after another.

### Review against the course rubrics

Asked for: check the whole codebase against the implementation, testing, interaction
design and visual design rubrics, and fix what falls short.

**Implementation**
- *Faithfulness.* The concepts are the P1 ones (GuestSessioning, CodeGenerating, Table,
  Matchmaking) plus DominoPlaying, each matching its spec in `design/concepts`;
  `bun run check:design` and `bun run check` pass. Drift from P1 is recorded in the
  sections above (rules on tables and lobbies; lobby-based matchmaking).
- *Modularity.* No concept imports another. Table knows nothing about games, and
  DominoPlaying knows nothing about tables: a game's `place` is just an id, and
  `src/compositions/Games.ts` is the only place that ties them together.
- *Integration.* Every user action goes through one endpoint, and every cross-concept
  effect (freeing codes, abandoning games, seating launched lobbies) is a reaction.
- *Intentional development.* Each step has its own commit and an entry in this log.

**Testing** (what changed)
- The game-rule tests used to start a game and then overwrite its hands, board and
  scores in the database. That tests around the concept rather than through it. They
  now drive DominoPlaying only through `start` and `play`, with a seeded shuffle
  passed to the concept (`tests/support/dominoes.ts`): the same seed always deals the
  same hands, and a simple player plays forward until the case under test (a tranque,
  a capicú, a chuchazo, a tie...) happens. Each test then checks the result against
  the hands it read through the concept's queries, so the scores are recomputed from
  the rules, not copied from the code.
- Composition tests read CodeGenerating's state through its `_isAvailable` query, not
  its collection.
- New tests for who may do what: an outsider playing in someone's game (refused,
  since it is never their turn, and the game stays as it was), another table's game
  staying hidden, joining while already seated, leaving a table you are not at,
  looking for strangers while at a table, and illegal tiles through the API.
- `bun run test:save` saves the run to `tests/output.txt`.

**Interaction design** (what changed)
- *Forgiving.* Leaving a game, closing a table, and signing out while seated or
  queued now ask first (`web/dialog.ts`, `ConfirmDialog.vue`), saying what will happen
  to the other players. Picking a side for a tile can be cancelled. Buttons are
  disabled while a request is on its way, so double clicks don't send twice.
- *Informative.* Every refusal has its own sentence instead of an error code
  ("That code doesn't match any open table", "That table is full"). Losing the
  connection says so and clears itself when the server answers again; an ended
  guest session sends the guest back to the name form with a note. Messages can be
  dismissed.
- *Directed.* The lobby says what it is waiting for ("2 more players needed",
  "Waiting for Abuelo to start"), the player's badge says whose turn it is, and the
  ending tells non-hosts that the host can start another game.
- *Understandable.* The name and join-code fields explain their format before the
  guest gets it wrong, and the join button stays disabled until the code is complete.
  The header's "Leave" is now "Sign out", since "Leave" also meant leaving a table.
- A "Leave game" button on the game screen: before, the only way out of a game was
  signing out.

**Visual design** was checked at 1366, 1024, 768 and 390 px wide. One palette (muted
reds, light blue, white), one display face for titles and one text face, shared
components in `web/styles.css`, and no horizontal scrolling on phones.

**Known gaps.** A full matchmaking lobby whose four players all close the page during
the countdown waits until one returns. The score card shows only the last match.

## P4 progress log

### Access control review

Asked for: review who may do what across the app, and test it.

- Every endpoint that acts for a guest takes only their token, and every reaction
  names the guest from that token (`GuestSessioning.resume`), never from the request.
  Session ids are shown in views (to tell seats apart) but are never accepted as tokens.
- What each guest may do: anyone seated may view their own table and game (only their
  own hand); only the host may start or close a table; only the player whose turn it is
  may play; only someone waiting in a lobby may launch it.
- New tests (`tests/compositions/AccessControl.test.ts`) check, for all 14 guest
  endpoints, that an invented token, a signed-out token and another guest's session id
  are all refused (401) without changing anything; that naming another guest in the
  request (`session`, `host`, `player`) does nothing; that no response ever carries
  another guest's token; that a seated guest cannot open a second table; that a
  game cannot be restarted while it runs, nor played after it stops; and that a
  matched stranger can only act as themself.
- Found: a guest whose session expired (12 hours idle) kept their seat, since
  expiring deleted the session without ending it, so the reactions that free seats and
  queue places never ran. Their table showed a seat with no name, and if they were the
  host nobody could start or close it.

### Expiring idle sessions

Asked for: fix the expired-guest bug above, bringing back P1's `system_expire`.

- GuestSessioning has P1's expire action again, as `expire(session)`: it ends a
  session only if it has been idle longer than the limit (`NOT_IDLE` otherwise), and
  returns its token. `resume` now only refuses an idle token instead of deleting the
  session itself, and a new `_idle()` query lists idle sessions.
- The server runs `src/expiry.ts` every ten minutes: it reads `_idle()` and asks
  `/guests/expire` for each one, so expiring goes through the engine and reactions
  fire. Three reactions mirror the ones for `end`: the expired guest gets up from their
  table (the host passes on, and a running game stops, as when anyone leaves), stops
  waiting in a lobby, and their token is freed.
- `/guests/expire` is reachable over HTTP like every endpoint, but it is harmless:
  it takes no token and refuses any session still in use.
- Tests: concept tests for expire and `_idle`; `tests/compositions/Expiry.test.ts`
  checks an idle host's seat, host role and token are freed, an idle player's game
  stops, an idle guest leaves their lobby, and an active session cannot be expired.

### Validating the deployed app

- `bun run check:deploy` (`scripts/validate-deploy.ts`) checks the live app from the
  outside, through HTTP only: bad tokens, who may start, close, see and play, illegal
  moves and bad input. With `--keep` it leaves a game running, and after a redeploy
  `--after-redeploy` checks the same guests, table and game are still there.
- Run on 2026-10-27 against https://dominao.mit-sdg.dev: all 43 checks passed,
  including persistence across a redeploy. Output: `tests/deploy-output.txt`.

### Leaving mid-game: pausing, replacements and bots

Asked for: when someone leaves, pause the game instead of ending it; wait 30 seconds
(shown) for a person to take the seat, then put in a bot that plays random legal
moves; let a person take over from the bot later. At private tables anyone joining
may take the seat; at tables of strangers only someone who chose the same rules and
said they are OK joining games midway. End the game only if all four people leave.

**Concepts**
- *DominoPlaying* (changed). New status `PAUSED`, and new log moves `LEFT` and `SAT`.
  `vacate(game, player)` empties a seat, keeping its hand, and pauses the game;
  `seat(game, position, player)` puts someone in an empty seat with that hand, and
  play resumes once no seat is empty. Nobody can play while paused (`GAME_PAUSED`).
  `autoplay(game, player)` plays for whoever's turn it is, picking from every legal
  move with a *move chooser* passed to the concept (random for now); swapping the
  chooser in `src/assembly.ts` changes how every bot plays and nothing else. New
  queries: `_turn` (whose turn, and for how long), `_vacancies` (empty seats, who
  left them, for how long), `_gameOf`, `_running`. DominoPlaying's players are now
  "seat holders" (a guest's session or a bot) in `design/types.md`. Vacate and seat
  retry if the game changed underneath them, so a play and a leave at the same moment
  never lose either.
- *Botting* (new). Creates bots with names like "Bot Chago"; `_name(bot)` answers
  only for bots, which is how the app tells a bot from a person. Kept separate from
  DominoPlaying so the game never needs to know who is a bot.
- *Matchmaking* (changed). Entries remember `midway` (whether the player is OK joining
  a game in progress), and `_midwayWaiting(rules)` finds the one who has waited
  longest. Matchmaking now also remembers the tables its launched lobbies play at
  (`adopt`, `release`, `_places`, `_placeRules`), which is what makes a table "public".
- *GuestSessioning* (small change). `_idleFor(session)` says how long since a guest's
  page last checked in, used to show "reconnecting…" and to drop vanished players.

**Reactions** (new composition `Seats`, plus changes in `Games`, `Tables`, `Matchmaking`)
- `AbandonGameWhenPlayerLeaves` is gone. Leaving a table during a game now
  `vacate`s the seat (`VacateSeatWhenPlayerLeaves`). The game is abandoned only by
  closing the table, which happens on its own when the last person leaves.
- Bots never take Table seats; only people do. So a free Table seat always means an
  empty or bot seat in the game, and since Table hands out the lowest free seat, table
  positions stay game positions. Joining a table mid-game `seat`s the joiner
  (`TakeEmptySeat`) or, if a bot holds that seat, vacates the bot and seats the joiner
  (`ReplaceBotWithJoiner`).
- A one-second server ticker (`src/ticker.ts`) asks three endpoints: `/games/seat-bot`
  once a seat has waited 30 s, `/games/bot-move` once a bot has "thought" for 1.5 s,
  and `/games/drop-absent` for a guest whose page has not checked in for 45 s (which
  leaves the table for them, pausing the game). Each endpoint re-checks the time
  itself, like `/guests/expire`, so asking early or as anyone else changes nothing.
  Timings are in `src/timing.ts`.
- Tables of strangers: a midway guest who asks for a game while such a table with
  their rules has a seat to fill is sent there at once (`SendMidwayGuestToOpenSeat`);
  when a seat empties there, the longest-waiting midway guest is sent
  (`FillEmptySeatFromQueue`); being seated removes them from their lobby
  (`StopWaitingOnceSeated`); closing the table forgets it (`ForgetClosedTable`).
  Joining such a table by its code is refused (`PUBLIC_TABLE`, 403), so its seats only
  go to strangers who opted in.

**Frontend**
- A "Game paused" card on the board names who left, counts down to the bot with a
  bar, and says what it waits for: the table code to share (private) or a stranger
  who chose these rules and is OK joining midway (public).
- The empty seat shows a dashed circle, "Papo's seat", "empty · bot in 23s", and its
  tiles faded. A bot has a robot face and a BOT tag. A player not heard from for 7 s
  is faded with a pulsing dot and "reconnecting…".
- Short notes pop up when someone leaves, sits down, a bot takes a seat, someone takes
  over from a bot, or a player who seemed disconnected is back. Someone arriving
  mid-game is told whose seat and tiles they took. The move log lists leaves and
  sit-downs.
- Home: a "Join games in progress" switch under "Play with strangers", remembered on
  the device; the waiting screen reminds the guest when it is on.
- Leaving asks first and says what happens (pause, bot after 30 s, and at a private
  table that they can come back with the code while the seat is open). A guest taken
  out for being away is told so when their page comes back.

**Tests.** Concept tests for vacate, seat, autoplay (including a cheating chooser and
a whole game of autoplay), Botting, and Matchmaking places and midway waiters.
`tests/compositions/Replacement.test.ts` (12 tests, with a hand-moved clock and the
ticker run by hand) covers the 30 s wait and the bot, bot moves, a joiner taking over
from a bot with its hand, one guest and three bots finishing a whole game, the game
ending only when everyone leaves, dropping a vanished player, the public rules (same
rules and opt-in, in both orders, a bot replaced by a midway stranger, no joining by
code, a closed table forgotten), and the ticker endpoints refusing early or wrong
asks. Older tests that expected leaving to end the game now expect a pause. 116 pass.
Checked by hand in a browser with four players (private and public).

**Known limits.** A guest whose tab is in the background for minutes can be slowed
by the browser enough to be dropped after 45 s; their seat stays open (or held by a
bot), so they can take it back. If two tables of strangers need someone, a midway
guest goes to the first one found.

### How to play

Asked for: a how-to-play panel on the home screen, opened by a button.

- A "How to play" button above the two home panels opens a pop-up
  (`web/components/HowToPlay.vue`): the table and teams, a turn (with three example
  tiles meeting at matching numbers), who starts, the ways a match is won (domino,
  tranque, capicú, chuchazo), the rule sets as the server lists them (so a new rule
  set shows up here too), and how playing here works: private tables, strangers,
  what happens when someone leaves, and "Join games in progress".
- It closes with "Got it", the ×, Escape, or a click outside, and the rules scroll
  inside it so the button stays in reach on phones. Checked at 1200 and 390 px wide.
- Also fixed: signing out mid-game still warned that the game "will stop for all four
  players". It now says the game pauses until someone (or, after 30 seconds, a bot)
  takes the seat, and it also warns during a paused game.
- Frontend only: no concept, reaction or API changes.

### A score table with every match

Asked for: the in-game score card to list every match like a hand-written score
sheet (one row per match), with matches won by Us and by Them told apart at a glance,
and the two columns more clearly separated.

- **Backend.** DominoPlaying already kept every match's result but only answered the
  last one. A new query, `_results(game)`, answers them all in the order played (spec
  in `design/concepts/DominoPlaying.md`). The game view (`GameView` in
  `src/compositions/Games.ts`) now carries them as `results`. No new action, reaction
  or endpoint, and no P1 concept changes: it is a read of state the concept already had.
- **The card** (`web/components/ScoreCard.vue`) is drawn like the sheet at a real
  domino table: an Us column and a Them column with the players' names, a numbered
  line per match with the points written under whoever won it (and a small label for
  a tranque, capicú or chuchazo), "tie · nobody scores" across both columns for a
  tied tranque, and a "being played…" line for the current match. Totals and points
  "to go" sit under a double line.
- **Who won, at a glance:** a match we won is a blue cell with a blue rule on its
  edge; one they won is a red cell with a red rule. The empty side stays blank paper.
- **Less cluttered:** a ruled line down the middle between the columns, wider
  padding, dashed lines between matches, and the match numbers in a narrow margin.
- Long games scroll inside the card, keeping the column headings and the totals in
  view, and it jumps to the newest line when one is written. While a match's
  celebration plays, its line waits, as the scores already did. The fold-down "Us X vs
  Them Y" bar is unchanged.
- Tests: the whole-game concept test checks `_results` after every match (all of
  them, in order, the newest equal to `_lastResult`) and that they add up to the final
  score under every rule set; the Games composition test checks the same through the
  view. 116 pass. Checked by hand at 1200 and 390 px wide.

### The server starts games of strangers

Asked for: matchmaking games are started by the server; private games are still
started by their host.

- **Before:** every waiting page counted down and, at zero, asked
  `/matchmaking/launch` with its token; the first ask launched the lobby. A game of
  strangers only started if at least one of their tabs was open and awake.
- **Now:** the server's one-second ticker (`src/ticker.ts`, the same one that seats
  bots) asks Matchmaking which full lobbies are ready and launches each one. The page
  only shows the countdown, then "Dealing the tiles…" until the table appears.
- **Concept change:** Matchmaking gets one query, `_ready()`: every full lobby whose
  countdown has run out, the one that filled first first. `launch` is unchanged and
  still refuses an early ask (`COUNTDOWN_RUNNING`), and only the first of several asks
  succeeds.
- **Endpoint change:** `/matchmaking/launch` now takes the `lobby` and no token, like
  the other ticker endpoints (`/games/seat-bot` and friends). It is safe to leave open:
  it can only do what the server is about to do anyway, at the time it would do it.
  A launched lobby is still seated by `SeatLaunchedLobby` exactly as before.
- Tests: the Matchmaking composition tests now run the ticker by hand instead of
  having players launch (too early it leaves the lobby alone; once the countdown is
  over the game starts with nobody asking; several ready lobbies launch in one tick,
  each into its own game; an unknown or missing lobby is refused); a concept test for
  `_ready`. 118 pass. Checked in a browser: four queued guests got their game with no
  page asking.

### Choosing seats at a private table

Asked for: a way to move people between seats at a private table before the game
starts, since until now join order alone decided the teams.

- **Concept change (Table):** a new action, `swap(table, first, second)`. Whoever sits
  in one seat moves to the other and vice versa; either may be empty, so it also moves
  one player to a free seat. It refuses `SAME_SEAT` for one seat twice and
  `NO_SUCH_TABLE`. The host stays host wherever they sit. Table still knows nothing
  of games: it is the composition that limits when swapping is allowed. This is the
  one addition to the P1 Table concept, and the principle now includes it (Abuelo
  swaps seats 1 and 2 to sit across from the brother he wants as partner).
- **Endpoint:** `/tables/swap` (token, first, second). Only the host
  (`NOT_HOST`), only while no game is ACTIVE or PAUSED at the table, because then
  seats are its turn order (`GAME_IN_PROGRESS`), and not at a table of strangers,
  whose seats were drawn at random (`PUBLIC_TABLE`). Seats must be whole numbers 0 to 3.
  Starting a game is unchanged: DominoPlaying is still started with the table's seats
  in order, so the swapped seats are the game's turn order and teams.
- **Screen:** at a private table, before the game, the host taps a seat (it lifts and
  gets a light-blue ring), then another, and the two swap; tapping the same seat
  cancels. A line under the table says partners sit across from each other and how to
  swap; the other players are told the host can do it.
- Known limit: two swaps of the same seats sent at the very same moment are not
  atomic. Only the host can swap, and their page sends one at a time, so this does
  not come up in use.
- Tests: concept tests (swap two players, move one to an empty seat, two empty seats,
  host kept, `SAME_SEAT`, unknown table); composition tests (the host picks partners
  and the game follows the new order; others are refused; bad seat numbers; no
  swapping once the game starts; moving to an empty seat; a guest at no table); the
  access-control sweep now covers `/tables/swap`, and no stranger can rearrange a
  matched table. 121 pass. Checked in a browser at 1200 and 390 px.

### Closed tabs no longer hold a seat before the game

Asked for: someone who closes the tab at a table (without pressing Leave) should not
leave everyone stuck, but someone sitting idle with the page open must stay.

- **Before:** in a game, a page that stopped checking in for 45 s was taken out and
  the game paused (Step 10). But at a table with no game yet, or in the queue for
  strangers, a closed tab kept its place until the guest session expired (12 hours):
  a private table could not fill, a host who left could not be replaced, and a lobby
  could launch around someone who was gone.
- **Now:** the server's one-second ticker also takes out, as if they had left, anyone
  whose page has not checked in for **two minutes** while sitting at a table with no
  game being played (`/tables/drop-absent`: hosting passes on, an empty table closes
  and frees its code) or while waiting in the queue (`/matchmaking/drop-absent`: a full
  lobby's countdown stops). Both endpoints check the time themselves and answer
  `STILL_HERE` if asked early; the table one answers `GAME_IN_PROGRESS` during a game,
  where the 45 s rule applies.
- **Idle is not away.** An open page checks in every two seconds on its own, so a
  guest who just sits there is never taken out. Two minutes (not 45 s) because nobody
  is waiting on them yet, and because browsers may slow a background tab's timers to
  about once a minute, so someone who only switched tabs is safe.
- **Concept changes:** two listing queries the ticker needs, `Table._tables()` and
  `Matchmaking._lobbies()`. No actions changed.
- **Page:** if a page that was asleep or offline comes back to find it was taken off
  its table or out of the queue, it says so (with the table code to sit back down).
- Tests (clock moved by hand): a closed host tab is taken off after exactly two
  minutes while the idle open pages stay, and hosting passes on; a lone sitter's table
  closes and its code is freed; a closed tab leaves the queue while idle ones keep
  waiting; early asks and asks during a game are refused. 125 pass. Checked live in a
  browser: the host closed his tab, the other guest's page sat idle for 2 min 15 s,
  and only the host was taken off.

### Splitting guest sessions, to make room for accounts

Asked for: permanent accounts with usernames and passwords. This first step changes
nothing anyone can see; it only splits GuestSessioning so that a session can belong
to an account as well as to a guest.

- **Why split:** GuestSessioning did two jobs, keeping a guest's display name and
  recognizing a browser by its token. Accounts need the second job but not the first,
  so they get separate concepts (the design approved before this step):
  - **Guesting** keeps a guest and their display name (`create`, `forget`, `_name`).
  - **Sessioning [Player]** recognizes a browser by its token and answers which
    player it acts as (`start`, `resume`, `end`, `expire`, `_idle`, `_idleFor`,
    `_tokens`). It does not know whether that player is a guest or an account.
- **Refinement during implementation:** each session gets its own `lifetime` in
  `start`, instead of one inactivity limit for everyone. Guests keep 12 hours; accounts
  will get 30 days. `resume`, `expire` and `_idle` honour each session's own lifetime.
  A bad lifetime is refused `INVALID_LIFETIME`.
- **A player can have several sessions** (a phone and a laptop, once there are
  accounts). `_idleFor` counts the most recently used one, and the reactions that get
  a player up from their table, out of the queue, or forget a guest now fire only when
  their **last** session ends or expires.
- **API:** `/guests/start` answers `{player, token}`. Signing out is `/sessions/end`,
  "who am I" is `/sessions/me` (`{player, displayName}`), and the timer's expiry is
  `/sessions/expire`. Responses say `player` where they said `session`, and session
  ids are no longer handed out at all.
- **New reactions:** a guest left with no session is forgotten
  (`ForgetGuestOnSessionEnd`, `ForgetGuestOnSessionExpire`).
- **Data from before this step:** sessions now live in a new collection, so everyone
  signed in before the deploy is asked for their name again. Anyone left at a table
  or in the queue with no session at all is now taken out by the ticker, which clears
  the seats and queue places of those old sessions.
- Tests: new concept tests for Sessioning (21: lifetimes, several sessions per player,
  exact lifetime edges, refusals change nothing, racing starts) and Guesting (8);
  composition tests for the new endpoints and reactions (signing out of one of two
  sessions keeps the player seated, queued and named; the last one does not), expiry
  edge cases, and players with no session being taken out. Every earlier test was
  kept and moved to the new names. 161 pass. Checked in a browser: start as a guest,
  open a table, play, sign out.

### Accounts: usernames, passwords and sign-in limits

Asked for: permanent accounts with unique usernames and passwords that are not
simple, no email verification, built on the split from the step before. Stats and
friends come later. This step is the server side; the page comes next.

- **Two new concepts** (as designed and approved before this step):
  - **PasswordAuthenticating** keeps accounts: `register`, `changePassword`,
    `unregister`, and the queries `_verify`, `_byUsername`, `_username` and
    `_weaknesses`. Usernames are 3 to 20 letters, digits, `_ . -`, start with a letter
    or digit, and are unique whatever their case. Passwords are hashed with argon2id
    (`Bun.password`) and never stored or returned.
  - **Throttling [Key]** counts failures per key: five in fifteen minutes lock the key
    for fifteen minutes. The key is the account, so changing the username's case does
    not get around it.
- **"Not simple" means** all of: 10 to 128 characters; three of lowercase, uppercase,
  digit and symbol; not containing the username; and not a common password, also when
  dressed up ("Password123!", "P@ssw0rd2026" and "D0m1n0es-2026" are all refused).
  `/accounts/password-check` lists the rules a password breaks, for the sign-up page.
- **Endpoints** (Accounts composition): `/accounts/register`, `/accounts/signin`,
  `/accounts/password-check`, `/accounts/password` and `/accounts/delete`. Signing out
  and "who am I" are the shared `/sessions/end` and `/sessions/me`; for an account,
  `me` also answers `username`.
- **Sign-in answers:** the right pair starts a session (30 days) and starts the
  failure count over. A wrong password counts a failure. A wrong password and an
  unknown username both answer `WRONG_CREDENTIALS` (401), and take as long, so nobody
  can learn which usernames exist. A locked account answers `TOO_MANY_ATTEMPTS` (403),
  even for the right password; guesses while locked are not counted.
- **The account is the player**, so two browsers signed in to one account are one
  player at one table. Signing out of one browser keeps the seat; signing out of the
  last one gets the account up from its table and out of the queue, as for a guest.
  (The design had suggested keeping the seat even then, but a player with no session
  left could never be timed out of a game, so the game would wait forever.)
- **Changing the password** signs out every other browser
  (`SignOutOtherSessionsOnPasswordChange`, which uses a new `Sessioning._others`
  query), but not the one that changed it. **Deleting an account** needs its password,
  frees the username, signs it out everywhere (which gets it up from its table and out
  of the queue, and pauses its game) and forgets its failed sign-ins.
- **Names:** wherever a guest's display name shows (lobby, queue, game, move log), an
  account's username shows instead, so the page needs no change for that.
- Tests: PasswordAuthenticating (24: every username and password rule and its edges,
  case, hashing, racing registrations), Throttling (12: windows, locks, reset,
  failures at once), and Accounts end to end (31: registering, the four sign-in
  answers, locking and unlocking, two browsers, lifetimes and the expiry timer,
  changing the password, deleting, and that no response carries a password or hash).
  The access-control sweep covers the new endpoints. The deployment check gained an
  accounts section that registers, signs in and deletes a throwaway account.
  228 pass.

### Sign up and log in on the first page

Asked for: on the front end, for now, the only difference is the first page, with
separate options to sign up or log in.

- **Before:** the first page only asked for a name to play as a guest.
- **Now:** the same card has a three-way switch: **Guest** (the old form, unchanged),
  **Log in** (username and password) and **Sign up** (username and password).
  - Signing up lists the four password rules. As you type, the page asks the server
    which ones the password breaks (`/accounts/password-check`) and ticks each met
    rule in green; **Create account** stays disabled until the username fits its rule
    and every password rule is met. It also says plainly that, without email, a
    forgotten password cannot be recovered.
  - Passwords have a Show/Hide button, and the boxes use the right `autocomplete`
    values so password managers fill and save them.
  - Errors say what to do: "That username and password don't match", "Too many wrong
    passwords for this account. Wait 15 minutes and try again", "That username is
    taken".
- **Everything after the first page is unchanged.** An account's username shows
  where a guest's name would (header, tables, games), because the server answers it
  in the same field. Signing out goes back to the first page. A session ending now
  says "You were signed out. Log in or pick a name to keep playing."
- The token still lives in the tab's `sessionStorage`, as before, so a regular logs in
  again in a new tab. Remembering the sign-in across tabs is a small follow-up if
  wanted.
- Checked in a browser at 1200 and 390 px: signing up (a weak password keeps the
  button disabled, a strong one ticks every rule), landing on the home screen as the
  account, signing out, a wrong password, logging in with the username in other
  capitals, and a taken username. No horizontal scrolling on the phone.
