# Stats

Accounts keep statistics; guests and bots do not, since they are forgotten when they
leave. Tallying keeps them, and knows nothing about dominoes: after every move,
DominoPlaying is asked how its latest match and the game came out, and each account
seated there is counted once.

After a person [plays a tile](reaction:Stats.TallyMatchAfterPlay), or a move is
[made for a bot or a player out of time](reaction:Stats.TallyMatchAfterAutoplay), the
match that just ended is counted for every account seated at it: a win for the team
that won it, with the points it was paid (its prize and any Capicú or Chuchazo bonus),
and a loss for the other. A tied (tranque) match is not counted. A move that ends no
match finds the latest one already counted, so nothing changes. When that move also
finishes the game, the game is counted the same way, after a
[person's move](reaction:Stats.TallyGameAfterPlay) or an
[automatic one](reaction:Stats.TallyGameAfterAutoplay). A game nobody finishes (it
was abandoned) never counts as a game, though its matches that already ended still
count. Whoever is seated when a match or game ends is counted for it, so a player who
took over a bot's seat gets the result, and one who left does not.

An account [sees its statistics](reaction:Stats.ShowStats) in the Stats section:
[a record for each rule set it played](former:Stats.StatsView), with matches and games
won, lost and played, their winrates (whole percentages, rounded) and the most points
it won in one match, and the same totals for every rule set together. A guest is
answered `NOT_AN_ACCOUNT`.

```endpoints
Stats.ShowStats at /stats/view
```

A [deleted account](reaction:Stats.ForgetStatsOfDeletedAccount) leaves no statistics
behind.
