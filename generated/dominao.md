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

- `CodeGenerating` — instance of `CodeGenerating` — [Application types](../design/types.md), line 15.
  - `Context` is `CodeContext` — [Application types](../design/types.md), line 16.

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

- `GuestSessioning` — instance of `GuestSessioning` — [Application types](../design/types.md), line 18.

## Application types

Concrete types:

- `CodeContext` — [Application types](../design/types.md), line 10.

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

## Endpoint input contracts

Before recording an action ask, the boundary rejects a body that is not an
object or lacks a required key. The response uses `INVALID_INPUT` and names
the path or missing key. A declared default fills an absent key. Endpoints
not listed here have no explicit input contract.

- `/guests/leave` — requires `token`
- `/guests/me` — requires `token`
- `/guests/start` — requires `displayName`
