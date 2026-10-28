# Matchmaking

Matchmaking lets a guest play with strangers when no friends are around. Matchmaking
only groups players; it knows nothing of tables or dominoes. This composition decides
that a group it hands out sits down at a new table, so from then on a matched game is
played exactly like a game between friends.

A guest [asks for a game](reaction:Matchmaking.Enqueue) under the rule set they
choose, and only ever meets strangers who chose the same one: they join the earliest
lobby with those rules that still has room, or a new one. They also say whether they
are happy to join a game already being played (`midway`). Rules DominoPlaying does
not know are answered `UNKNOWN_RULES`. A guest already sitting at a table is answered
`AT_TABLE`: they must leave it first.

```endpoints
Matchmaking.Enqueue at /matchmaking/enqueue
```

While waiting, a guest [looks at their lobby](reaction:Matchmaking.ShowQueue)
through [its view](former:Matchmaking.QueueLobby): who is waiting there by name (and
whether each is happy to join a game midway), its rules, whether it is full, and how many seconds are left in its countdown. The page
asks for it every couple of seconds, so new arrivals and the countdown show up
without reloading.

```endpoints
Matchmaking.ShowQueue at /matchmaking/view
```

A guest can [stop waiting](reaction:Matchmaking.LeaveQueue) at any time before the
game starts, which also stops a running countdown. A guest who ends their session
[stops waiting too](reaction:Matchmaking.LeaveQueueOnSessionEnd), as does one whose session
[expires](reaction:Matchmaking.LeaveQueueOnSessionExpire).

```endpoints
Matchmaking.LeaveQueue at /matchmaking/leave
```

When the countdown of a full lobby reaches zero, the server
[launches it](reaction:Matchmaking.Launch) on its own: its one-second ticker asks
Matchmaking which full lobbies are ready and asks to launch each, so the game starts
even if every waiting page is in the background. Nobody's page asks. Matchmaking
refuses an early launch, and when several asks arrive at once only the first
succeeds, so asking from outside changes nothing.

```endpoints
Matchmaking.Launch at /matchmaking/launch
```

Likewise, a guest whose page has not checked in for two minutes (it was closed, or
went offline) [stops waiting](reaction:Matchmaking.DropAbsentWaiter), asked by the
same ticker, so no game is started around someone who is gone. A full lobby's
countdown stops as if they had left. A guest whose page is open but idle keeps waiting.

```endpoints
Matchmaking.DropAbsentWaiter at /matchmaking/drop-absent
```

A launched lobby is [seated at a new table](reaction:Matchmaking.SeatLaunchedLobby):
the app asks CodeGenerating for a table code, the first of the shuffled players opens
the table under the lobby's rules, the other three join in order, and DominoPlaying
starts the game by those rules with the four in that order. Since the order was shuffled, partners are random. From here the
table, its lobby and its game behave as described for private tables and games, and
Matchmaking remembers the table under the lobby's rules.

A table of strangers is where someone who left can be replaced by another stranger,
but only by one who chose the same rules and said they are happy to join midway, so
nobody who wanted a fresh game is dropped into one half played. A guest like that who
[asks for a game while such a table has a seat to fill](reaction:Matchmaking.SendMidwayGuestToOpenSeat)
(empty, or held by a bot) is sent to it at once; and when
[a seat empties at such a table](reaction:Matchmaking.FillEmptySeatFromQueue), the
guest who has waited longest among those is sent to it. Sitting down there takes the
seat over as described for [seats](Seats.md), and someone sent to a table
[stops waiting in their lobby](reaction:Matchmaking.StopWaitingOnceSeated). When such
a table closes, Matchmaking
[forgets it](reaction:Matchmaking.ForgetClosedTable).
