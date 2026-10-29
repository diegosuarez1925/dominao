# DOMINAO: final design

DOMINAO lets four people play Puerto Rican dominoes online: friends at a private table they find by a code, or strangers matched by the rules they want. Anyone can play as a guest; regulars can keep an account. This document says how the final app differs from the P1 concept design and the P3 visual design, and why.

| | Link |
|---|---|
| Deployed app | https://dominao.mit-sdg.dev/ |
| P1 concept design | [P1 TASKS/concept_design.md @ dbff947](https://github.com/diegosuarez1925/dominao/blob/dbff947/P1%20TASKS/concept_design.md) |
| P3 specs and visual study | [design/ @ 5a185f9](https://github.com/diegosuarez1925/dominao/tree/5a185f9/design), [README @ 5a185f9](https://github.com/diegosuarez1925/dominao/blob/5a185f9/README.md#visual-design-study) |
| Final specs | [design/concepts](design/concepts), [design/compositions](design/compositions) ([@ 3faa9f6](https://github.com/diegosuarez1925/dominao/tree/3faa9f6/design)) |
| Every endpoint | [generated/dominao.md](generated/dominao.md) |
| Step-by-step notebook (what was asked, what changed, how it was tested) | [design_notes.md](design_notes.md) |

## Concepts: P1 vs. final

P1 had four concepts. The final app has thirteen: three from P1 (each changed), P1's GuestSessioning split in two (**Sessioning** and **Guesting**), **DominoPlaying** (the game itself, which P1 left for later), **Botting**, and, for accounts, **PasswordAuthenticating**, **Throttling**, **Friending**, **Inviting** and **Seeing**, and **Tallying** for statistics. No concept refers to another. Every link between them is a reaction or endpoint in [src/compositions](src/compositions).

### GuestSessioning, now Sessioning and Guesting: [Sessioning](design/concepts/Sessioning.md), [Guesting](design/concepts/Guesting.md)
- **Split in two for accounts** ([Step 18, dd00747](https://github.com/diegosuarez1925/dominao/commit/dd00747)). GuestSessioning did two jobs: keeping a guest's name, and recognizing a browser by its token. Accounts need the second but not the first. **Guesting** keeps P1's purpose (play under a name without an account); **Sessioning [Player]** recognizes a browser for any player, guest or account, with a lifetime per session (12 hours for a guest, 30 days for an account). A player can have several sessions (a phone and a laptop) and leaves their table only when the last one ends.
- **Same purpose and principle:** a guest picks a name, the browser keeps a token, and the guest resumes with it.
- **Token comes in from outside.** `start(displayName, token)` takes a token that CodeGenerating made, as P1's reactions already implied. ([Step 1b, 3fdcea8](https://github.com/diegosuarez1925/dominao/commit/3fdcea8))
- **Dropped `rename`:** nothing in the app needed it.
- **Expiry runs on the server.** P1's `system_expire` became `expire`. A server timer ends sessions idle for 12 hours, and reactions free their seat, queue place and token. ([Step 9b, 0a805d7](https://github.com/diegosuarez1925/dominao/commit/0a805d7))
- **Added `_idleFor`.** It tells how long a guest's page has been silent, which is what the "player left" rules below build on.

### CodeGenerating: [spec](design/concepts/CodeGenerating.md)
- **Unchanged in spirit:** unique codes per context (`SESSION_TOKENS`, `TABLE_CODES`).
- **`length` renamed to `size`.** The sync engine dropped an input named `length`, so reactions never matched it.

### Table: [spec](design/concepts/Table.md)
- **Holds its join code.** P1's reactions used `_getByCode`, but P1's state had no code. ([Step 2, 6f70cd7](https://github.com/diegosuarez1925/dominao/commit/6f70cd7))
- **Knows nothing about games.** P1's `status` (OPEN/PLAYING), `start` and `finish` were removed. Whether a game is running is asked of DominoPlaying, and starting a game is an endpoint that reads the table's seats in order. This keeps Table reusable and stops the two concepts from tracking the same thing twice.
- **Leaving and closing are separate actions.** `leave` no longer deletes an empty table. A reaction calls `close`, which hands back the code to free, as P1's own reactions expected.
- **`moveSeat` came back as `swap`** ([Step 14, 9c10237](https://github.com/diegosuarez1925/dominao/commit/9c10237)).
  - The host swaps two seats, and either can be empty. Partners sit across from each other, so this is how teams are chosen.
  - It's allowed only before a game, and only at private tables.
  - P1 let each player move themselves. Giving it to the host avoids two players fighting over a seat.
- **Dropped `setRules`:** the host picks the rules when opening the table.

### Matchmaking: [spec](design/concepts/Matchmaking.md)
- **Lobbies instead of a hidden queue.** P1's `formGroup` silently took the four longest-waiting players. Now players wait in a lobby they can watch fill, and a 10-second countdown starts once it is full. `launch` hands out the four in random order, which keeps P1's random partners. ([Step 5, 5ea33a8](https://github.com/diegosuarez1925/dominao/commit/5ea33a8))
- **The server launches, as P1's `system` action meant.** At first the waiting pages asked to launch at zero. Now the server's one-second ticker launches every ready lobby, so a game starts even if every tab is in the background. ([Step 13, 132c36b](https://github.com/diegosuarez1925/dominao/commit/132c36b))
- **Rules stay a parameter.** Only players who chose the same rule set share a lobby.
- **New: joining a game midway.** A player can opt in to take an empty seat in a game of strangers already being played. Matchmaking remembers where its games are played (`adopt`/`release`) and who opted in (`_midwayWaiting`). Players who want a fresh game are never dropped into half-lost ones. ([Step 10, 1792e05](https://github.com/diegosuarez1925/dominao/commit/1792e05))

### DominoPlaying (new): [spec](design/concepts/DominoPlaying.md)
- **The whole game:**
  - 7 tiles each from a double-six set.
  - Seats 0 and 2 play against 1 and 3.
  - The first match opens with the double six.
  - You must play if you can; otherwise you are skipped.
  - Domino and tranque scoring, plus capicú and chuchazo.
  - Play continues to the rule set's target.
- **Rule sets are data:** Default (to 200), Short (to 100) and Long (to 500, with prizes for the first four matches, 100-point capicú and chuchazo, and tranques settled by single player). ([Step 6, 84b24b4](https://github.com/diegosuarez1925/dominao/commit/84b24b4))
- **A game can pause.**
  - `vacate` empties a seat and keeps its hand; `seat` gives that seat to whoever sits next.
  - `autoplay` makes a legal move for a bot.
  - `_results` lists every match for the score table.
  - `_matchOutcomes` and `_gameOutcomes` say how each seated player came out of the latest match and of a finished game, so statistics can be kept without reading the game's own records. ([Step 24a, 2b9a2fd](https://github.com/diegosuarez1925/dominao/commit/2b9a2fd))

### PasswordAuthenticating and Throttling (new): [PasswordAuthenticating](design/concepts/PasswordAuthenticating.md), [Throttling](design/concepts/Throttling.md)
- **Accounts with a unique username and a password that is not simple** ([Step 19, caa728b](https://github.com/diegosuarez1925/dominao/commit/caa728b)). Usernames are unique whatever their case. Passwords need 10+ characters, three kinds of character, not the username, and not a common password (also when dressed up as "P@ssw0rd2026"). They are kept only as argon2id hashes.
- **Throttling** locks an account for 15 minutes after 5 wrong passwords in 15 minutes. A wrong password and an unknown username get the same answer, so nobody can learn which usernames exist.
- **The account is the player**, so signing in on another device is the same player at the same table, and stats or friends can attach to it later.

### Friending, Inviting and Seeing (new): [Friending](design/concepts/Friending.md), [Inviting](design/concepts/Inviting.md), [Seeing](design/concepts/Seeing.md)
- **Friends for accounts** ([Step 23a, db18b0e](https://github.com/diegosuarez1925/dominao/commit/db18b0e)). **Friending** keeps friend requests, which run out after a week, and friendships, remembering who asked. A request to someone who already asked you is refused, so crossed requests never pile up.
- **Inviting** keeps invites to a place and nothing more. That only the host of a private table invites, and that invites end when the game starts or the table closes, is decided by reactions ([Friends](design/compositions/Friends.md)).
- **Seeing** remembers when an account last looked at its requests, invites and friends, so the app points out only what is newer. That is how the notification bubbles go away once seen, without Friending or Inviting storing anything about the screen.

### Tallying (new): [spec](design/concepts/Tallying.md)
- **Statistics for accounts** ([Step 24a, 2b9a2fd](https://github.com/diegosuarez1925/dominao/commit/2b9a2fd)). A running record per player and rule set: matches and games won and lost, and the most points won in one match, with winrates worked out when asked.
- **Each match and game is counted once.** Tallying remembers what it counted and refuses the same one twice, so the reactions that count after every move ([Stats](design/compositions/Stats.md), [Step 24b, af37c49](https://github.com/diegosuarez1925/dominao/commit/af37c49)) can fire as often as they like. Tranque ties are not counted, and only accounts are, not guests or bots.

### Botting (new): [spec](design/concepts/Botting.md)
- **Gives a stand-in an obvious bot name.** DominoPlaying decides how a seat plays. How bots choose moves (random legal moves for now) is a single swappable function in [src/assembly.ts](src/assembly.ts).

## Compositions: how the concepts work together

Specs: [Guests](design/compositions/Guests.md), [Accounts](design/compositions/Accounts.md), [Tables](design/compositions/Tables.md), [Games](design/compositions/Games.md), [Matchmaking](design/compositions/Matchmaking.md), [Seats](design/compositions/Seats.md), [Friends](design/compositions/Friends.md), [Stats](design/compositions/Stats.md).

- **Access control is structural.** Every player endpoint first turns the token into the player it acts for (a guest or an account), and that player is always the actor. No endpoint takes a player id from the browser. One test goes through every endpoint with forged, ended and borrowed tokens. ([Step 9a, 81aa5d5](https://github.com/diegosuarez1925/dominao/commit/81aa5d5))
- **A matched game is a private-table game.** A reaction turns a launched lobby into a table under a fresh code and starts its game, so everything afterwards shares one code path.
- **Leaving never kills a game** ([Seats](design/compositions/Seats.md)).
  - Leaving pauses the game, and whoever sits down next takes over the hand.
  - After 30 seconds a bot takes the seat, and a person can still take it from the bot later.
  - Only when all four leave is the game abandoned.
- **Time-based rules run on one server ticker** ([src/ticker.ts](src/ticker.ts)):
  - It launches ready lobbies, seats bots, and plays bots' turns.
  - It takes out players whose page stopped checking in: 45 seconds in a game, 2 minutes at a table before the game or in the queue.
  - An open page checks in every 2 seconds, so an idle player is never removed.
  - Each ticker endpoint checks the time itself, so asking early changes nothing. ([Step 15, 3faa9f6](https://github.com/diegosuarez1925/dominao/commit/3faa9f6))

## Visual design: P3 vs. final

- **Kept from the P3 study:**
  - Bungee for big moments and Nunito for reading.
  - The palette from the Lares flag, the Puerto Rican flag and Old San Juan: red felt, light blue accents, beige paper.
  - The table seen from above with you at the bottom.
- **Score card redrawn as a hand-kept tally.** It has one line per match, with points under the team that won. Our wins are blue and theirs are red, with a ruled line between the two columns and totals under a double line. In P3 it showed only the last match. ([Step 12, b70bd68](https://github.com/diegosuarez1925/dominao/commit/b70bd68))
- **Absent players and bots are visible.**
  - A faded badge with a pulsing amber dot means a player's connection seems lost.
  - An empty seat shows a countdown to the bot.
  - Bots have a steel-grey robot face and a BOT tag, so nobody mistakes one for a person.
- **New screens and controls:**
  - A "How to play" pop-up on the home screen, with the rule sets as the server lists them. ([Step 11, 3f956ba](https://github.com/diegosuarez1925/dominao/commit/3f956ba))
  - At a private table, the host taps two seats to swap them; the picked seat lifts and gets a light-blue ring.
  - The matchmaking toggle "join games in progress".
  - The first page offers Guest, Log in and Sign up as one pill-shaped switch. Signing up lists the password rules and ticks each off in green as it is met, and warns that a forgotten password cannot be recovered. (Step 20)
  - Accounts (never guests) get account settings, with rows that open in place to change the password or delete the account. (Step 21)
  - Accounts get a Friends section in the side menu: a friend list (online friends first, with a green dot), friend requests (search by username, accept or reject), and game invites (who from, the rules and how many are seated). Red bubbles on the menu button, the Friends item and each tab count what is new, and go away once seen. New requests and invites, and accepted requests, also pop up at the top of the home screen to answer right there. The host invites friends from the lobby; tapping a player at a table opens a small menu to send a friend request, and guests now carry a GUEST tag as bots carry BOT. (Step 23)
  - Accounts get a Stats section in the side menu: a light-blue block for every rule set together, then a card per rule set (Default, Long, Short, each with its target and best match), each with matches and games won, lost and played, and the winrate in Bungee over a thin red bar. A rule set never played shows dashes, not 0%. (Step 24)
  - The home screen was redone after mobile game apps (Mesa28, Clash Royale): a Public / Private switch instead of two panels side by side, a drawn picture for each kind of game front and centre (a globe with players around it; friends around a table under a lamp), and one big button with the rules card beside it. Account settings moved into a side menu that opens each section over the home screen. (Step 22)
- **Plain-language messages for what happened without you:** the host closing the table, being away too long, or a seat going to someone else.
