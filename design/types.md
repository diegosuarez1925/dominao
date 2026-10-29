# Application types

A person playing DOMINAO is either a guest, kept by Guesting, or the owner of an
account, kept by PasswordAuthenticating. Sessioning recognizes their browser by its
token and answers which person it acts as, so the players of Sessioning, Table and
Matchmaking are those people. Throttling counts failed sign-ins per account, so its
keys are accounts.

CodeGenerating keeps codes unique within a context. The app uses two contexts: one
for session tokens and one for table join codes.

A game of dominoes is played at a table by the guests seated there, so its places
are tables. A seat whose player left can be taken by a bot until another guest sits
down, so DominoPlaying's players are seat holders: a guest's session or a bot.
Matchmaking remembers the tables where the games it launched are played, so its
places are tables too.

Only accounts have friends: Friending keeps friend requests and friendships between
accounts, and Inviting keeps the invites an account sends a friend to its private
table, so its places are tables. Seeing remembers when an account last looked at its
friend requests, its game invites and its friends, so only what is newer is pointed
out as new.

Games are played by rule sets that DominoPlaying defines (DEFAULT, LONG and SHORT).
A table keeps the rule set its host chose, and Matchmaking only puts strangers who
chose the same rule set in a lobby together. Neither interprets the rules; they only
keep and compare the rule set's name.

```types
concrete RuleSet
  The name of one of DominoPlaying's rule sets, such as DEFAULT, LONG or SHORT.

concrete CodeContext
  The kind of code being generated: SESSION_TOKENS for session tokens, or
  TABLE_CODES for the join codes of private tables.

concrete Person
  A person playing: a guest from Guesting, or an account from PasswordAuthenticating.

concrete SeatHolder
  Whoever holds a seat in a game: a person, or a bot standing in for a person who
  left.
```

```instances
instantiate CodeGenerating with
  Context is CodeContext

instantiate Botting

instantiate DominoPlaying with
  Player is SeatHolder
  Place is Table.Table

instantiate Friending with
  User is PasswordAuthenticating.User

instantiate Guesting

instantiate Inviting with
  User is PasswordAuthenticating.User
  Place is Table.Table

instantiate PasswordAuthenticating

instantiate Throttling with
  Key is PasswordAuthenticating.User

instantiate Seeing with
  User is PasswordAuthenticating.User

instantiate Sessioning with
  Player is Person

instantiate Matchmaking with
  Player is Person
  Rules is RuleSet
  Place is Table.Table

instantiate Table with
  Player is Person
  Rules is RuleSet
```
