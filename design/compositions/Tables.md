# Tables

Private tables let a group of friends play together. Table only seats people; it
knows nothing about dominoes, so the game can change without touching it. Every
endpoint here first resumes the guest's session from their token, and that session
is the player at the table, so nobody can sit, leave or close in someone else's name.

A guest [opens a table](reaction:Tables.Open). The app asks CodeGenerating for a
6-character code in the table-code context, opens the table with that code, and
seats the guest in seat 0 as host. The host shares the code with friends. A guest who
is waiting for a game with strangers is answered `IN_QUEUE`, here and when joining:
they must stop waiting first.

```endpoints
Tables.Open at /tables/open
```

A friend [joins by code](reaction:Tables.JoinByCode) and takes the lowest free seat.
A code that belongs to no table is answered as `NO_SUCH_TABLE` before Table is asked.

```endpoints
Tables.JoinByCode at /tables/join
```

Anyone can [see their lobby](reaction:Tables.ShowLobby): the
[lobby](former:Tables.Lobby) shows the table they sit at, its code and host, and who
sits in each seat by display name. The page asks again every couple of seconds, so
new arrivals appear without reloading.

```endpoints
Tables.ShowLobby at /tables/lobby
```

A player can [leave a table](reaction:Tables.Leave), and a guest who ends their
session [gets up from their table too](reaction:Tables.LeaveTableOnSessionEnd). When the last one leaves, the
app [closes the empty table](reaction:Tables.CloseEmptyTable), because nobody is
left to do it. The host can also [close a table](reaction:Tables.Close) that still
has people at it, which unseats everyone; anyone else who tries is answered
`NOT_HOST`. However a table closes, [its code is freed](reaction:Tables.FreeTableCode)
in CodeGenerating so it can be handed out again.

```endpoints
Tables.Leave at /tables/leave
Tables.Close at /tables/close
```
