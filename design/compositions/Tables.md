# Tables

Private tables let a group of friends play together. Table only seats people; it
knows nothing about dominoes, so the game can change without touching it. Every
endpoint here first resumes the guest's session from their token, and that session
is the player at the table, so nobody can sit, leave or close in someone else's name.

A guest [opens a table](reaction:Tables.Open) under the rule set they choose. Rules
DominoPlaying does not know are answered `UNKNOWN_RULES`. The app asks CodeGenerating
for a 6-character code in the table-code context, opens the table with that code and
those rules, and seats the guest in seat 0 as host. The host shares the code with friends. A guest who
is waiting for a game with strangers is answered `IN_QUEUE`, here and when joining:
they must stop waiting first.

```endpoints
Tables.Open at /tables/open
```

A friend [joins by code](reaction:Tables.JoinByCode) and takes the lowest free seat.
A code that belongs to no table is answered as `NO_SUCH_TABLE` before Table is asked.
If a game is being played at the table and a seat is empty (or held by a bot), the
friend takes over that seat mid-game, as described for [seats](Seats.md). A table
where Matchmaking seated strangers is answered `PUBLIC_TABLE`: its seats go only to
strangers who asked to join games midway, through the queue.

```endpoints
Tables.JoinByCode at /tables/join
```

Anyone can [see their lobby](reaction:Tables.ShowLobby): the
[lobby](former:Tables.Lobby) shows the table they sit at, its code, rules and host, and who
sits in each seat by display name. The page asks again every couple of seconds, so
new arrivals appear without reloading.

```endpoints
Tables.ShowLobby at /tables/lobby
```

Seats are filled in the order people join, and partners sit across from each other
(seats 0 and 2 against 1 and 3), so join order alone would pick the teams. The host
can [swap any two seats](reaction:Tables.SwapSeats), or move someone to an empty one,
to choose who partners whom. That is only while no game is being played at the table,
since once one starts the seats are its turn order (`GAME_IN_PROGRESS`); a table
Matchmaking seated strangers at keeps its drawn seats (`PUBLIC_TABLE`). Anyone else is
answered `NOT_HOST`, and swapping a seat with itself `SAME_SEAT`.

```endpoints
Tables.SwapSeats at /tables/swap
```

A player can [leave a table](reaction:Tables.Leave), and a guest who ends their
session [gets up from their table too](reaction:Tables.LeaveTableOnSessionEnd), and so does one whose
session [expires](reaction:Tables.LeaveTableOnSessionExpire). When the last one leaves, the
app [closes the empty table](reaction:Tables.CloseEmptyTable), because nobody is
left to do it. The host can also [close a table](reaction:Tables.Close) that still
has people at it, which unseats everyone; anyone else who tries is answered
`NOT_HOST`. However a table closes, [its code is freed](reaction:Tables.FreeTableCode)
in CodeGenerating so it can be handed out again.

```endpoints
Tables.Leave at /tables/leave
Tables.Close at /tables/close
```
