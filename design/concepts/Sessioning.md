# Sessioning

## Purpose

Recognize a returning browser as the player it started a session for, without
asking again on every visit.

## Principle

Abuelo starts playing, and the app starts a session for him with a secret token it
supplies and a lifetime of twelve hours. His browser keeps the token. Each time his
page loads or checks in, the token resumes the session and the app knows which
player he is; this also records when he was last seen, so anyone can ask how long
he has been away. A player may have several sessions at once (a phone and a
laptop), and how long he has been away counts his most recently used one. Ending a
session makes its token unknown right away. A session left unused for longer than
its lifetime can no longer be resumed, and the app can expire it.

## Types

```types
external Player
  Who a session acts as.
```

## State

```state
a set of Sessions with
  a unique token String
  a player Player
  a lifetime Number
  a startedAt DateTime
  a lastSeen DateTime
Rule: a session's lifetime is a positive number of milliseconds
```

## Actions

```actions
start(player: Player, token: String, lifetime: Number) : returns (session: Session)
  where lifetime is not a positive number
  then
    refuses INVALID_LIFETIME "A session must last for some time."
  where lifetime is positive, and another session already has this token
  then
    refuses TOKEN_IN_USE "That token already belongs to another session."
  where lifetime is positive, and no session has this token
  then
    add a new session for player with the token and lifetime, and startedAt and lastSeen set to now
    returns session

resume(token: String) : returns (session: Session, player: Player)
  where no session has this token, or its lastSeen is more than its lifetime ago
  then
    refuses UNKNOWN_SESSION "This session is not active."
  where a session with this token was seen within its lifetime
  then
    set that session's lastSeen to now
    returns session, player

end(token: String) : returns (session: Session, player: Player)
  where no session has this token
  then
    refuses UNKNOWN_SESSION "This session is not active."
  where a session has this token
  then
    delete that session
    returns session, player

expire(session: Session) : returns (session: Session, player: Player, token: String)
  where session does not exist
  then
    refuses UNKNOWN_SESSION "This session is not active."
  where session exists and its lastSeen is within its lifetime
  then
    refuses NOT_IDLE "That session is still in use."
  where session exists and its lastSeen is more than its lifetime ago
  then
    delete session
    returns session, player, token
```

## Queries

```queries
_idle() : many (session: Session, player: Player)
  Answers every session whose lastSeen is more than its lifetime ago, the longest
  unused first.

_idleFor(player: Player) : optional (idleMs: Number)
  Answers how many milliseconds have passed since any of the player's sessions was
  last used, and no row when the player has no session.

_tokens(player: Player) : many (token: String)
  Answers the token of every session the player has, oldest first, and no rows when
  they have none.

_others(player: Player, keep: String) : many (token: String)
  Answers the token of every session the player has except the one whose token is
  keep, oldest first.
```
