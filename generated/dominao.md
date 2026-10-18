<!-- Generated from the Dominao assembly. Do not edit. -->
<!-- Manifest producer: @mit-sdg/sync-engine@1.1.0; concept specification: sync-engine.concept-specification@1; renderer: @mit-sdg/sync-engine@1.1.0. -->

# Dominao — assembled read-back

_Assembled by sync-engine from registered concepts and composition. Edit the concept_
_specifications and composition source, then regenerate this file._

## Concepts

### CodeGenerating

Defined in [CodeGenerating](../design/concepts/CodeGenerating.md), line 1.

#### Actions

- `generate(context: Context, size?: Number) : returns (code: String)`
  - Refuses `INVALID_LENGTH`: A code must be a whole number of characters greater than 5.
- `remove(context: Context, code: String) : returns (code: String)`
  - Refuses `NO_SUCH_CODE`: That code is not in use in this context.

#### Queries

- `_isAvailable(context: Context, code: String) : one (available: Flag)`

#### Instances

- `CodeGenerating` — instance of `CodeGenerating` — [Application types](../design/types.md), line 16.
  - `Context` is `CodeContext` — [Application types](../design/types.md), line 17.

### GuestSessioning

Defined in [GuestSessioning](../design/concepts/GuestSessioning.md), line 1.

#### Actions

- `start(displayName: String, token: String) : returns (session: Session)`
  - Refuses `INVALID_NAME`: A display name must be 1 to 20 characters long.
  - Refuses `TOKEN_IN_USE`: That token already belongs to another session.
- `resume(token: String) : returns (session: Session, displayName: String)`
  - Refuses `UNKNOWN_SESSION`: This guest session is not active.
- `end(token: String) : returns (session: Session)`
  - Refuses `UNKNOWN_SESSION`: This guest session is not active.

#### Queries

- `_getName(session: Session) : optional (displayName: String)`

#### Instances

- `GuestSessioning` — instance of `GuestSessioning` — [Application types](../design/types.md), line 19.

### Table

Defined in [Table](../design/concepts/Table.md), line 1.

#### Actions

- `open(host: Player, code: String) : returns (table: Table)`
  - Refuses `ALREADY_SEATED`: That player is already sitting at a table.
  - Refuses `CODE_IN_USE`: Another table already has that code.
- `join(table: Table, player: Player) : returns (position: Number)`
  - Refuses `NO_SUCH_TABLE`: There is no such table.
  - Refuses `ALREADY_SEATED`: That player is already sitting at a table.
  - Refuses `TABLE_FULL`: That table is full.
- `leave(table: Table, player: Player) : returns (table: Table)`
  - Refuses `NOT_SEATED`: That player is not sitting at that table.
- `close(table: Table) : returns (code: String)`
  - Refuses `NO_SUCH_TABLE`: There is no such table.

#### Queries

- `_getByCode(code: String) : optional (table: Table)`
- `_get(table: Table) : optional (host: Player, code: String)`
- `_seats(table: Table) : many (position: Number, player: Player)`
- `_tableOf(player: Player) : optional (table: Table)`

#### Instances

- `Table` — instance of `Table` — [Application types](../design/types.md), line 21.
  - `Player` is `GuestSessioning.Session` — [Application types](../design/types.md), line 22.

## Application types

Concrete types:

- `CodeContext` — [Application types](../design/types.md), line 10.

## Formers

_Formers name result shapes evaluated when asked. The source former owns_
_the authored explanation; this section records the generated shape._

### the lobby of (session)

Authored path: `Tables.Lobby`.
- Covered by [Tables](../design/compositions/Tables.md), line 24.

```former
Former "the lobby of (session)" — inputs (session); bindings (table, host, code, position, player, displayName); promises exactly one record — forms:
  a record of
    tables: each Table._tableOf (player: session) has (table)
      where Table._get (table) has (code, host)
      form a record of
        code
        host
        seats: each Table._seats (table) has (player, position)
          where GuestSessioning._getName (session: player) has (displayName)
          form a record of
            displayName
            player
            position
        table
```

## Reactions

### DeliverFaultToAsker

```reaction
when any action is faulted, not asked by DeliverFaultToAsker
where
  earlier, RequestBoundary.request (requestId)
then
  RequestBoundary.respondFramework (error: "INTERNAL_ERROR", requestId)
```

### DeliverRefusalToAsker

```reaction
when any action is refused (message), except RequestBoundary
where
  earlier, RequestBoundary.request (requestId)
then
  RequestBoundary.respond (error: message, requestId)
```

### Guests.FreeTokenOnSessionEnd

Authored path: `Guests.FreeTokenOnSessionEnd`.
- Covered by [Guests](../design/compositions/Guests.md), line 23.

```reaction
when GuestSessioning.end (token, session)
then
  CodeGenerating.remove (code: token, context: "SESSION_TOKENS")
```

### Guests.Leave

Authored path: `Guests.Leave`.
- Covered by [Guests](../design/compositions/Guests.md), line 15.
- Covered by [Guests](../design/compositions/Guests.md), line 20.

```reaction
when RequestBoundary.request (path: "/guests/leave", requestId, token)
then
  GuestSessioning.end (token)
```

### Guests.Leave#2

Authored path: `Guests.Leave`.
- Covered by [Guests](../design/compositions/Guests.md), line 15.
- Covered by [Guests](../design/compositions/Guests.md), line 20.

```reaction
when GuestSessioning.end (token, session), asked by Guests.Leave
where
  earlier, RequestBoundary.request (path: "/guests/leave", requestId, token)
then
  RequestBoundary.respond (requestId, session)
```

### Guests.Me

Authored path: `Guests.Me`.
- Covered by [Guests](../design/compositions/Guests.md), line 14.
- Covered by [Guests](../design/compositions/Guests.md), line 19.

```reaction
when RequestBoundary.request (path: "/guests/me", requestId, token)
then
  GuestSessioning.resume (token)
```

### Guests.Me#2

Authored path: `Guests.Me`.
- Covered by [Guests](../design/compositions/Guests.md), line 14.
- Covered by [Guests](../design/compositions/Guests.md), line 19.

```reaction
when GuestSessioning.resume (token, displayName, session), asked by Guests.Me
where
  earlier, RequestBoundary.request (path: "/guests/me", requestId, token)
then
  RequestBoundary.respond (displayName, requestId, session)
```

### Guests.Start

Authored path: `Guests.Start`.
- Covered by [Guests](../design/compositions/Guests.md), line 3.
- Covered by [Guests](../design/compositions/Guests.md), line 10.

```reaction
when RequestBoundary.request (displayName, path: "/guests/start", requestId)
then
  CodeGenerating.generate (context: "SESSION_TOKENS", size: 32)
```

### Guests.Start#2

Authored path: `Guests.Start`.
- Covered by [Guests](../design/compositions/Guests.md), line 3.
- Covered by [Guests](../design/compositions/Guests.md), line 10.

```reaction
when CodeGenerating.generate (context: "SESSION_TOKENS", size: 32, code), asked by Guests.Start
where
  earlier, RequestBoundary.request (displayName, path: "/guests/start", requestId)
then
  GuestSessioning.start (displayName, token: code)
```

### Guests.Start#3

Authored path: `Guests.Start`.
- Covered by [Guests](../design/compositions/Guests.md), line 3.
- Covered by [Guests](../design/compositions/Guests.md), line 10.

```reaction
when GuestSessioning.start (displayName, token: code, session), asked by Guests.Start#2
where
  earlier, RequestBoundary.request (displayName, path: "/guests/start", requestId)
then
  RequestBoundary.respond (requestId, session, token: code)
```

### Tables.Close

Authored path: `Tables.Close`.
- Covered by [Tables](../design/compositions/Tables.md), line 35.
- Covered by [Tables](../design/compositions/Tables.md), line 42.

```reaction
when RequestBoundary.request (path: "/tables/close", requestId, table, token)
then
  GuestSessioning.resume (token)
```

### Tables.Close:host#2

Authored path: `Tables.Close`.
- Covered by [Tables](../design/compositions/Tables.md), line 35.
- Covered by [Tables](../design/compositions/Tables.md), line 42.

```reaction
when GuestSessioning.resume (token, displayName, session), asked by Tables.Close
where
  earlier, RequestBoundary.request (path: "/tables/close", requestId, table, token)
  Table._get (table) has (host: session)
then
  Table.close (table)
```

### Tables.Close:host#3

Authored path: `Tables.Close`.
- Covered by [Tables](../design/compositions/Tables.md), line 35.
- Covered by [Tables](../design/compositions/Tables.md), line 42.

```reaction
when Table.close (table, code), asked by Tables.Close:host#2
where
  earlier, RequestBoundary.request (path: "/tables/close", requestId, table, token)
then
  RequestBoundary.respond (requestId, table)
```

### Tables.Close:not-host#2

Authored path: `Tables.Close`.
- Covered by [Tables](../design/compositions/Tables.md), line 35.
- Covered by [Tables](../design/compositions/Tables.md), line 42.

```reaction
when GuestSessioning.resume (token, displayName, session), asked by Tables.Close
where
  earlier, RequestBoundary.request (path: "/tables/close", requestId, table, token)
  no Table._get (table) has (host: session)
then
  RequestBoundary.respond (error: "NOT_HOST", requestId)
```

### Tables.CloseEmptyTable

Authored path: `Tables.CloseEmptyTable`.
- Covered by [Tables](../design/compositions/Tables.md), line 34.

```reaction
when Table.leave (table)
where
  no Table._seats (table)
then
  Table.close (table)
```

### Tables.FreeTableCode

Authored path: `Tables.FreeTableCode`.
- Covered by [Tables](../design/compositions/Tables.md), line 37.

```reaction
when Table.close (code)
then
  CodeGenerating.remove (code, context: "TABLE_CODES")
```

### Tables.JoinByCode

Authored path: `Tables.JoinByCode`.
- Covered by [Tables](../design/compositions/Tables.md), line 16.
- Covered by [Tables](../design/compositions/Tables.md), line 20.

```reaction
when RequestBoundary.request (code, path: "/tables/join", requestId, token)
then
  GuestSessioning.resume (token)
```

### Tables.JoinByCode:code-found#2

Authored path: `Tables.JoinByCode`.
- Covered by [Tables](../design/compositions/Tables.md), line 16.
- Covered by [Tables](../design/compositions/Tables.md), line 20.

```reaction
when GuestSessioning.resume (token, displayName, session), asked by Tables.JoinByCode
where
  earlier, RequestBoundary.request (code, path: "/tables/join", requestId, token)
  Table._getByCode (code) has (table)
then
  Table.join (player: session, table)
```

### Tables.JoinByCode:code-found#3

Authored path: `Tables.JoinByCode`.
- Covered by [Tables](../design/compositions/Tables.md), line 16.
- Covered by [Tables](../design/compositions/Tables.md), line 20.

```reaction
when Table.join (player: session, table, position), asked by Tables.JoinByCode:code-found#2
where
  earlier, RequestBoundary.request (code, path: "/tables/join", requestId, token)
then
  RequestBoundary.respond (position, requestId, table)
```

### Tables.JoinByCode:code-unknown#2

Authored path: `Tables.JoinByCode`.
- Covered by [Tables](../design/compositions/Tables.md), line 16.
- Covered by [Tables](../design/compositions/Tables.md), line 20.

```reaction
when GuestSessioning.resume (token, displayName, session), asked by Tables.JoinByCode
where
  earlier, RequestBoundary.request (code, path: "/tables/join", requestId, token)
  no Table._getByCode (code)
then
  RequestBoundary.respond (error: "NO_SUCH_TABLE", requestId)
```

### Tables.Leave

Authored path: `Tables.Leave`.
- Covered by [Tables](../design/compositions/Tables.md), line 32.
- Covered by [Tables](../design/compositions/Tables.md), line 41.

```reaction
when RequestBoundary.request (path: "/tables/leave", requestId, table, token)
then
  GuestSessioning.resume (token)
```

### Tables.Leave#2

Authored path: `Tables.Leave`.
- Covered by [Tables](../design/compositions/Tables.md), line 32.
- Covered by [Tables](../design/compositions/Tables.md), line 41.

```reaction
when GuestSessioning.resume (token, displayName, session), asked by Tables.Leave
where
  earlier, RequestBoundary.request (path: "/tables/leave", requestId, table, token)
then
  Table.leave (player: session, table)
```

### Tables.Leave#3

Authored path: `Tables.Leave`.
- Covered by [Tables](../design/compositions/Tables.md), line 32.
- Covered by [Tables](../design/compositions/Tables.md), line 41.

```reaction
when Table.leave (player: session, table), asked by Tables.Leave#2
where
  earlier, RequestBoundary.request (path: "/tables/leave", requestId, table, token)
then
  RequestBoundary.respond (requestId, table)
```

### Tables.LeaveTableOnSessionEnd

Authored path: `Tables.LeaveTableOnSessionEnd`.
- Covered by [Tables](../design/compositions/Tables.md), line 33.

```reaction
when GuestSessioning.end (session)
where
  Table._tableOf (player: session) has (table)
then
  Table.leave (player: session, table)
```

### Tables.Open

Authored path: `Tables.Open`.
- Covered by [Tables](../design/compositions/Tables.md), line 8.
- Covered by [Tables](../design/compositions/Tables.md), line 13.

```reaction
when RequestBoundary.request (path: "/tables/open", requestId, token)
then
  GuestSessioning.resume (token)
```

### Tables.Open#2

Authored path: `Tables.Open`.
- Covered by [Tables](../design/compositions/Tables.md), line 8.
- Covered by [Tables](../design/compositions/Tables.md), line 13.

```reaction
when GuestSessioning.resume (token, displayName, session), asked by Tables.Open
then
  CodeGenerating.generate (context: "TABLE_CODES", size: 6)
```

### Tables.Open#3

Authored path: `Tables.Open`.
- Covered by [Tables](../design/compositions/Tables.md), line 8.
- Covered by [Tables](../design/compositions/Tables.md), line 13.

```reaction
when CodeGenerating.generate (context: "TABLE_CODES", size: 6, code), asked by Tables.Open#2
where
  earlier, GuestSessioning.resume (token, displayName, session), asked by Tables.Open
then
  Table.open (code, host: session)
```

### Tables.Open#4

Authored path: `Tables.Open`.
- Covered by [Tables](../design/compositions/Tables.md), line 8.
- Covered by [Tables](../design/compositions/Tables.md), line 13.

```reaction
when Table.open (code, host: session, table), asked by Tables.Open#3
where
  earlier, RequestBoundary.request (path: "/tables/open", requestId, token)
then
  RequestBoundary.respond (code, requestId, table)
```

### Tables.ShowLobby

Authored path: `Tables.ShowLobby`.
- Covered by [Tables](../design/compositions/Tables.md), line 23.
- Covered by [Tables](../design/compositions/Tables.md), line 29.

```reaction
when RequestBoundary.request (path: "/tables/lobby", requestId, token)
then
  GuestSessioning.resume (token)
```

### Tables.ShowLobby#2

Authored path: `Tables.ShowLobby`.
- Covered by [Tables](../design/compositions/Tables.md), line 23.
- Covered by [Tables](../design/compositions/Tables.md), line 29.

```reaction
when GuestSessioning.resume (token, displayName, session), asked by Tables.ShowLobby
where
  earlier, RequestBoundary.request (path: "/tables/lobby", requestId, token)
then
  RequestBoundary.respond (lobby: former "the lobby of (session)" with (session), requestId)
```

## Endpoint input contracts

Before recording an action ask, the boundary rejects a body that is not an
object or lacks a required key. The response uses `INVALID_INPUT` and names
the path or missing key. A declared default fills an absent key. Endpoints
not listed here have no explicit input contract.

- `/guests/leave` — requires `token`
- `/guests/me` — requires `token`
- `/guests/start` — requires `displayName`
- `/tables/close` — requires `token`, `table`
- `/tables/join` — requires `token`, `code`
- `/tables/leave` — requires `token`, `table`
- `/tables/lobby` — requires `token`
- `/tables/open` — requires `token`
