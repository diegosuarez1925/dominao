# Application types

DOMINAO has no accounts. Every player at a table is identified by their guest
session, so Table's players are GuestSessioning's sessions.

CodeGenerating keeps codes unique within a context. The app uses two contexts: one
for session tokens and one for table join codes.

A game of dominoes is played at a private table by the guests seated there, so
DominoPlaying's players are sessions and its places are tables.

```types
concrete CodeContext
  The kind of code being generated: SESSION_TOKENS for guest session tokens, or
  TABLE_CODES for the join codes of private tables.
```

```instances
instantiate CodeGenerating with
  Context is CodeContext

instantiate DominoPlaying with
  Player is GuestSessioning.Session
  Place is Table.Table

instantiate GuestSessioning

instantiate Table with
  Player is GuestSessioning.Session
```
