# DOMINAO design notes 

# User Journey

My grandpa, an adamant Puerto Rican Domino player, wants to be able to play domino with his three brothers that moved away. Because he cant meet them in person, he opens Dominao, an app to play dominos with the ruleset he is used to. He has never used it, but, upon login, he is given the option join as a guest under a name. He enters "Ángel" and logs in, without any email login or verification required, going straight to the main screen. He then decides to open a private table, so that his brothers and him can play together. This shows him a 6-character code that his brother can use to join and play with him, so he gives each of them a call and tells them to open Dominao and enter that code to join his table. Each of them logs in as guests as well, and enter the code my grandpa gave them. Upon joining, my grandpa finally starts the game, and the proceed to run a match of dominos without having to be present.ß

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
  lobbies with the same one. For now the app always passes `STANDARD`.
- **Queue and table exclude each other.** A seated guest cannot queue (`AT_TABLE`), and
  a queued guest cannot open or join a table (`IN_QUEUE`); ending a session also
  leaves the queue.
- **Same waiting room.** The four-place list is now one component (`LobbySeats`) used
  by both the table lobby and the matchmaking lobby, so restyling one restyles both.

Known gaps: if all four players close their tabs during the countdown, nobody asks to
launch and the lobby stays full until someone leaves it. The matched table still shows
a join code, which nobody needs.
