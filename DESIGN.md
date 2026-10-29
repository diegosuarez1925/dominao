# DOMINAO: final design

DOMINAO lets four people play Puerto Rican dominoes online: friends at a private table found by a code, or strangers matched by the rules they want. Anyone can play as a guest; regulars can keep an account with friends and stats. This page says how the final app differs from the P1 concept design and the P3 visual design, and why. The full step-by-step record is in [design_notes.md](design_notes.md).

| | Link |
|---|---|
| Deployed app | https://dominao.mit-sdg.dev/ |
| P1 concept design | [P1 TASKS/concept_design.md @ dbff947](https://github.com/diegosuarez1925/dominao/blob/dbff947/P1%20TASKS/concept_design.md) |
| P3 specs and visual study | [design/ @ 5a185f9](https://github.com/diegosuarez1925/dominao/tree/5a185f9/design), [README @ 5a185f9](https://github.com/diegosuarez1925/dominao/blob/5a185f9/README.md#visual-design-study) |
| Final specs | [design/concepts](design/concepts), [design/compositions](design/compositions) ([@ 2715e13](https://github.com/diegosuarez1925/dominao/tree/2715e13/design)), every endpoint in [generated/dominao.md](generated/dominao.md) |

## Concepts: P1 vs. final

P1 had four concepts; the final app has thirteen. No concept refers to another: every link between them is a reaction or endpoint in [src/compositions](src/compositions).

**Changed from P1**
- **GuestSessioning → [Sessioning](design/concepts/Sessioning.md) + [Guesting](design/concepts/Guesting.md)** ([dd00747](https://github.com/diegosuarez1925/dominao/commit/dd00747)). It did two jobs, a guest's name and recognizing a browser by token; accounts need only the second. Sessioning now serves guests and accounts (12-hour and 30-day sessions, several per player). Tokens come from CodeGenerating, as P1's reactions implied. `rename` was dropped; P1's `system_expire` became a server timer that frees the seat and token of idle sessions ([0a805d7](https://github.com/diegosuarez1925/dominao/commit/0a805d7)).
- **[CodeGenerating](design/concepts/CodeGenerating.md)** is unchanged in spirit (unique codes per context, for tokens and table codes). Its `length` input became `size`, because the sync engine dropped an input named `length`.
- **[Table](design/concepts/Table.md)** now holds its join code, which P1's reactions used but its state lacked ([6f70cd7](https://github.com/diegosuarez1925/dominao/commit/6f70cd7)). It knows nothing about games: P1's `status`, `start` and `finish` are gone, so Table and DominoPlaying never track the same thing twice. `leave` and `close` are separate, and `moveSeat` came back as a host-only `swap` before the game, which is how partners are chosen without players fighting over seats ([9c10237](https://github.com/diegosuarez1925/dominao/commit/9c10237)). `setRules` was dropped; rules are picked when the table opens.
- **[Matchmaking](design/concepts/Matchmaking.md)** uses visible lobbies instead of a hidden queue: players watch a lobby of their rule set fill, a 10-second countdown runs, and the four are seated in random order, keeping P1's random partners ([5ea33a8](https://github.com/diegosuarez1925/dominao/commit/5ea33a8)). The server launches ready lobbies, as P1's `system` action meant ([132c36b](https://github.com/diegosuarez1925/dominao/commit/132c36b)). New: a player can opt in to take an empty seat in a game already being played; those who want a fresh game are never dropped into half-lost ones ([1792e05](https://github.com/diegosuarez1925/dominao/commit/1792e05)).

**New concepts**
- **[DominoPlaying](design/concepts/DominoPlaying.md)**: the game P1 left for later. Seven tiles each, partners across, the double six opens, play if you can or be skipped, domino and tranque scoring with capicú and chuchazo. Rule sets are data: Default (to 200), Short (to 100), Long (to 500, with match prizes) ([84b24b4](https://github.com/diegosuarez1925/dominao/commit/84b24b4)). A game can pause: `vacate` keeps a seat's hand for whoever sits next, and `autoplay` moves for a bot.
- **[Botting](design/concepts/Botting.md)** gives stand-ins an obvious bot name. How bots choose moves (random legal moves) is one swappable function.
- **[PasswordAuthenticating](design/concepts/PasswordAuthenticating.md) and [Throttling](design/concepts/Throttling.md)** ([caa728b](https://github.com/diegosuarez1925/dominao/commit/caa728b)): unique usernames, passwords that are not simple (kept as argon2id hashes), and a 15-minute lock after 5 wrong tries. A wrong password and an unknown username get the same answer. The account *is* the player, so friends and stats attach to it.
- **[Friending](design/concepts/Friending.md), [Inviting](design/concepts/Inviting.md) and [Seeing](design/concepts/Seeing.md)** ([db18b0e](https://github.com/diegosuarez1925/dominao/commit/db18b0e)): friend requests that run out after a week, invites to a place, and when an account last looked at each part, so only newer items are pointed out. Who may invite (the host of a private table) and when invites end (game start, table close) are reactions, not concept logic.
- **[Tallying](design/concepts/Tallying.md)** ([2b9a2fd](https://github.com/diegosuarez1925/dominao/commit/2b9a2fd)): match and game records per player and rule set, with best match points and winrates. It counts each match and game once, so the reactions that count after every move can fire freely. Ties, guests and bots are not counted.

## Compositions: how the concepts work together

Specs: [Guests](design/compositions/Guests.md), [Accounts](design/compositions/Accounts.md), [Tables](design/compositions/Tables.md), [Games](design/compositions/Games.md), [Matchmaking](design/compositions/Matchmaking.md), [Seats](design/compositions/Seats.md), [Friends](design/compositions/Friends.md), [Stats](design/compositions/Stats.md).

- **Access control is structural.** Every player endpoint turns the token into the player it acts for, and no endpoint takes a player id from the browser. One test sends forged, ended and borrowed tokens to every endpoint ([81aa5d5](https://github.com/diegosuarez1925/dominao/commit/81aa5d5)).
- **A matched game is a private-table game.** A launched lobby becomes a table under a fresh code, so everything afterwards shares one code path.
- **Leaving never kills a game.** It pauses; whoever sits down next takes over the hand; after 30 seconds a bot does, and a person can still take the seat back. Only when all four leave is it abandoned.
- **Time-based rules run on one server ticker**: launching lobbies, seating bots, playing their turns, and removing players whose page stopped checking in (45 s in a game, 2 min before one). An open page checks in every 2 s, so idle is never mistaken for gone ([3faa9f6](https://github.com/diegosuarez1925/dominao/commit/3faa9f6)).

## Visual design: P3 vs. final

- **Kept from the P3 study:** Bungee for big moments and Nunito for reading; the palette from the Lares flag, the Puerto Rican flag and Old San Juan (red felt, light blue, beige paper); the table from above with you at the bottom.
- **Home screen redone after mobile game apps** ([7964d05](https://github.com/diegosuarez1925/dominao/commit/7964d05)): a Public / Private switch, a drawn picture for each kind of game, one big Play button beside the rules card, and a side menu for account settings, Friends and Stats.
- **Score card as a hand-kept tally**, one line per match with our wins in blue and theirs in red; P3 showed only the last match ([b70bd68](https://github.com/diegosuarez1925/dominao/commit/b70bd68)).
- **Absence is visible:** a faded badge with an amber dot for a lost connection, a countdown on an empty seat, and bots with a robot face and a BOT tag (guests carry a GUEST tag).
- **Accounts** get a first page with Guest / Log in / Sign up and password rules ticked off as they are met; a Friends section with online dots, red bubbles for what is new, and pop-ups to answer requests and invites in place ([a959248](https://github.com/diegosuarez1925/dominao/commit/a959248)); and a Stats section with a card per rule set and winrate bars ([1ac38c6](https://github.com/diegosuarez1925/dominao/commit/1ac38c6)).
- **Plain-language messages** for what happened without you: the host closing the table, being away too long, or a seat going to someone else.
