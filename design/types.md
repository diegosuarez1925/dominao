# Application types

DOMINAO has no accounts. Every player at a table is identified by their guest
session, so Table's players are GuestSessioning's sessions.

CodeGenerating keeps codes unique within a context. The app uses two contexts: one
for session tokens and one for table join codes.

A game of dominoes is played at a table by the guests seated there, so its places
are tables. A seat whose player left can be taken by a bot until another guest sits
down, so DominoPlaying's players are seat holders: a guest's session or a bot.
Matchmaking remembers the tables where the games it launched are played, so its
places are tables too.

Games are played by rule sets that DominoPlaying defines (DEFAULT, LONG and SHORT).
A table keeps the rule set its host chose, and Matchmaking only puts strangers who
chose the same rule set in a lobby together. Neither interprets the rules; they only
keep and compare the rule set's name.

```types
concrete RuleSet
  The name of one of DominoPlaying's rule sets, such as DEFAULT, LONG or SHORT.

concrete CodeContext
  The kind of code being generated: SESSION_TOKENS for guest session tokens, or
  TABLE_CODES for the join codes of private tables.

concrete SeatHolder
  Whoever holds a seat in a game: a guest's session, or a bot standing in for a
  guest who left.
```

```instances
instantiate CodeGenerating with
  Context is CodeContext

instantiate Botting

instantiate DominoPlaying with
  Player is SeatHolder
  Place is Table.Table

instantiate GuestSessioning

instantiate Matchmaking with
  Player is GuestSessioning.Session
  Rules is RuleSet
  Place is Table.Table

instantiate Table with
  Player is GuestSessioning.Session
  Rules is RuleSet
```
