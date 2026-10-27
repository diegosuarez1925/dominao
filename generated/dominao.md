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

- `CodeGenerating` — instance of `CodeGenerating` — [Application types](../design/types.md), line 27.
  - `Context` is `CodeContext` — [Application types](../design/types.md), line 28.

### DominoPlaying

Defined in [DominoPlaying](../design/concepts/DominoPlaying.md), line 1.

#### Actions

- `start(place: Place, first: Player, second: Player, third: Player, fourth: Player, rules: RuleSet) : returns (game: Game)`
  - Refuses `UNKNOWN_RULES`: Those are not rules this game knows.
  - Refuses `DUPLICATE_PLAYER`: A game needs four different players.
  - Refuses `GAME_IN_PROGRESS`: A game is already being played there.
- `play(game: Game, player: Player, tile: Tile, side: Side) : returns (game: Game)`
  - Refuses `NO_SUCH_GAME`: There is no such game.
  - Refuses `GAME_NOT_ACTIVE`: That game is over.
  - Refuses `NOT_YOUR_TURN`: It is not your turn.
  - Refuses `NOT_IN_HAND`: That tile is not in your hand.
  - Refuses `ILLEGAL_PLAY`: That tile does not match that end of the board.
- `abandon(game: Game) : returns (game: Game)`
  - Refuses `NO_SUCH_GAME`: There is no such game.
  - Refuses `GAME_NOT_ACTIVE`: That game is over.

#### Queries

- `_activeAt(place: Place) : optional (game: Game)`
- `_latestAt(place: Place) : optional (game: Game)`
- `_summary(game: Game) : optional (rules: RuleSet, status: Status, target: Number, matchNumber: Number, scoreA: Number, scoreB: Number, turnPlayer: Player)`
- `_players(game: Game) : many (position: Number, player: Player, tileCount: Number)`
- `_hand(game: Game, player: Player) : many (tile: Tile)`
- `_board(game: Game) : many (tile: Tile, left: Number, right: Number, fromFirst: Number)`
- `_log(game: Game) : many (turn: Number, matchNumber: Number, player: Player, move: Move, tile: String)`
- `_lastResult(game: Game) : optional (matchNumber: Number, winner: Player, team: Number, points: Number, prize: Number, special: Special, bonus: Number, ending: Ending)`
- `_ruleset(rules: RuleSet) : optional (target: Number, description: String)`
- `_rulesets() : many (rules: RuleSet, target: Number, description: String)`

#### Instances

- `DominoPlaying` — instance of `DominoPlaying` — [Application types](../design/types.md), line 30.
  - `Place` is `Table.Table` — [Application types](../design/types.md), line 32.
  - `Player` is `GuestSessioning.Session` — [Application types](../design/types.md), line 31.

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
- `expire(session: Session) : returns (session: Session, token: String)`
  - Refuses `UNKNOWN_SESSION`: This guest session is not active.
  - Refuses `NOT_IDLE`: That guest session is still in use.

#### Queries

- `_getName(session: Session) : optional (displayName: String)`
- `_idle() : many (session: Session)`

#### Instances

- `GuestSessioning` — instance of `GuestSessioning` — [Application types](../design/types.md), line 34.

### Matchmaking

Defined in [Matchmaking](../design/concepts/Matchmaking.md), line 1.

#### Actions

- `enqueue(player: Player, rules: Rules) : returns (lobby: Lobby)`
  - Refuses `ALREADY_QUEUED`: That player is already waiting for a game.
- `cancel(player: Player) : returns (lobby: Lobby)`
  - Refuses `NOT_QUEUED`: That player is not waiting for a game.
- `launch(lobby: Lobby) : returns (first: Player, second: Player, third: Player, fourth: Player, rules: Rules)`
  - Refuses `NO_SUCH_LOBBY`: There is no such lobby.
  - Refuses `LOBBY_NOT_FULL`: That lobby is still waiting for players.
  - Refuses `COUNTDOWN_RUNNING`: The countdown for that lobby has not finished.

#### Queries

- `_lobbyOf(player: Player) : optional (lobby: Lobby)`
- `_status(lobby: Lobby) : optional (rules: Rules, full: Flag, secondsLeft: Number)`
- `_entries(lobby: Lobby) : many (player: Player)`

#### Instances

- `Matchmaking` — instance of `Matchmaking` — [Application types](../design/types.md), line 36.
  - `Player` is `GuestSessioning.Session` — [Application types](../design/types.md), line 37.
  - `Rules` is `RuleSet` — [Application types](../design/types.md), line 38.

### Table

Defined in [Table](../design/concepts/Table.md), line 1.

#### Actions

- `open(host: Player, code: String, rules: Rules) : returns (table: Table)`
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
- `_get(table: Table) : optional (host: Player, code: String, rules: Rules)`
- `_seats(table: Table) : many (position: Number, player: Player)`
- `_isFull(table: Table) : one (full: Flag)`
- `_tableOf(player: Player) : optional (table: Table)`

#### Instances

- `Table` — instance of `Table` — [Application types](../design/types.md), line 40.
  - `Player` is `GuestSessioning.Session` — [Application types](../design/types.md), line 41.
  - `Rules` is `RuleSet` — [Application types](../design/types.md), line 42.

## Application types

Concrete types:

- `CodeContext` — [Application types](../design/types.md), line 21.
- `RuleSet` — [Application types](../design/types.md), line 18.

## Formers

_Formers name result shapes evaluated when asked. The source former owns_
_the authored explanation; this section records the generated shape._

### the game seen by (session)

Authored path: `Games.GameView`.
- Covered by [Games](../design/compositions/Games.md), line 35.

```former
Former "the game seen by (session)" — inputs (session); bindings (table, game, rules, rulesDescription, status, target, matchNumber, scoreA, scoreB, turnPlayer, tile, boardTile, left, right, fromFirst, position, player, tileCount, displayName, resultMatch, winner, team, points, prize, special, bonus, ending, turnNumber, turnMatch, mover, move, movedTile, moverName); promises exactly one record — forms:
  a record of
    games: each Table._tableOf (player: session) has (table)
      where DominoPlaying._latestAt (place: table) has (game)
      where DominoPlaying._summary (game) has (matchNumber, rules, scoreA, scoreB, status, target, turnPlayer)
      where DominoPlaying._ruleset (rules) has (description: rulesDescription)
      form a record of
        board: each DominoPlaying._board (game) has (fromFirst, left, right, tile: boardTile)
          form a record of
            fromFirst
            left
            right
            tile: boardTile
        game
        hand: each DominoPlaying._hand (game, player: session) has (tile)
          form a record of
            tile
        lastResult: each DominoPlaying._lastResult (game) has (bonus, ending, matchNumber: resultMatch, points, prize, special, team, winner)
          form a record of
            bonus
            ending
            matchNumber: resultMatch
            points
            prize
            special
            team
            winner
        log: each DominoPlaying._log (game) has (matchNumber: turnMatch, move, player: mover, tile: movedTile, turn: turnNumber)
          where GuestSessioning._getName (session: mover) has (displayName: moverName)
          form a record of
            displayName: moverName
            matchNumber: turnMatch
            move
            player: mover
            tile: movedTile
            turn: turnNumber
        matchNumber
        players: each DominoPlaying._players (game) has (player, position, tileCount)
          where GuestSessioning._getName (session: player) has (displayName)
          form a record of
            displayName
            player
            position
            tileCount
        rules
        rulesDescription
        scoreA
        scoreB
        status
        target
        turnPlayer
```

### the lobby of (session)

Authored path: `Tables.Lobby`.
- Covered by [Tables](../design/compositions/Tables.md), line 27.

```former
Former "the lobby of (session)" — inputs (session); bindings (table, host, code, rules, position, player, displayName); promises exactly one record — forms:
  a record of
    tables: each Table._tableOf (player: session) has (table)
      where Table._get (table) has (code, host, rules)
      form a record of
        code
        host
        rules
        seats: each Table._seats (table) has (player, position)
          where GuestSessioning._getName (session: player) has (displayName)
          form a record of
            displayName
            player
            position
        table
```

### the matchmaking lobby of (session)

Authored path: `Matchmaking.QueueLobby`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 19.

```former
Former "the matchmaking lobby of (session)" — inputs (session); bindings (lobby, rules, full, secondsLeft, player, displayName); promises exactly one record — forms:
  a record of
    lobbies: each Matchmaking._lobbyOf (player: session) has (lobby)
      where Matchmaking._status (lobby) has (full, rules, secondsLeft)
      form a record of
        full
        lobby
        players: each Matchmaking._entries (lobby) has (player)
          where GuestSessioning._getName (session: player) has (displayName)
          form a record of
            displayName
            player
        rules
        secondsLeft
```

### the rule sets

Authored path: `Games.Rulesets`.
- Covered by [Games](../design/compositions/Games.md), line 10.

```former
Former "the rule sets" — inputs (); bindings (rules, target, description); promises exactly one record — forms:
  a record of
    rulesets: each DominoPlaying._rulesets () has (description, rules, target)
      form a record of
        description
        rules
        target
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

### Games.AbandonGameWhenPlayerLeaves

Authored path: `Games.AbandonGameWhenPlayerLeaves`.
- Covered by [Games](../design/compositions/Games.md), line 45.

```reaction
when Table.leave (table)
where
  DominoPlaying._activeAt (place: table) has (game)
then
  DominoPlaying.abandon (game)
```

### Games.AbandonGameWhenTableCloses

Authored path: `Games.AbandonGameWhenTableCloses`.
- Covered by [Games](../design/compositions/Games.md), line 46.

```reaction
when Table.close (table, code)
where
  DominoPlaying._activeAt (place: table) has (game)
then
  DominoPlaying.abandon (game)
```

### Games.Play

Authored path: `Games.Play`.
- Covered by [Games](../design/compositions/Games.md), line 25.
- Covered by [Games](../design/compositions/Games.md), line 31.

```reaction
when RequestBoundary.request (game, path: "/games/play", requestId, side, tile, token)
then
  GuestSessioning.resume (token)
```

### Games.Play#2

Authored path: `Games.Play`.
- Covered by [Games](../design/compositions/Games.md), line 25.
- Covered by [Games](../design/compositions/Games.md), line 31.

```reaction
when GuestSessioning.resume (token, displayName, session), asked by Games.Play
where
  earlier, RequestBoundary.request (game, path: "/games/play", requestId, side, tile, token)
then
  DominoPlaying.play (game, player: session, side, tile)
```

### Games.Play#3

Authored path: `Games.Play`.
- Covered by [Games](../design/compositions/Games.md), line 25.
- Covered by [Games](../design/compositions/Games.md), line 31.

```reaction
when DominoPlaying.play (game, player: session, side, tile), asked by Games.Play#2
where
  earlier, RequestBoundary.request (game, path: "/games/play", requestId, side, tile, token)
then
  RequestBoundary.respond (game, requestId)
```

### Games.ShowRulesets

Authored path: `Games.ShowRulesets`.
- Covered by [Games](../design/compositions/Games.md), line 9.
- Covered by [Games](../design/compositions/Games.md), line 14.

```reaction
when RequestBoundary.request (path: "/games/rulesets", requestId)
then
  RequestBoundary.respond (requestId, view: former "the rule sets")
```

### Games.StartGame

Authored path: `Games.StartGame`.
- Covered by [Games](../design/compositions/Games.md), line 17.
- Covered by [Games](../design/compositions/Games.md), line 22.

```reaction
when RequestBoundary.request (path: "/games/start", requestId, token)
then
  GuestSessioning.resume (token)
```

### Games.StartGame:host-of-full-table#2

Authored path: `Games.StartGame`.
- Covered by [Games](../design/compositions/Games.md), line 17.
- Covered by [Games](../design/compositions/Games.md), line 22.

```reaction
when GuestSessioning.resume (token, displayName, session), asked by Games.StartGame
where
  Table._tableOf (player: session) has (table)
  Table._get (table) has (host: session, rules)
  Table._isFull (table) has (full: true)
  Table._seats (table) has (player: first, position: 0)
  Table._seats (table) has (player: second, position: 1)
  Table._seats (table) has (player: third, position: 2)
  Table._seats (table) has (player: fourth, position: 3)
then
  DominoPlaying.start (first, fourth, place: table, rules, second, third)
```

### Games.StartGame:host-of-full-table#3

Authored path: `Games.StartGame`.
- Covered by [Games](../design/compositions/Games.md), line 17.
- Covered by [Games](../design/compositions/Games.md), line 22.

```reaction
when DominoPlaying.start (first, fourth, place: table, rules, second, third, game), asked by Games.StartGame:host-of-full-table#2
where
  earlier, RequestBoundary.request (path: "/games/start", requestId, token)
then
  RequestBoundary.respond (game, requestId)
```

### Games.StartGame:not-host#2

Authored path: `Games.StartGame`.
- Covered by [Games](../design/compositions/Games.md), line 17.
- Covered by [Games](../design/compositions/Games.md), line 22.

```reaction
when GuestSessioning.resume (token, displayName, session), asked by Games.StartGame
where
  Table._tableOf (player: session) has (table)
  no Table._get (table) has (host: session)
  earlier, RequestBoundary.request (path: "/games/start", requestId, token)
then
  RequestBoundary.respond (error: "NOT_HOST", requestId)
```

### Games.StartGame:not-seated#2

Authored path: `Games.StartGame`.
- Covered by [Games](../design/compositions/Games.md), line 17.
- Covered by [Games](../design/compositions/Games.md), line 22.

```reaction
when GuestSessioning.resume (token, displayName, session), asked by Games.StartGame
where
  no Table._tableOf (player: session)
  earlier, RequestBoundary.request (path: "/games/start", requestId, token)
then
  RequestBoundary.respond (error: "NOT_SEATED", requestId)
```

### Games.StartGame:table-not-full#2

Authored path: `Games.StartGame`.
- Covered by [Games](../design/compositions/Games.md), line 17.
- Covered by [Games](../design/compositions/Games.md), line 22.

```reaction
when GuestSessioning.resume (token, displayName, session), asked by Games.StartGame
where
  Table._tableOf (player: session) has (table)
  Table._get (table) has (host: session)
  Table._isFull (table) has (full: false)
  earlier, RequestBoundary.request (path: "/games/start", requestId, token)
then
  RequestBoundary.respond (error: "TABLE_NOT_FULL", requestId)
```

### Games.ViewGame

Authored path: `Games.ViewGame`.
- Covered by [Games](../design/compositions/Games.md), line 34.
- Covered by [Games](../design/compositions/Games.md), line 41.

```reaction
when RequestBoundary.request (path: "/games/view", requestId, token)
then
  GuestSessioning.resume (token)
```

### Games.ViewGame#2

Authored path: `Games.ViewGame`.
- Covered by [Games](../design/compositions/Games.md), line 34.
- Covered by [Games](../design/compositions/Games.md), line 41.

```reaction
when GuestSessioning.resume (token, displayName, session), asked by Games.ViewGame
where
  earlier, RequestBoundary.request (path: "/games/view", requestId, token)
then
  RequestBoundary.respond (requestId, view: former "the game seen by (session)" with (session))
```

### Guests.Expire

Authored path: `Guests.Expire`.
- Covered by [Guests](../design/compositions/Guests.md), line 28.
- Covered by [Guests](../design/compositions/Guests.md), line 34.

```reaction
when RequestBoundary.request (path: "/guests/expire", requestId, session)
then
  GuestSessioning.expire (session)
```

### Guests.Expire#2

Authored path: `Guests.Expire`.
- Covered by [Guests](../design/compositions/Guests.md), line 28.
- Covered by [Guests](../design/compositions/Guests.md), line 34.

```reaction
when GuestSessioning.expire (session, token), asked by Guests.Expire
where
  earlier, RequestBoundary.request (path: "/guests/expire", requestId, session)
then
  RequestBoundary.respond (requestId, session)
```

### Guests.FreeTokenOnSessionEnd

Authored path: `Guests.FreeTokenOnSessionEnd`.
- Covered by [Guests](../design/compositions/Guests.md), line 23.

```reaction
when GuestSessioning.end (token, session)
then
  CodeGenerating.remove (code: token, context: "SESSION_TOKENS")
```

### Guests.FreeTokenOnSessionExpire

Authored path: `Guests.FreeTokenOnSessionExpire`.
- Covered by [Guests](../design/compositions/Guests.md), line 30.

```reaction
when GuestSessioning.expire (token)
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

### Matchmaking.Enqueue

Authored path: `Matchmaking.Enqueue`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 8.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 15.

```reaction
when RequestBoundary.request (path: "/matchmaking/enqueue", requestId, rules, token)
then
  GuestSessioning.resume (token)
```

### Matchmaking.Enqueue:not-seated#2

Authored path: `Matchmaking.Enqueue`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 8.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 15.

```reaction
when GuestSessioning.resume (token, displayName, session), asked by Matchmaking.Enqueue
where
  no Table._tableOf (player: session)
  earlier, RequestBoundary.request (path: "/matchmaking/enqueue", requestId, rules, token)
  DominoPlaying._ruleset (rules)
then
  Matchmaking.enqueue (player: session, rules)
```

### Matchmaking.Enqueue:not-seated#3

Authored path: `Matchmaking.Enqueue`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 8.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 15.

```reaction
when Matchmaking.enqueue (player: session, rules, lobby), asked by Matchmaking.Enqueue:not-seated#2
where
  earlier, RequestBoundary.request (path: "/matchmaking/enqueue", requestId, rules, token)
then
  RequestBoundary.respond (lobby, requestId)
```

### Matchmaking.Enqueue:seated#2

Authored path: `Matchmaking.Enqueue`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 8.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 15.

```reaction
when GuestSessioning.resume (token, displayName, session), asked by Matchmaking.Enqueue
where
  Table._tableOf (player: session)
  earlier, RequestBoundary.request (path: "/matchmaking/enqueue", requestId, rules, token)
then
  RequestBoundary.respond (error: "AT_TABLE", requestId)
```

### Matchmaking.Enqueue:unknown-rules#2

Authored path: `Matchmaking.Enqueue`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 8.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 15.

```reaction
when GuestSessioning.resume (token, displayName, session), asked by Matchmaking.Enqueue
where
  no Table._tableOf (player: session)
  earlier, RequestBoundary.request (path: "/matchmaking/enqueue", requestId, rules, token)
  no DominoPlaying._ruleset (rules)
then
  RequestBoundary.respond (error: "UNKNOWN_RULES", requestId)
```

### Matchmaking.Launch

Authored path: `Matchmaking.Launch`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 38.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 43.

```reaction
when RequestBoundary.request (path: "/matchmaking/launch", requestId, token)
then
  GuestSessioning.resume (token)
```

### Matchmaking.Launch:not-queued#2

Authored path: `Matchmaking.Launch`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 38.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 43.

```reaction
when GuestSessioning.resume (token, displayName, session), asked by Matchmaking.Launch
where
  no Matchmaking._lobbyOf (player: session)
  earlier, RequestBoundary.request (path: "/matchmaking/launch", requestId, token)
then
  RequestBoundary.respond (error: "NOT_QUEUED", requestId)
```

### Matchmaking.Launch:queued#2

Authored path: `Matchmaking.Launch`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 38.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 43.

```reaction
when GuestSessioning.resume (token, displayName, session), asked by Matchmaking.Launch
where
  Matchmaking._lobbyOf (player: session) has (lobby)
then
  Matchmaking.launch (lobby)
```

### Matchmaking.Launch:queued#3

Authored path: `Matchmaking.Launch`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 38.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 43.

```reaction
when Matchmaking.launch (lobby, first, fourth, second, third), asked by Matchmaking.Launch:queued#2
where
  earlier, RequestBoundary.request (path: "/matchmaking/launch", requestId, token)
then
  RequestBoundary.respond (lobby, requestId)
```

### Matchmaking.LeaveQueue

Authored path: `Matchmaking.LeaveQueue`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 28.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 34.

```reaction
when RequestBoundary.request (path: "/matchmaking/leave", requestId, token)
then
  GuestSessioning.resume (token)
```

### Matchmaking.LeaveQueue#2

Authored path: `Matchmaking.LeaveQueue`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 28.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 34.

```reaction
when GuestSessioning.resume (token, displayName, session), asked by Matchmaking.LeaveQueue
then
  Matchmaking.cancel (player: session)
```

### Matchmaking.LeaveQueue#3

Authored path: `Matchmaking.LeaveQueue`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 28.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 34.

```reaction
when Matchmaking.cancel (player: session, lobby), asked by Matchmaking.LeaveQueue#2
where
  earlier, RequestBoundary.request (path: "/matchmaking/leave", requestId, token)
then
  RequestBoundary.respond (lobby, requestId)
```

### Matchmaking.LeaveQueueOnSessionEnd

Authored path: `Matchmaking.LeaveQueueOnSessionEnd`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 30.

```reaction
when GuestSessioning.end (session)
where
  Matchmaking._lobbyOf (player: session)
then
  Matchmaking.cancel (player: session)
```

### Matchmaking.LeaveQueueOnSessionExpire

Authored path: `Matchmaking.LeaveQueueOnSessionExpire`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 31.

```reaction
when GuestSessioning.expire (session)
where
  Matchmaking._lobbyOf (player: session)
then
  Matchmaking.cancel (player: session)
```

### Matchmaking.SeatLaunchedLobby

Authored path: `Matchmaking.SeatLaunchedLobby`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 46.

```reaction
when Matchmaking.launch (first, fourth, rules, second, third)
then
  CodeGenerating.generate (context: "TABLE_CODES", size: 6)
```

### Matchmaking.SeatLaunchedLobby#2

Authored path: `Matchmaking.SeatLaunchedLobby`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 46.

```reaction
when CodeGenerating.generate (context: "TABLE_CODES", size: 6, code), asked by Matchmaking.SeatLaunchedLobby
where
  earlier, Matchmaking.launch (first, fourth, rules, second, third)
then
  Table.open (code, host: first, rules)
```

### Matchmaking.SeatLaunchedLobby#3

Authored path: `Matchmaking.SeatLaunchedLobby`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 46.

```reaction
when Table.open (code, host: first, rules, table), asked by Matchmaking.SeatLaunchedLobby#2
where
  earlier, Matchmaking.launch (first, fourth, rules, second, third)
then
  Table.join (player: second, table)
```

### Matchmaking.SeatLaunchedLobby#4

Authored path: `Matchmaking.SeatLaunchedLobby`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 46.

```reaction
when Table.join (player: second, table), asked by Matchmaking.SeatLaunchedLobby#3
where
  earlier, Matchmaking.launch (first, fourth, rules, second, third)
then
  Table.join (player: third, table)
```

### Matchmaking.SeatLaunchedLobby#5

Authored path: `Matchmaking.SeatLaunchedLobby`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 46.

```reaction
when Table.join (player: third, table), asked by Matchmaking.SeatLaunchedLobby#4
where
  earlier, Matchmaking.launch (first, fourth, rules, second, third)
then
  Table.join (player: fourth, table)
```

### Matchmaking.SeatLaunchedLobby#6

Authored path: `Matchmaking.SeatLaunchedLobby`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 46.

```reaction
when Table.join (player: fourth, table), asked by Matchmaking.SeatLaunchedLobby#5
where
  earlier, Table.open (code, host: first, rules, table), asked by Matchmaking.SeatLaunchedLobby#2
  earlier, Table.join (player: second, table), asked by Matchmaking.SeatLaunchedLobby#3
  earlier, Table.join (player: third, table), asked by Matchmaking.SeatLaunchedLobby#4
then
  DominoPlaying.start (first, fourth, place: table, rules, second, third)
```

### Matchmaking.ShowQueue

Authored path: `Matchmaking.ShowQueue`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 18.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 25.

```reaction
when RequestBoundary.request (path: "/matchmaking/view", requestId, token)
then
  GuestSessioning.resume (token)
```

### Matchmaking.ShowQueue#2

Authored path: `Matchmaking.ShowQueue`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 18.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 25.

```reaction
when GuestSessioning.resume (token, displayName, session), asked by Matchmaking.ShowQueue
where
  earlier, RequestBoundary.request (path: "/matchmaking/view", requestId, token)
then
  RequestBoundary.respond (queue: former "the matchmaking lobby of (session)" with (session), requestId)
```

### Tables.Close

Authored path: `Tables.Close`.
- Covered by [Tables](../design/compositions/Tables.md), line 39.
- Covered by [Tables](../design/compositions/Tables.md), line 46.

```reaction
when RequestBoundary.request (path: "/tables/close", requestId, table, token)
then
  GuestSessioning.resume (token)
```

### Tables.Close:host#2

Authored path: `Tables.Close`.
- Covered by [Tables](../design/compositions/Tables.md), line 39.
- Covered by [Tables](../design/compositions/Tables.md), line 46.

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
- Covered by [Tables](../design/compositions/Tables.md), line 39.
- Covered by [Tables](../design/compositions/Tables.md), line 46.

```reaction
when Table.close (table, code), asked by Tables.Close:host#2
where
  earlier, RequestBoundary.request (path: "/tables/close", requestId, table, token)
then
  RequestBoundary.respond (requestId, table)
```

### Tables.Close:not-host#2

Authored path: `Tables.Close`.
- Covered by [Tables](../design/compositions/Tables.md), line 39.
- Covered by [Tables](../design/compositions/Tables.md), line 46.

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
- Covered by [Tables](../design/compositions/Tables.md), line 38.

```reaction
when Table.leave (table)
where
  no Table._seats (table)
then
  Table.close (table)
```

### Tables.FreeTableCode

Authored path: `Tables.FreeTableCode`.
- Covered by [Tables](../design/compositions/Tables.md), line 41.

```reaction
when Table.close (code)
then
  CodeGenerating.remove (code, context: "TABLE_CODES")
```

### Tables.JoinByCode

Authored path: `Tables.JoinByCode`.
- Covered by [Tables](../design/compositions/Tables.md), line 19.
- Covered by [Tables](../design/compositions/Tables.md), line 23.

```reaction
when RequestBoundary.request (code, path: "/tables/join", requestId, token)
then
  GuestSessioning.resume (token)
```

### Tables.JoinByCode:code-found#2

Authored path: `Tables.JoinByCode`.
- Covered by [Tables](../design/compositions/Tables.md), line 19.
- Covered by [Tables](../design/compositions/Tables.md), line 23.

```reaction
when GuestSessioning.resume (token, displayName, session), asked by Tables.JoinByCode
where
  no Matchmaking._lobbyOf (player: session)
  earlier, RequestBoundary.request (code, path: "/tables/join", requestId, token)
  Table._getByCode (code) has (table)
then
  Table.join (player: session, table)
```

### Tables.JoinByCode:code-found#3

Authored path: `Tables.JoinByCode`.
- Covered by [Tables](../design/compositions/Tables.md), line 19.
- Covered by [Tables](../design/compositions/Tables.md), line 23.

```reaction
when Table.join (player: session, table, position), asked by Tables.JoinByCode:code-found#2
where
  earlier, RequestBoundary.request (code, path: "/tables/join", requestId, token)
then
  RequestBoundary.respond (position, requestId, table)
```

### Tables.JoinByCode:code-unknown#2

Authored path: `Tables.JoinByCode`.
- Covered by [Tables](../design/compositions/Tables.md), line 19.
- Covered by [Tables](../design/compositions/Tables.md), line 23.

```reaction
when GuestSessioning.resume (token, displayName, session), asked by Tables.JoinByCode
where
  no Matchmaking._lobbyOf (player: session)
  earlier, RequestBoundary.request (code, path: "/tables/join", requestId, token)
  no Table._getByCode (code)
then
  RequestBoundary.respond (error: "NO_SUCH_TABLE", requestId)
```

### Tables.JoinByCode:queued#2

Authored path: `Tables.JoinByCode`.
- Covered by [Tables](../design/compositions/Tables.md), line 19.
- Covered by [Tables](../design/compositions/Tables.md), line 23.

```reaction
when GuestSessioning.resume (token, displayName, session), asked by Tables.JoinByCode
where
  Matchmaking._lobbyOf (player: session)
  earlier, RequestBoundary.request (code, path: "/tables/join", requestId, token)
then
  RequestBoundary.respond (error: "IN_QUEUE", requestId)
```

### Tables.Leave

Authored path: `Tables.Leave`.
- Covered by [Tables](../design/compositions/Tables.md), line 35.
- Covered by [Tables](../design/compositions/Tables.md), line 45.

```reaction
when RequestBoundary.request (path: "/tables/leave", requestId, table, token)
then
  GuestSessioning.resume (token)
```

### Tables.Leave#2

Authored path: `Tables.Leave`.
- Covered by [Tables](../design/compositions/Tables.md), line 35.
- Covered by [Tables](../design/compositions/Tables.md), line 45.

```reaction
when GuestSessioning.resume (token, displayName, session), asked by Tables.Leave
where
  earlier, RequestBoundary.request (path: "/tables/leave", requestId, table, token)
then
  Table.leave (player: session, table)
```

### Tables.Leave#3

Authored path: `Tables.Leave`.
- Covered by [Tables](../design/compositions/Tables.md), line 35.
- Covered by [Tables](../design/compositions/Tables.md), line 45.

```reaction
when Table.leave (player: session, table), asked by Tables.Leave#2
where
  earlier, RequestBoundary.request (path: "/tables/leave", requestId, table, token)
then
  RequestBoundary.respond (requestId, table)
```

### Tables.LeaveTableOnSessionEnd

Authored path: `Tables.LeaveTableOnSessionEnd`.
- Covered by [Tables](../design/compositions/Tables.md), line 36.

```reaction
when GuestSessioning.end (session)
where
  Table._tableOf (player: session) has (table)
then
  Table.leave (player: session, table)
```

### Tables.LeaveTableOnSessionExpire

Authored path: `Tables.LeaveTableOnSessionExpire`.
- Covered by [Tables](../design/compositions/Tables.md), line 37.

```reaction
when GuestSessioning.expire (session)
where
  Table._tableOf (player: session) has (table)
then
  Table.leave (player: session, table)
```

### Tables.Open

Authored path: `Tables.Open`.
- Covered by [Tables](../design/compositions/Tables.md), line 8.
- Covered by [Tables](../design/compositions/Tables.md), line 16.

```reaction
when RequestBoundary.request (path: "/tables/open", requestId, rules, token)
then
  GuestSessioning.resume (token)
```

### Tables.Open:not-queued#2

Authored path: `Tables.Open`.
- Covered by [Tables](../design/compositions/Tables.md), line 8.
- Covered by [Tables](../design/compositions/Tables.md), line 16.

```reaction
when GuestSessioning.resume (token, displayName, session), asked by Tables.Open
where
  no Matchmaking._lobbyOf (player: session)
  earlier, RequestBoundary.request (path: "/tables/open", requestId, rules, token)
  DominoPlaying._ruleset (rules)
then
  CodeGenerating.generate (context: "TABLE_CODES", size: 6)
```

### Tables.Open:not-queued#3

Authored path: `Tables.Open`.
- Covered by [Tables](../design/compositions/Tables.md), line 8.
- Covered by [Tables](../design/compositions/Tables.md), line 16.

```reaction
when CodeGenerating.generate (context: "TABLE_CODES", size: 6, code), asked by Tables.Open:not-queued#2
where
  earlier, GuestSessioning.resume (token, displayName, session), asked by Tables.Open
  earlier, RequestBoundary.request (path: "/tables/open", requestId, rules, token)
then
  Table.open (code, host: session, rules)
```

### Tables.Open:not-queued#4

Authored path: `Tables.Open`.
- Covered by [Tables](../design/compositions/Tables.md), line 8.
- Covered by [Tables](../design/compositions/Tables.md), line 16.

```reaction
when Table.open (code, host: session, rules, table), asked by Tables.Open:not-queued#3
where
  earlier, RequestBoundary.request (path: "/tables/open", requestId, rules, token)
then
  RequestBoundary.respond (code, requestId, table)
```

### Tables.Open:queued#2

Authored path: `Tables.Open`.
- Covered by [Tables](../design/compositions/Tables.md), line 8.
- Covered by [Tables](../design/compositions/Tables.md), line 16.

```reaction
when GuestSessioning.resume (token, displayName, session), asked by Tables.Open
where
  Matchmaking._lobbyOf (player: session)
  earlier, RequestBoundary.request (path: "/tables/open", requestId, rules, token)
then
  RequestBoundary.respond (error: "IN_QUEUE", requestId)
```

### Tables.Open:unknown-rules#2

Authored path: `Tables.Open`.
- Covered by [Tables](../design/compositions/Tables.md), line 8.
- Covered by [Tables](../design/compositions/Tables.md), line 16.

```reaction
when GuestSessioning.resume (token, displayName, session), asked by Tables.Open
where
  no Matchmaking._lobbyOf (player: session)
  earlier, RequestBoundary.request (path: "/tables/open", requestId, rules, token)
  no DominoPlaying._ruleset (rules)
then
  RequestBoundary.respond (error: "UNKNOWN_RULES", requestId)
```

### Tables.ShowLobby

Authored path: `Tables.ShowLobby`.
- Covered by [Tables](../design/compositions/Tables.md), line 26.
- Covered by [Tables](../design/compositions/Tables.md), line 32.

```reaction
when RequestBoundary.request (path: "/tables/lobby", requestId, token)
then
  GuestSessioning.resume (token)
```

### Tables.ShowLobby#2

Authored path: `Tables.ShowLobby`.
- Covered by [Tables](../design/compositions/Tables.md), line 26.
- Covered by [Tables](../design/compositions/Tables.md), line 32.

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

- `/games/play` — requires `token`, `game`, `tile`, `side`
- `/games/start` — requires `token`
- `/games/view` — requires `token`
- `/guests/expire` — requires `session`
- `/guests/leave` — requires `token`
- `/guests/me` — requires `token`
- `/guests/start` — requires `displayName`
- `/matchmaking/enqueue` — requires `token`, `rules`
- `/matchmaking/launch` — requires `token`
- `/matchmaking/leave` — requires `token`
- `/matchmaking/view` — requires `token`
- `/tables/close` — requires `token`, `table`
- `/tables/join` — requires `token`, `code`
- `/tables/leave` — requires `token`, `table`
- `/tables/lobby` — requires `token`
- `/tables/open` — requires `token`, `rules`
