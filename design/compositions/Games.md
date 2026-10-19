# Games

A game of dominoes is played at a private table. Table and DominoPlaying know
nothing of each other; this composition decides that the table is the game's place,
and that the seats, in order, are the turn order, so the players in seats 0 and 2
are partners against seats 1 and 3, as the lobby already tells them.

When all four seats are taken, the host [starts a game](reaction:Games.StartGame)
with the seated players. Anyone else is answered `NOT_HOST`, a host whose table has
an empty seat is answered `TABLE_NOT_FULL`, and a guest at no table `NOT_SEATED`.

```endpoints
Games.StartGame at /games/start
```

A player [plays a tile](reaction:Games.Play) on the left or right end of the line.
The player is always the guest whose token was presented, and DominoPlaying refuses
the move unless it is that player's turn and the tile fits. Skipping a player who
cannot move, scoring, and dealing the next match all happen inside the play.

```endpoints
Games.Play at /games/play
```

Each player [looks at the game](reaction:Games.ViewGame) at their table through
[their own view](former:Games.GameView): the scores, the line of tiles, whose turn
it is, how many tiles everyone holds, how the last match ended, and their own hand,
but never anyone else's. The page asks for it every couple of seconds.

```endpoints
Games.ViewGame at /games/view
```

A game needs all four players, so when anyone
[leaves the table](reaction:Games.AbandonGameWhenPlayerLeaves) or the host
[closes it](reaction:Games.AbandonGameWhenTableCloses), the game being played there
is abandoned.
