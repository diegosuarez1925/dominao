<!-- Generated from the Dominao assembly. Do not edit. -->
<!-- Manifest producer: @mit-sdg/sync-engine@1.1.0; concept specification: sync-engine.concept-specification@1; renderer: @mit-sdg/sync-engine@1.1.0. -->

# Dominao — assembled read-back

_Assembled by sync-engine from registered concepts and composition. Edit the concept_
_specifications and composition source, then regenerate this file._

## Concepts

### Botting

Defined in [Botting](../design/concepts/Botting.md), line 1.

#### Actions

- `create() : returns (bot: Bot)`

#### Queries

- `_name(bot: Bot) : optional (name: String)`

#### Instances

- `Botting` — instance of `Botting` — [Application types](../design/types.md), line 41.

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

- `CodeGenerating` — instance of `CodeGenerating` — [Application types](../design/types.md), line 38.
  - `Context` is `CodeContext` — [Application types](../design/types.md), line 39.

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
  - Refuses `GAME_PAUSED`: The game is paused until every seat is taken.
  - Refuses `NOT_YOUR_TURN`: It is not your turn.
  - Refuses `NOT_IN_HAND`: That tile is not in your hand.
  - Refuses `ILLEGAL_PLAY`: That tile does not match that end of the board.
- `autoplay(game: Game, player: Player) : returns (game: Game)`
  - Refuses `NO_SUCH_GAME`: There is no such game.
  - Refuses `GAME_NOT_ACTIVE`: That game is over.
  - Refuses `GAME_PAUSED`: The game is paused until every seat is taken.
  - Refuses `NOT_YOUR_TURN`: It is not your turn.
- `vacate(game: Game, player: Player) : returns (game: Game, place: Place, position: Number)`
  - Refuses `NO_SUCH_GAME`: There is no such game.
  - Refuses `GAME_NOT_ACTIVE`: That game is over.
  - Refuses `NOT_IN_GAME`: That player is not playing in that game.
- `seat(game: Game, position: Number, player: Player) : returns (game: Game)`
  - Refuses `NO_SUCH_GAME`: There is no such game.
  - Refuses `GAME_NOT_ACTIVE`: That game is over.
  - Refuses `ALREADY_PLAYING`: That player is already playing in that game.
  - Refuses `SEAT_TAKEN`: That seat is not empty.
- `abandon(game: Game) : returns (game: Game)`
  - Refuses `NO_SUCH_GAME`: There is no such game.
  - Refuses `GAME_NOT_ACTIVE`: That game is over.

#### Queries

- `_activeAt(place: Place) : optional (game: Game)`
- `_gameOf(player: Player) : optional (game: Game)`
- `_running() : many (game: Game)`
- `_turn(game: Game) : optional (player: Player, waitingMs: Number)`
- `_vacancies(game: Game) : many (position: Number, player: Player, vacantMs: Number)`
- `_latestAt(place: Place) : optional (game: Game)`
- `_summary(game: Game) : optional (rules: RuleSet, status: Status, target: Number, matchNumber: Number, scoreA: Number, scoreB: Number, turnPlayer: Player)`
- `_players(game: Game) : many (position: Number, player: Player, tileCount: Number)`
- `_hand(game: Game, player: Player) : many (tile: Tile)`
- `_board(game: Game) : many (tile: Tile, left: Number, right: Number, fromFirst: Number)`
- `_log(game: Game) : many (turn: Number, matchNumber: Number, player: Player, move: Move, tile: String)`
- `_lastResult(game: Game) : optional (matchNumber: Number, winner: Player, team: Number, points: Number, prize: Number, special: Special, bonus: Number, ending: Ending)`
- `_results(game: Game) : many (matchNumber: Number, winner: Player, team: Number, points: Number, prize: Number, special: Special, bonus: Number, ending: Ending)`
- `_ruleset(rules: RuleSet) : optional (target: Number, description: String)`
- `_rulesets() : many (rules: RuleSet, target: Number, description: String)`

#### Instances

- `DominoPlaying` — instance of `DominoPlaying` — [Application types](../design/types.md), line 43.
  - `Place` is `Table.Table` — [Application types](../design/types.md), line 45.
  - `Player` is `SeatHolder` — [Application types](../design/types.md), line 44.

### Guesting

Defined in [Guesting](../design/concepts/Guesting.md), line 1.

#### Actions

- `create(displayName: String) : returns (guest: Guest)`
  - Refuses `INVALID_NAME`: A display name must be 1 to 20 characters long.
- `forget(guest: Guest) : returns (guest: Guest)`
  - Refuses `NO_SUCH_GUEST`: There is no such guest.

#### Queries

- `_name(guest: Guest) : optional (displayName: String)`

#### Instances

- `Guesting` — instance of `Guesting` — [Application types](../design/types.md), line 47.

### Matchmaking

Defined in [Matchmaking](../design/concepts/Matchmaking.md), line 1.

#### Actions

- `enqueue(player: Player, rules: Rules, midway: Flag) : returns (lobby: Lobby)`
  - Refuses `ALREADY_QUEUED`: That player is already waiting for a game.
- `cancel(player: Player) : returns (lobby: Lobby)`
  - Refuses `NOT_QUEUED`: That player is not waiting for a game.
- `launch(lobby: Lobby) : returns (first: Player, second: Player, third: Player, fourth: Player, rules: Rules)`
  - Refuses `NO_SUCH_LOBBY`: There is no such lobby.
  - Refuses `LOBBY_NOT_FULL`: That lobby is still waiting for players.
  - Refuses `COUNTDOWN_RUNNING`: The countdown for that lobby has not finished.
- `adopt(place: Place, rules: Rules) : returns (place: Place)`
  - Refuses `PLACE_KNOWN`: That place already has strangers playing at it.
- `release(place: Place) : returns (place: Place)`
  - Refuses `NO_SUCH_PLACE`: There is no such place.

#### Queries

- `_lobbyOf(player: Player) : optional (lobby: Lobby)`
- `_status(lobby: Lobby) : optional (rules: Rules, full: Flag, secondsLeft: Number)`
- `_lobbies() : many (lobby: Lobby)`
- `_ready() : many (lobby: Lobby)`
- `_entries(lobby: Lobby) : many (player: Player, midway: Flag)`
- `_placeRules(place: Place) : optional (rules: Rules)`
- `_places(rules: Rules) : many (place: Place)`
- `_midwayWaiting(rules: Rules) : optional (player: Player)`

#### Instances

- `Matchmaking` — instance of `Matchmaking` — [Application types](../design/types.md), line 52.
  - `Place` is `Table.Table` — [Application types](../design/types.md), line 55.
  - `Player` is `Person` — [Application types](../design/types.md), line 53.
  - `Rules` is `RuleSet` — [Application types](../design/types.md), line 54.

### Sessioning

Defined in [Sessioning](../design/concepts/Sessioning.md), line 1.

#### Actions

- `start(player: Player, token: String, lifetime: Number) : returns (session: Session)`
  - Refuses `INVALID_LIFETIME`: A session must last for some time.
  - Refuses `TOKEN_IN_USE`: That token already belongs to another session.
- `resume(token: String) : returns (session: Session, player: Player)`
  - Refuses `UNKNOWN_SESSION`: This session is not active.
- `end(token: String) : returns (session: Session, player: Player)`
  - Refuses `UNKNOWN_SESSION`: This session is not active.
- `expire(session: Session) : returns (session: Session, player: Player, token: String)`
  - Refuses `UNKNOWN_SESSION`: This session is not active.
  - Refuses `NOT_IDLE`: That session is still in use.

#### Queries

- `_idle() : many (session: Session, player: Player)`
- `_idleFor(player: Player) : optional (idleMs: Number)`
- `_tokens(player: Player) : many (token: String)`

#### Instances

- `Sessioning` — instance of `Sessioning` — [Application types](../design/types.md), line 49.
  - `Player` is `Person` — [Application types](../design/types.md), line 50.

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
- `swap(table: Table, first: Number, second: Number) : returns (table: Table)`
  - Refuses `NO_SUCH_TABLE`: There is no such table.
  - Refuses `SAME_SEAT`: Pick two different seats.
- `close(table: Table) : returns (code: String)`
  - Refuses `NO_SUCH_TABLE`: There is no such table.

#### Queries

- `_tables() : many (table: Table)`
- `_getByCode(code: String) : optional (table: Table)`
- `_get(table: Table) : optional (host: Player, code: String, rules: Rules)`
- `_seats(table: Table) : many (position: Number, player: Player)`
- `_isFull(table: Table) : one (full: Flag)`
- `_tableOf(player: Player) : optional (table: Table)`

#### Instances

- `Table` — instance of `Table` — [Application types](../design/types.md), line 57.
  - `Player` is `Person` — [Application types](../design/types.md), line 58.
  - `Rules` is `RuleSet` — [Application types](../design/types.md), line 59.

## Application types

Concrete types:

- `CodeContext` — [Application types](../design/types.md), line 25.
- `Person` — [Application types](../design/types.md), line 29.
- `RuleSet` — [Application types](../design/types.md), line 22.
- `SeatHolder` — [Application types](../design/types.md), line 32.

## Formers

_Formers name result shapes evaluated when asked. The source former owns_
_the authored explanation; this section records the generated shape._

### the game seen by (me)

Authored path: `Games.GameView`.
- Covered by [Games](../design/compositions/Games.md), line 35.

```former
Former "the game seen by (me)" — inputs (me); bindings (table, game, rules, rulesDescription, status, target, matchNumber, scoreA, scoreB, turnPlayer, tile, boardTile, left, right, fromFirst, position, player, tileCount, displayName, botName, idleMs, vacantPosition, leaver, leaverName, leaverBot, vacantMs, placeRules, resultMatch, pastMatch, pastWinner, pastTeam, pastPoints, pastSpecial, pastEnding, winner, team, points, prize, special, bonus, ending, turnNumber, turnMatch, mover, move, movedTile, moverName, moverBot); promises exactly one record — forms:
  a record of
    games: each Table._tableOf (player: me) has (table)
      where DominoPlaying._latestAt (place: table) has (game)
      where DominoPlaying._summary (game) has (matchNumber, rules, scoreA, scoreB, status, target, turnPlayer)
      where DominoPlaying._ruleset (rules) has (description: rulesDescription)
      where whether Matchmaking._placeRules (place: table) has (rules: placeRules)
      form a record of
        absentAfterMs: 45000
        board: each DominoPlaying._board (game) has (fromFirst, left, right, tile: boardTile)
          form a record of
            fromFirst
            left
            right
            tile: boardTile
        botAfterMs: 30000
        game
        hand: each DominoPlaying._hand (game, player: me) has (tile)
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
          where whether Guesting._name (guest: mover) has (displayName: moverName)
          where whether Botting._name (bot: mover) has (name: moverBot)
          form a record of
            botName: moverBot
            displayName: moverName
            matchNumber: turnMatch
            move
            player: mover
            tile: movedTile
            turn: turnNumber
        matchNumber
        players: each DominoPlaying._players (game) has (player, position, tileCount)
          where whether Guesting._name (guest: player) has (displayName)
          where whether Botting._name (bot: player) has (name: botName)
          where whether Sessioning._idleFor (player) has (idleMs)
          form a record of
            botName
            displayName
            idleMs
            player
            position
            tileCount
        publicRules: placeRules
        results: each DominoPlaying._results (game) has (ending: pastEnding, matchNumber: pastMatch, points: pastPoints, special: pastSpecial, team: pastTeam, winner: pastWinner)
          form a record of
            ending: pastEnding
            matchNumber: pastMatch
            points: pastPoints
            special: pastSpecial
            team: pastTeam
            winner: pastWinner
        rules
        rulesDescription
        scoreA
        scoreB
        status
        target
        turnPlayer
        vacancies: each DominoPlaying._vacancies (game) has (player: leaver, position: vacantPosition, vacantMs)
          where whether Guesting._name (guest: leaver) has (displayName: leaverName)
          where whether Botting._name (bot: leaver) has (name: leaverBot)
          form a record of
            botName: leaverBot
            displayName: leaverName
            player: leaver
            position: vacantPosition
            vacantMs
```

### the lobby of (me)

Authored path: `Tables.Lobby`.
- Covered by [Tables](../design/compositions/Tables.md), line 31.

```former
Former "the lobby of (me)" — inputs (me); bindings (table, host, code, rules, position, player, displayName); promises exactly one record — forms:
  a record of
    tables: each Table._tableOf (player: me) has (table)
      where Table._get (table) has (code, host, rules)
      form a record of
        code
        host
        rules
        seats: each Table._seats (table) has (player, position)
          where Guesting._name (guest: player) has (displayName)
          form a record of
            displayName
            player
            position
        table
```

### the matchmaking lobby of (me)

Authored path: `Matchmaking.QueueLobby`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 20.

```former
Former "the matchmaking lobby of (me)" — inputs (me); bindings (lobby, rules, full, secondsLeft, player, midway, displayName); promises exactly one record — forms:
  a record of
    lobbies: each Matchmaking._lobbyOf (player: me) has (lobby)
      where Matchmaking._status (lobby) has (full, rules, secondsLeft)
      form a record of
        full
        lobby
        players: each Matchmaking._entries (lobby) has (midway, player)
          where Guesting._name (guest: player) has (displayName)
          form a record of
            displayName
            midway
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

### Games.AbandonGameWhenTableCloses

Authored path: `Games.AbandonGameWhenTableCloses`.
- Covered by [Games](../design/compositions/Games.md), line 52.

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
  Sessioning.resume (token)
```

### Games.Play#2

Authored path: `Games.Play`.
- Covered by [Games](../design/compositions/Games.md), line 25.
- Covered by [Games](../design/compositions/Games.md), line 31.

```reaction
when Sessioning.resume (token, player: me), asked by Games.Play
where
  earlier, RequestBoundary.request (game, path: "/games/play", requestId, side, tile, token)
then
  DominoPlaying.play (game, player: me, side, tile)
```

### Games.Play#3

Authored path: `Games.Play`.
- Covered by [Games](../design/compositions/Games.md), line 25.
- Covered by [Games](../design/compositions/Games.md), line 31.

```reaction
when DominoPlaying.play (game, player: me, side, tile), asked by Games.Play#2
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
  Sessioning.resume (token)
```

### Games.StartGame:host-of-full-table#2

Authored path: `Games.StartGame`.
- Covered by [Games](../design/compositions/Games.md), line 17.
- Covered by [Games](../design/compositions/Games.md), line 22.

```reaction
when Sessioning.resume (token, player: me), asked by Games.StartGame
where
  Table._tableOf (player: me) has (table)
  Table._get (table) has (host: me, rules)
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
when Sessioning.resume (token, player: me), asked by Games.StartGame
where
  Table._tableOf (player: me) has (table)
  no Table._get (table) has (host: me)
  earlier, RequestBoundary.request (path: "/games/start", requestId, token)
then
  RequestBoundary.respond (error: "NOT_HOST", requestId)
```

### Games.StartGame:not-seated#2

Authored path: `Games.StartGame`.
- Covered by [Games](../design/compositions/Games.md), line 17.
- Covered by [Games](../design/compositions/Games.md), line 22.

```reaction
when Sessioning.resume (token, player: me), asked by Games.StartGame
where
  no Table._tableOf (player: me)
  earlier, RequestBoundary.request (path: "/games/start", requestId, token)
then
  RequestBoundary.respond (error: "NOT_SEATED", requestId)
```

### Games.StartGame:table-not-full#2

Authored path: `Games.StartGame`.
- Covered by [Games](../design/compositions/Games.md), line 17.
- Covered by [Games](../design/compositions/Games.md), line 22.

```reaction
when Sessioning.resume (token, player: me), asked by Games.StartGame
where
  Table._tableOf (player: me) has (table)
  Table._get (table) has (host: me)
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
  Sessioning.resume (token)
```

### Games.ViewGame#2

Authored path: `Games.ViewGame`.
- Covered by [Games](../design/compositions/Games.md), line 34.
- Covered by [Games](../design/compositions/Games.md), line 41.

```reaction
when Sessioning.resume (token, player: me), asked by Games.ViewGame
where
  earlier, RequestBoundary.request (path: "/games/view", requestId, token)
then
  RequestBoundary.respond (requestId, view: former "the game seen by (me)" with (me))
```

### Guests.End

Authored path: `Guests.End`.
- Covered by [Guests](../design/compositions/Guests.md), line 16.
- Covered by [Guests](../design/compositions/Guests.md), line 21.

```reaction
when RequestBoundary.request (path: "/sessions/end", requestId, token)
then
  Sessioning.end (token)
```

### Guests.End#2

Authored path: `Guests.End`.
- Covered by [Guests](../design/compositions/Guests.md), line 16.
- Covered by [Guests](../design/compositions/Guests.md), line 21.

```reaction
when Sessioning.end (token, player), asked by Guests.End
where
  earlier, RequestBoundary.request (path: "/sessions/end", requestId, token)
then
  RequestBoundary.respond (player, requestId)
```

### Guests.Expire

Authored path: `Guests.Expire`.
- Covered by [Guests](../design/compositions/Guests.md), line 31.
- Covered by [Guests](../design/compositions/Guests.md), line 38.

```reaction
when RequestBoundary.request (path: "/sessions/expire", requestId, session)
then
  Sessioning.expire (session)
```

### Guests.Expire#2

Authored path: `Guests.Expire`.
- Covered by [Guests](../design/compositions/Guests.md), line 31.
- Covered by [Guests](../design/compositions/Guests.md), line 38.

```reaction
when Sessioning.expire (session, player), asked by Guests.Expire
where
  earlier, RequestBoundary.request (path: "/sessions/expire", requestId, session)
then
  RequestBoundary.respond (requestId, session)
```

### Guests.ForgetGuestOnSessionEnd

Authored path: `Guests.ForgetGuestOnSessionEnd`.
- Covered by [Guests](../design/compositions/Guests.md), line 27.

```reaction
when Sessioning.end (player)
where
  Guesting._name (guest: player)
  no Sessioning._idleFor (player)
then
  Guesting.forget (guest: player)
```

### Guests.ForgetGuestOnSessionExpire

Authored path: `Guests.ForgetGuestOnSessionExpire`.
- Covered by [Guests](../design/compositions/Guests.md), line 35.

```reaction
when Sessioning.expire (player)
where
  Guesting._name (guest: player)
  no Sessioning._idleFor (player)
then
  Guesting.forget (guest: player)
```

### Guests.FreeTokenOnSessionEnd

Authored path: `Guests.FreeTokenOnSessionEnd`.
- Covered by [Guests](../design/compositions/Guests.md), line 24.

```reaction
when Sessioning.end (token, player)
then
  CodeGenerating.remove (code: token, context: "SESSION_TOKENS")
```

### Guests.FreeTokenOnSessionExpire

Authored path: `Guests.FreeTokenOnSessionExpire`.
- Covered by [Guests](../design/compositions/Guests.md), line 33.

```reaction
when Sessioning.expire (token)
then
  CodeGenerating.remove (code: token, context: "SESSION_TOKENS")
```

### Guests.Me

Authored path: `Guests.Me`.
- Covered by [Guests](../design/compositions/Guests.md), line 15.
- Covered by [Guests](../design/compositions/Guests.md), line 20.

```reaction
when RequestBoundary.request (path: "/sessions/me", requestId, token)
then
  Sessioning.resume (token)
```

### Guests.Me#2

Authored path: `Guests.Me`.
- Covered by [Guests](../design/compositions/Guests.md), line 15.
- Covered by [Guests](../design/compositions/Guests.md), line 20.

```reaction
when Sessioning.resume (token, player), asked by Guests.Me
where
  Guesting._name (guest: player) has (displayName)
  earlier, RequestBoundary.request (path: "/sessions/me", requestId, token)
then
  RequestBoundary.respond (displayName, player, requestId)
```

### Guests.Start

Authored path: `Guests.Start`.
- Covered by [Guests](../design/compositions/Guests.md), line 3.
- Covered by [Guests](../design/compositions/Guests.md), line 11.

```reaction
when RequestBoundary.request (displayName, path: "/guests/start", requestId)
then
  Guesting.create (displayName)
```

### Guests.Start#2

Authored path: `Guests.Start`.
- Covered by [Guests](../design/compositions/Guests.md), line 3.
- Covered by [Guests](../design/compositions/Guests.md), line 11.

```reaction
when Guesting.create (displayName, guest), asked by Guests.Start
then
  CodeGenerating.generate (context: "SESSION_TOKENS", size: 32)
```

### Guests.Start#3

Authored path: `Guests.Start`.
- Covered by [Guests](../design/compositions/Guests.md), line 3.
- Covered by [Guests](../design/compositions/Guests.md), line 11.

```reaction
when CodeGenerating.generate (context: "SESSION_TOKENS", size: 32, code), asked by Guests.Start#2
where
  earlier, Guesting.create (displayName, guest), asked by Guests.Start
then
  Sessioning.start (lifetime: 43200000, player: guest, token: code)
```

### Guests.Start#4

Authored path: `Guests.Start`.
- Covered by [Guests](../design/compositions/Guests.md), line 3.
- Covered by [Guests](../design/compositions/Guests.md), line 11.

```reaction
when Sessioning.start (lifetime: 43200000, player: guest, token: code, session), asked by Guests.Start#3
where
  earlier, RequestBoundary.request (displayName, path: "/guests/start", requestId)
then
  RequestBoundary.respond (player: guest, requestId, token: code)
```

### Matchmaking.DropAbsentWaiter:away

Authored path: `Matchmaking.DropAbsentWaiter`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 50.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 55.

```reaction
when RequestBoundary.request (path: "/matchmaking/drop-absent", player, requestId)
where
  Matchmaking._lobbyOf (player)
  Sessioning._idleFor (player) has (idleMs)
  idleMs is at least 120000
then
  Matchmaking.cancel (player)
```

### Matchmaking.DropAbsentWaiter:away#2

Authored path: `Matchmaking.DropAbsentWaiter`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 50.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 55.

```reaction
when Matchmaking.cancel (player, lobby), asked by Matchmaking.DropAbsentWaiter:away
where
  earlier, RequestBoundary.request (path: "/matchmaking/drop-absent", player, requestId)
then
  RequestBoundary.respond (lobby, requestId)
```

### Matchmaking.DropAbsentWaiter:no-session

Authored path: `Matchmaking.DropAbsentWaiter`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 50.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 55.

```reaction
when RequestBoundary.request (path: "/matchmaking/drop-absent", player, requestId)
where
  Matchmaking._lobbyOf (player)
  no Sessioning._idleFor (player)
then
  Matchmaking.cancel (player)
```

### Matchmaking.DropAbsentWaiter:no-session#2

Authored path: `Matchmaking.DropAbsentWaiter`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 50.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 55.

```reaction
when Matchmaking.cancel (player, lobby), asked by Matchmaking.DropAbsentWaiter:no-session
where
  earlier, RequestBoundary.request (path: "/matchmaking/drop-absent", player, requestId)
then
  RequestBoundary.respond (lobby, requestId)
```

### Matchmaking.DropAbsentWaiter:not-queued

Authored path: `Matchmaking.DropAbsentWaiter`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 50.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 55.

```reaction
when RequestBoundary.request (path: "/matchmaking/drop-absent", player, requestId)
where
  no Matchmaking._lobbyOf (player)
then
  RequestBoundary.respond (error: "NOT_QUEUED", requestId)
```

### Matchmaking.DropAbsentWaiter:present

Authored path: `Matchmaking.DropAbsentWaiter`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 50.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 55.

```reaction
when RequestBoundary.request (path: "/matchmaking/drop-absent", player, requestId)
where
  Matchmaking._lobbyOf (player)
  Sessioning._idleFor (player) has (idleMs)
  idleMs is less than 120000
then
  RequestBoundary.respond (error: "STILL_HERE", requestId)
```

### Matchmaking.Enqueue

Authored path: `Matchmaking.Enqueue`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 8.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 16.

```reaction
when RequestBoundary.request (midway, path: "/matchmaking/enqueue", requestId, rules, token)
then
  Sessioning.resume (token)
```

### Matchmaking.Enqueue:not-seated#2

Authored path: `Matchmaking.Enqueue`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 8.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 16.

```reaction
when Sessioning.resume (token, player: me), asked by Matchmaking.Enqueue
where
  no Table._tableOf (player: me)
  earlier, RequestBoundary.request (midway, path: "/matchmaking/enqueue", requestId, rules, token)
  DominoPlaying._ruleset (rules)
then
  Matchmaking.enqueue (midway, player: me, rules)
```

### Matchmaking.Enqueue:not-seated#3

Authored path: `Matchmaking.Enqueue`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 8.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 16.

```reaction
when Matchmaking.enqueue (midway, player: me, rules, lobby), asked by Matchmaking.Enqueue:not-seated#2
where
  earlier, RequestBoundary.request (midway, path: "/matchmaking/enqueue", requestId, rules, token)
then
  RequestBoundary.respond (lobby, requestId)
```

### Matchmaking.Enqueue:seated#2

Authored path: `Matchmaking.Enqueue`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 8.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 16.

```reaction
when Sessioning.resume (token, player: me), asked by Matchmaking.Enqueue
where
  Table._tableOf (player: me)
  earlier, RequestBoundary.request (midway, path: "/matchmaking/enqueue", requestId, rules, token)
then
  RequestBoundary.respond (error: "AT_TABLE", requestId)
```

### Matchmaking.Enqueue:unknown-rules#2

Authored path: `Matchmaking.Enqueue`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 8.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 16.

```reaction
when Sessioning.resume (token, player: me), asked by Matchmaking.Enqueue
where
  no Table._tableOf (player: me)
  earlier, RequestBoundary.request (midway, path: "/matchmaking/enqueue", requestId, rules, token)
  no DominoPlaying._ruleset (rules)
then
  RequestBoundary.respond (error: "UNKNOWN_RULES", requestId)
```

### Matchmaking.FillEmptySeatFromQueue

Authored path: `Matchmaking.FillEmptySeatFromQueue`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 70.

```reaction
when DominoPlaying.vacate (place)
where
  Matchmaking._placeRules (place) has (rules)
  Matchmaking._midwayWaiting (rules) has (player)
  Table._isFull (table: place) has (full: false)
then
  Table.join (player, table: place)
```

### Matchmaking.ForgetClosedTable

Authored path: `Matchmaking.ForgetClosedTable`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 75.

```reaction
when requested Table.close (table)
where
  Matchmaking._placeRules (place: table)
then
  Matchmaking.release (place: table)
```

### Matchmaking.Launch

Authored path: `Matchmaking.Launch`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 39.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 46.

```reaction
when RequestBoundary.request (lobby, path: "/matchmaking/launch", requestId)
then
  Matchmaking.launch (lobby)
```

### Matchmaking.Launch#2

Authored path: `Matchmaking.Launch`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 39.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 46.

```reaction
when Matchmaking.launch (lobby, first, fourth, second, third), asked by Matchmaking.Launch
where
  earlier, RequestBoundary.request (lobby, path: "/matchmaking/launch", requestId)
then
  RequestBoundary.respond (lobby, requestId)
```

### Matchmaking.LeaveQueue

Authored path: `Matchmaking.LeaveQueue`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 29.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 35.

```reaction
when RequestBoundary.request (path: "/matchmaking/leave", requestId, token)
then
  Sessioning.resume (token)
```

### Matchmaking.LeaveQueue#2

Authored path: `Matchmaking.LeaveQueue`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 29.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 35.

```reaction
when Sessioning.resume (token, player: me), asked by Matchmaking.LeaveQueue
then
  Matchmaking.cancel (player: me)
```

### Matchmaking.LeaveQueue#3

Authored path: `Matchmaking.LeaveQueue`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 29.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 35.

```reaction
when Matchmaking.cancel (player: me, lobby), asked by Matchmaking.LeaveQueue#2
where
  earlier, RequestBoundary.request (path: "/matchmaking/leave", requestId, token)
then
  RequestBoundary.respond (lobby, requestId)
```

### Matchmaking.LeaveQueueOnSessionEnd

Authored path: `Matchmaking.LeaveQueueOnSessionEnd`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 31.

```reaction
when Sessioning.end (player)
where
  no Sessioning._idleFor (player)
  Matchmaking._lobbyOf (player)
then
  Matchmaking.cancel (player)
```

### Matchmaking.LeaveQueueOnSessionExpire

Authored path: `Matchmaking.LeaveQueueOnSessionExpire`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 32.

```reaction
when Sessioning.expire (player)
where
  no Sessioning._idleFor (player)
  Matchmaking._lobbyOf (player)
then
  Matchmaking.cancel (player)
```

### Matchmaking.SeatLaunchedLobby

Authored path: `Matchmaking.SeatLaunchedLobby`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 58.

```reaction
when Matchmaking.launch (first, fourth, rules, second, third)
then
  CodeGenerating.generate (context: "TABLE_CODES", size: 6)
```

### Matchmaking.SeatLaunchedLobby#2

Authored path: `Matchmaking.SeatLaunchedLobby`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 58.

```reaction
when CodeGenerating.generate (context: "TABLE_CODES", size: 6, code), asked by Matchmaking.SeatLaunchedLobby
where
  earlier, Matchmaking.launch (first, fourth, rules, second, third)
then
  Table.open (code, host: first, rules)
```

### Matchmaking.SeatLaunchedLobby#3

Authored path: `Matchmaking.SeatLaunchedLobby`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 58.

```reaction
when Table.open (code, host: first, rules, table), asked by Matchmaking.SeatLaunchedLobby#2
where
  earlier, Matchmaking.launch (first, fourth, rules, second, third)
then
  Table.join (player: second, table)
```

### Matchmaking.SeatLaunchedLobby#4

Authored path: `Matchmaking.SeatLaunchedLobby`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 58.

```reaction
when Table.join (player: second, table), asked by Matchmaking.SeatLaunchedLobby#3
where
  earlier, Matchmaking.launch (first, fourth, rules, second, third)
then
  Table.join (player: third, table)
```

### Matchmaking.SeatLaunchedLobby#5

Authored path: `Matchmaking.SeatLaunchedLobby`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 58.

```reaction
when Table.join (player: third, table), asked by Matchmaking.SeatLaunchedLobby#4
where
  earlier, Matchmaking.launch (first, fourth, rules, second, third)
then
  Table.join (player: fourth, table)
```

### Matchmaking.SeatLaunchedLobby#6

Authored path: `Matchmaking.SeatLaunchedLobby`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 58.

```reaction
when Table.join (player: fourth, table), asked by Matchmaking.SeatLaunchedLobby#5
where
  earlier, Table.open (code, host: first, rules, table), asked by Matchmaking.SeatLaunchedLobby#2
  earlier, Table.join (player: second, table), asked by Matchmaking.SeatLaunchedLobby#3
  earlier, Table.join (player: third, table), asked by Matchmaking.SeatLaunchedLobby#4
then
  DominoPlaying.start (first, fourth, place: table, rules, second, third)
```

### Matchmaking.SeatLaunchedLobby#7

Authored path: `Matchmaking.SeatLaunchedLobby`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 58.

```reaction
when DominoPlaying.start (first, fourth, place: table, rules, second, third), asked by Matchmaking.SeatLaunchedLobby#6
then
  Matchmaking.adopt (place: table, rules)
```

### Matchmaking.SendMidwayGuestToOpenSeat

Authored path: `Matchmaking.SendMidwayGuestToOpenSeat`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 68.

```reaction
when Matchmaking.enqueue (midway: true, player, rules)
where
  Matchmaking._places (rules) has (place)
  DominoPlaying._activeAt (place)
  Table._isFull (table: place) has (full: false)
then
  Table.join (player, table: place)
```

### Matchmaking.ShowQueue

Authored path: `Matchmaking.ShowQueue`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 19.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 26.

```reaction
when RequestBoundary.request (path: "/matchmaking/view", requestId, token)
then
  Sessioning.resume (token)
```

### Matchmaking.ShowQueue#2

Authored path: `Matchmaking.ShowQueue`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 19.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 26.

```reaction
when Sessioning.resume (token, player: me), asked by Matchmaking.ShowQueue
where
  earlier, RequestBoundary.request (path: "/matchmaking/view", requestId, token)
then
  RequestBoundary.respond (queue: former "the matchmaking lobby of (me)" with (me), requestId)
```

### Matchmaking.StopWaitingOnceSeated

Authored path: `Matchmaking.StopWaitingOnceSeated`.
- Covered by [Matchmaking](../design/compositions/Matchmaking.md), line 73.

```reaction
when requested Table.join (player)
where
  Matchmaking._lobbyOf (player)
then
  Matchmaking.cancel (player)
```

### Seats.BotMove:bot-ready

Authored path: `Seats.BotMove`.
- Covered by [Seats](../design/compositions/Seats.md), line 20.
- Covered by [Seats](../design/compositions/Seats.md), line 35.

```reaction
when RequestBoundary.request (game, path: "/games/bot-move", requestId)
where
  DominoPlaying._turn (game) has (player, waitingMs)
  Botting._name (bot: player)
  waitingMs is at least 1500
then
  DominoPlaying.autoplay (game, player)
```

### Seats.BotMove:bot-ready#2

Authored path: `Seats.BotMove`.
- Covered by [Seats](../design/compositions/Seats.md), line 20.
- Covered by [Seats](../design/compositions/Seats.md), line 35.

```reaction
when DominoPlaying.autoplay (game, player), asked by Seats.BotMove:bot-ready
where
  earlier, RequestBoundary.request (game, path: "/games/bot-move", requestId)
then
  RequestBoundary.respond (game, requestId)
```

### Seats.BotMove:bot-thinking

Authored path: `Seats.BotMove`.
- Covered by [Seats](../design/compositions/Seats.md), line 20.
- Covered by [Seats](../design/compositions/Seats.md), line 35.

```reaction
when RequestBoundary.request (game, path: "/games/bot-move", requestId)
where
  DominoPlaying._turn (game) has (player, waitingMs)
  Botting._name (bot: player)
  waitingMs is less than 1500
then
  RequestBoundary.respond (error: "TOO_SOON", requestId)
```

### Seats.BotMove:not-being-played

Authored path: `Seats.BotMove`.
- Covered by [Seats](../design/compositions/Seats.md), line 20.
- Covered by [Seats](../design/compositions/Seats.md), line 35.

```reaction
when RequestBoundary.request (game, path: "/games/bot-move", requestId)
where
  no DominoPlaying._turn (game)
then
  RequestBoundary.respond (error: "GAME_NOT_ACTIVE", requestId)
```

### Seats.BotMove:person-to-play

Authored path: `Seats.BotMove`.
- Covered by [Seats](../design/compositions/Seats.md), line 20.
- Covered by [Seats](../design/compositions/Seats.md), line 35.

```reaction
when RequestBoundary.request (game, path: "/games/bot-move", requestId)
where
  DominoPlaying._turn (game) has (player)
  no Botting._name (bot: player)
then
  RequestBoundary.respond (error: "NOT_A_BOT", requestId)
```

### Seats.DropAbsentPlayer:absent

Authored path: `Seats.DropAbsentPlayer`.
- Covered by [Seats](../design/compositions/Seats.md), line 25.
- Covered by [Seats](../design/compositions/Seats.md), line 36.

```reaction
when RequestBoundary.request (game, path: "/games/drop-absent", player, requestId)
where
  DominoPlaying._players (game) has (player)
  Sessioning._idleFor (player) has (idleMs)
  idleMs is at least 45000
  Table._tableOf (player) has (table)
then
  Table.leave (player, table)
```

### Seats.DropAbsentPlayer:absent#2

Authored path: `Seats.DropAbsentPlayer`.
- Covered by [Seats](../design/compositions/Seats.md), line 25.
- Covered by [Seats](../design/compositions/Seats.md), line 36.

```reaction
when Table.leave (player, table), asked by Seats.DropAbsentPlayer:absent
where
  earlier, RequestBoundary.request (game, path: "/games/drop-absent", player, requestId)
then
  RequestBoundary.respond (requestId, table)
```

### Seats.DropAbsentPlayer:no-session

Authored path: `Seats.DropAbsentPlayer`.
- Covered by [Seats](../design/compositions/Seats.md), line 25.
- Covered by [Seats](../design/compositions/Seats.md), line 36.

```reaction
when RequestBoundary.request (game, path: "/games/drop-absent", player, requestId)
where
  no Sessioning._idleFor (player)
then
  RequestBoundary.respond (error: "NOT_A_GUEST", requestId)
```

### Seats.DropAbsentPlayer:not-playing

Authored path: `Seats.DropAbsentPlayer`.
- Covered by [Seats](../design/compositions/Seats.md), line 25.
- Covered by [Seats](../design/compositions/Seats.md), line 36.

```reaction
when RequestBoundary.request (game, path: "/games/drop-absent", player, requestId)
where
  Sessioning._idleFor (player) has (idleMs)
  idleMs is at least 45000
  no DominoPlaying._players (game) has (player)
then
  RequestBoundary.respond (error: "NOT_IN_GAME", requestId)
```

### Seats.DropAbsentPlayer:not-seated

Authored path: `Seats.DropAbsentPlayer`.
- Covered by [Seats](../design/compositions/Seats.md), line 25.
- Covered by [Seats](../design/compositions/Seats.md), line 36.

```reaction
when RequestBoundary.request (game, path: "/games/drop-absent", player, requestId)
where
  DominoPlaying._players (game) has (player)
  Sessioning._idleFor (player) has (idleMs)
  idleMs is at least 45000
  no Table._tableOf (player)
then
  RequestBoundary.respond (error: "NOT_SEATED", requestId)
```

### Seats.DropAbsentPlayer:present

Authored path: `Seats.DropAbsentPlayer`.
- Covered by [Seats](../design/compositions/Seats.md), line 25.
- Covered by [Seats](../design/compositions/Seats.md), line 36.

```reaction
when RequestBoundary.request (game, path: "/games/drop-absent", player, requestId)
where
  Sessioning._idleFor (player) has (idleMs)
  idleMs is less than 45000
then
  RequestBoundary.respond (error: "STILL_HERE", requestId)
```

### Seats.ReplaceBotWithJoiner

Authored path: `Seats.ReplaceBotWithJoiner`.
- Covered by [Seats](../design/compositions/Seats.md), line 19.

```reaction
when Table.join (player, table, position)
where
  DominoPlaying._activeAt (place: table) has (game)
  DominoPlaying._players (game) has (player: bot, position)
  Botting._name (bot)
then
  DominoPlaying.vacate (game, player: bot)
```

### Seats.ReplaceBotWithJoiner#2

Authored path: `Seats.ReplaceBotWithJoiner`.
- Covered by [Seats](../design/compositions/Seats.md), line 19.

```reaction
when DominoPlaying.vacate (game, player: bot), asked by Seats.ReplaceBotWithJoiner
where
  earlier, Table.join (player, table, position)
then
  DominoPlaying.seat (game, player, position)
```

### Seats.SeatBot:not-empty

Authored path: `Seats.SeatBot`.
- Covered by [Seats](../design/compositions/Seats.md), line 17.
- Covered by [Seats](../design/compositions/Seats.md), line 34.

```reaction
when RequestBoundary.request (game, path: "/games/seat-bot", position, requestId)
where
  no DominoPlaying._vacancies (game) has (position)
then
  RequestBoundary.respond (error: "SEAT_TAKEN", requestId)
```

### Seats.SeatBot:still-waiting

Authored path: `Seats.SeatBot`.
- Covered by [Seats](../design/compositions/Seats.md), line 17.
- Covered by [Seats](../design/compositions/Seats.md), line 34.

```reaction
when RequestBoundary.request (game, path: "/games/seat-bot", position, requestId)
where
  DominoPlaying._vacancies (game) has (position, vacantMs)
  vacantMs is less than 30000
then
  RequestBoundary.respond (error: "TOO_SOON", requestId)
```

### Seats.SeatBot:waited-long-enough

Authored path: `Seats.SeatBot`.
- Covered by [Seats](../design/compositions/Seats.md), line 17.
- Covered by [Seats](../design/compositions/Seats.md), line 34.

```reaction
when RequestBoundary.request (game, path: "/games/seat-bot", position, requestId)
where
  DominoPlaying._vacancies (game) has (position, vacantMs)
  vacantMs is at least 30000
then
  Botting.create ()
```

### Seats.SeatBot:waited-long-enough#2

Authored path: `Seats.SeatBot`.
- Covered by [Seats](../design/compositions/Seats.md), line 17.
- Covered by [Seats](../design/compositions/Seats.md), line 34.

```reaction
when Botting.create (bot), asked by Seats.SeatBot:waited-long-enough
where
  earlier, RequestBoundary.request (game, path: "/games/seat-bot", position, requestId)
then
  DominoPlaying.seat (game, player: bot, position)
```

### Seats.SeatBot:waited-long-enough#3

Authored path: `Seats.SeatBot`.
- Covered by [Seats](../design/compositions/Seats.md), line 17.
- Covered by [Seats](../design/compositions/Seats.md), line 34.

```reaction
when DominoPlaying.seat (game, player: bot, position), asked by Seats.SeatBot:waited-long-enough#2
where
  earlier, RequestBoundary.request (game, path: "/games/seat-bot", position, requestId)
then
  RequestBoundary.respond (bot, game, requestId)
```

### Seats.TakeEmptySeat

Authored path: `Seats.TakeEmptySeat`.
- Covered by [Seats](../design/compositions/Seats.md), line 12.

```reaction
when Table.join (player, table, position)
where
  DominoPlaying._activeAt (place: table) has (game)
  DominoPlaying._vacancies (game) has (position)
then
  DominoPlaying.seat (game, player, position)
```

### Seats.VacateSeatWhenPlayerLeaves

Authored path: `Seats.VacateSeatWhenPlayerLeaves`.
- Covered by [Seats](../design/compositions/Seats.md), line 10.

```reaction
when Table.leave (player, table)
where
  DominoPlaying._activeAt (place: table) has (game)
then
  DominoPlaying.vacate (game, player)
```

### Tables.Close

Authored path: `Tables.Close`.
- Covered by [Tables](../design/compositions/Tables.md), line 67.
- Covered by [Tables](../design/compositions/Tables.md), line 74.

```reaction
when RequestBoundary.request (path: "/tables/close", requestId, table, token)
then
  Sessioning.resume (token)
```

### Tables.Close:host#2

Authored path: `Tables.Close`.
- Covered by [Tables](../design/compositions/Tables.md), line 67.
- Covered by [Tables](../design/compositions/Tables.md), line 74.

```reaction
when Sessioning.resume (token, player: me), asked by Tables.Close
where
  earlier, RequestBoundary.request (path: "/tables/close", requestId, table, token)
  Table._get (table) has (host: me)
then
  Table.close (table)
```

### Tables.Close:host#3

Authored path: `Tables.Close`.
- Covered by [Tables](../design/compositions/Tables.md), line 67.
- Covered by [Tables](../design/compositions/Tables.md), line 74.

```reaction
when Table.close (table, code), asked by Tables.Close:host#2
where
  earlier, RequestBoundary.request (path: "/tables/close", requestId, table, token)
then
  RequestBoundary.respond (requestId, table)
```

### Tables.Close:not-host#2

Authored path: `Tables.Close`.
- Covered by [Tables](../design/compositions/Tables.md), line 67.
- Covered by [Tables](../design/compositions/Tables.md), line 74.

```reaction
when Sessioning.resume (token, player: me), asked by Tables.Close
where
  earlier, RequestBoundary.request (path: "/tables/close", requestId, table, token)
  no Table._get (table) has (host: me)
then
  RequestBoundary.respond (error: "NOT_HOST", requestId)
```

### Tables.CloseEmptyTable

Authored path: `Tables.CloseEmptyTable`.
- Covered by [Tables](../design/compositions/Tables.md), line 66.

```reaction
when Table.leave (table)
where
  no Table._seats (table)
then
  Table.close (table)
```

### Tables.DropAbsentSitter:away

Authored path: `Tables.DropAbsentSitter`.
- Covered by [Tables](../design/compositions/Tables.md), line 53.
- Covered by [Tables](../design/compositions/Tables.md), line 60.

```reaction
when RequestBoundary.request (path: "/tables/drop-absent", player, requestId)
where
  Table._tableOf (player) has (table)
  no DominoPlaying._activeAt (place: table)
  Sessioning._idleFor (player) has (idleMs)
  idleMs is at least 120000
then
  Table.leave (player, table)
```

### Tables.DropAbsentSitter:away#2

Authored path: `Tables.DropAbsentSitter`.
- Covered by [Tables](../design/compositions/Tables.md), line 53.
- Covered by [Tables](../design/compositions/Tables.md), line 60.

```reaction
when Table.leave (player, table), asked by Tables.DropAbsentSitter:away
where
  earlier, RequestBoundary.request (path: "/tables/drop-absent", player, requestId)
then
  RequestBoundary.respond (requestId, table)
```

### Tables.DropAbsentSitter:no-session

Authored path: `Tables.DropAbsentSitter`.
- Covered by [Tables](../design/compositions/Tables.md), line 53.
- Covered by [Tables](../design/compositions/Tables.md), line 60.

```reaction
when RequestBoundary.request (path: "/tables/drop-absent", player, requestId)
where
  Table._tableOf (player) has (table)
  no DominoPlaying._activeAt (place: table)
  no Sessioning._idleFor (player)
then
  Table.leave (player, table)
```

### Tables.DropAbsentSitter:no-session#2

Authored path: `Tables.DropAbsentSitter`.
- Covered by [Tables](../design/compositions/Tables.md), line 53.
- Covered by [Tables](../design/compositions/Tables.md), line 60.

```reaction
when Table.leave (player, table), asked by Tables.DropAbsentSitter:no-session
where
  earlier, RequestBoundary.request (path: "/tables/drop-absent", player, requestId)
then
  RequestBoundary.respond (requestId, table)
```

### Tables.DropAbsentSitter:not-seated

Authored path: `Tables.DropAbsentSitter`.
- Covered by [Tables](../design/compositions/Tables.md), line 53.
- Covered by [Tables](../design/compositions/Tables.md), line 60.

```reaction
when RequestBoundary.request (path: "/tables/drop-absent", player, requestId)
where
  no Table._tableOf (player)
then
  RequestBoundary.respond (error: "NOT_SEATED", requestId)
```

### Tables.DropAbsentSitter:playing

Authored path: `Tables.DropAbsentSitter`.
- Covered by [Tables](../design/compositions/Tables.md), line 53.
- Covered by [Tables](../design/compositions/Tables.md), line 60.

```reaction
when RequestBoundary.request (path: "/tables/drop-absent", player, requestId)
where
  Table._tableOf (player) has (table)
  DominoPlaying._activeAt (place: table)
then
  RequestBoundary.respond (error: "GAME_IN_PROGRESS", requestId)
```

### Tables.DropAbsentSitter:present

Authored path: `Tables.DropAbsentSitter`.
- Covered by [Tables](../design/compositions/Tables.md), line 53.
- Covered by [Tables](../design/compositions/Tables.md), line 60.

```reaction
when RequestBoundary.request (path: "/tables/drop-absent", player, requestId)
where
  Table._tableOf (player) has (table)
  no DominoPlaying._activeAt (place: table)
  Sessioning._idleFor (player) has (idleMs)
  idleMs is less than 120000
then
  RequestBoundary.respond (error: "STILL_HERE", requestId)
```

### Tables.FreeTableCode

Authored path: `Tables.FreeTableCode`.
- Covered by [Tables](../design/compositions/Tables.md), line 69.

```reaction
when Table.close (code)
then
  CodeGenerating.remove (code, context: "TABLE_CODES")
```

### Tables.JoinByCode

Authored path: `Tables.JoinByCode`.
- Covered by [Tables](../design/compositions/Tables.md), line 19.
- Covered by [Tables](../design/compositions/Tables.md), line 27.

```reaction
when RequestBoundary.request (code, path: "/tables/join", requestId, token)
then
  Sessioning.resume (token)
```

### Tables.JoinByCode:code-found#2

Authored path: `Tables.JoinByCode`.
- Covered by [Tables](../design/compositions/Tables.md), line 19.
- Covered by [Tables](../design/compositions/Tables.md), line 27.

```reaction
when Sessioning.resume (token, player: me), asked by Tables.JoinByCode
where
  no Matchmaking._lobbyOf (player: me)
  earlier, RequestBoundary.request (code, path: "/tables/join", requestId, token)
  Table._getByCode (code) has (table)
  no Matchmaking._placeRules (place: table)
then
  Table.join (player: me, table)
```

### Tables.JoinByCode:code-found#3

Authored path: `Tables.JoinByCode`.
- Covered by [Tables](../design/compositions/Tables.md), line 19.
- Covered by [Tables](../design/compositions/Tables.md), line 27.

```reaction
when Table.join (player: me, table, position), asked by Tables.JoinByCode:code-found#2
where
  earlier, RequestBoundary.request (code, path: "/tables/join", requestId, token)
then
  RequestBoundary.respond (position, requestId, table)
```

### Tables.JoinByCode:code-unknown#2

Authored path: `Tables.JoinByCode`.
- Covered by [Tables](../design/compositions/Tables.md), line 19.
- Covered by [Tables](../design/compositions/Tables.md), line 27.

```reaction
when Sessioning.resume (token, player: me), asked by Tables.JoinByCode
where
  no Matchmaking._lobbyOf (player: me)
  earlier, RequestBoundary.request (code, path: "/tables/join", requestId, token)
  no Table._getByCode (code)
then
  RequestBoundary.respond (error: "NO_SUCH_TABLE", requestId)
```

### Tables.JoinByCode:public-table#2

Authored path: `Tables.JoinByCode`.
- Covered by [Tables](../design/compositions/Tables.md), line 19.
- Covered by [Tables](../design/compositions/Tables.md), line 27.

```reaction
when Sessioning.resume (token, player: me), asked by Tables.JoinByCode
where
  no Matchmaking._lobbyOf (player: me)
  earlier, RequestBoundary.request (code, path: "/tables/join", requestId, token)
  Table._getByCode (code) has (table)
  Matchmaking._placeRules (place: table)
then
  RequestBoundary.respond (error: "PUBLIC_TABLE", requestId)
```

### Tables.JoinByCode:queued#2

Authored path: `Tables.JoinByCode`.
- Covered by [Tables](../design/compositions/Tables.md), line 19.
- Covered by [Tables](../design/compositions/Tables.md), line 27.

```reaction
when Sessioning.resume (token, player: me), asked by Tables.JoinByCode
where
  Matchmaking._lobbyOf (player: me)
  earlier, RequestBoundary.request (code, path: "/tables/join", requestId, token)
then
  RequestBoundary.respond (error: "IN_QUEUE", requestId)
```

### Tables.Leave

Authored path: `Tables.Leave`.
- Covered by [Tables](../design/compositions/Tables.md), line 63.
- Covered by [Tables](../design/compositions/Tables.md), line 73.

```reaction
when RequestBoundary.request (path: "/tables/leave", requestId, table, token)
then
  Sessioning.resume (token)
```

### Tables.Leave#2

Authored path: `Tables.Leave`.
- Covered by [Tables](../design/compositions/Tables.md), line 63.
- Covered by [Tables](../design/compositions/Tables.md), line 73.

```reaction
when Sessioning.resume (token, player: me), asked by Tables.Leave
where
  earlier, RequestBoundary.request (path: "/tables/leave", requestId, table, token)
then
  Table.leave (player: me, table)
```

### Tables.Leave#3

Authored path: `Tables.Leave`.
- Covered by [Tables](../design/compositions/Tables.md), line 63.
- Covered by [Tables](../design/compositions/Tables.md), line 73.

```reaction
when Table.leave (player: me, table), asked by Tables.Leave#2
where
  earlier, RequestBoundary.request (path: "/tables/leave", requestId, table, token)
then
  RequestBoundary.respond (requestId, table)
```

### Tables.LeaveTableOnSessionEnd

Authored path: `Tables.LeaveTableOnSessionEnd`.
- Covered by [Tables](../design/compositions/Tables.md), line 64.

```reaction
when Sessioning.end (player)
where
  no Sessioning._idleFor (player)
  Table._tableOf (player) has (table)
then
  Table.leave (player, table)
```

### Tables.LeaveTableOnSessionExpire

Authored path: `Tables.LeaveTableOnSessionExpire`.
- Covered by [Tables](../design/compositions/Tables.md), line 65.

```reaction
when Sessioning.expire (player)
where
  no Sessioning._idleFor (player)
  Table._tableOf (player) has (table)
then
  Table.leave (player, table)
```

### Tables.Open

Authored path: `Tables.Open`.
- Covered by [Tables](../design/compositions/Tables.md), line 8.
- Covered by [Tables](../design/compositions/Tables.md), line 16.

```reaction
when RequestBoundary.request (path: "/tables/open", requestId, rules, token)
then
  Sessioning.resume (token)
```

### Tables.Open:not-queued#2

Authored path: `Tables.Open`.
- Covered by [Tables](../design/compositions/Tables.md), line 8.
- Covered by [Tables](../design/compositions/Tables.md), line 16.

```reaction
when Sessioning.resume (token, player: me), asked by Tables.Open
where
  no Matchmaking._lobbyOf (player: me)
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
  earlier, Sessioning.resume (token, player: me), asked by Tables.Open
  earlier, RequestBoundary.request (path: "/tables/open", requestId, rules, token)
then
  Table.open (code, host: me, rules)
```

### Tables.Open:not-queued#4

Authored path: `Tables.Open`.
- Covered by [Tables](../design/compositions/Tables.md), line 8.
- Covered by [Tables](../design/compositions/Tables.md), line 16.

```reaction
when Table.open (code, host: me, rules, table), asked by Tables.Open:not-queued#3
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
when Sessioning.resume (token, player: me), asked by Tables.Open
where
  Matchmaking._lobbyOf (player: me)
  earlier, RequestBoundary.request (path: "/tables/open", requestId, rules, token)
then
  RequestBoundary.respond (error: "IN_QUEUE", requestId)
```

### Tables.Open:unknown-rules#2

Authored path: `Tables.Open`.
- Covered by [Tables](../design/compositions/Tables.md), line 8.
- Covered by [Tables](../design/compositions/Tables.md), line 16.

```reaction
when Sessioning.resume (token, player: me), asked by Tables.Open
where
  no Matchmaking._lobbyOf (player: me)
  earlier, RequestBoundary.request (path: "/tables/open", requestId, rules, token)
  no DominoPlaying._ruleset (rules)
then
  RequestBoundary.respond (error: "UNKNOWN_RULES", requestId)
```

### Tables.ShowLobby

Authored path: `Tables.ShowLobby`.
- Covered by [Tables](../design/compositions/Tables.md), line 30.
- Covered by [Tables](../design/compositions/Tables.md), line 36.

```reaction
when RequestBoundary.request (path: "/tables/lobby", requestId, token)
then
  Sessioning.resume (token)
```

### Tables.ShowLobby#2

Authored path: `Tables.ShowLobby`.
- Covered by [Tables](../design/compositions/Tables.md), line 30.
- Covered by [Tables](../design/compositions/Tables.md), line 36.

```reaction
when Sessioning.resume (token, player: me), asked by Tables.ShowLobby
where
  earlier, RequestBoundary.request (path: "/tables/lobby", requestId, token)
then
  RequestBoundary.respond (lobby: former "the lobby of (me)" with (me), requestId)
```

### Tables.SwapSeats

Authored path: `Tables.SwapSeats`.
- Covered by [Tables](../design/compositions/Tables.md), line 41.
- Covered by [Tables](../design/compositions/Tables.md), line 48.

```reaction
when RequestBoundary.request (first, path: "/tables/swap", requestId, second, token)
then
  Sessioning.resume (token)
```

### Tables.SwapSeats:game-running#2

Authored path: `Tables.SwapSeats`.
- Covered by [Tables](../design/compositions/Tables.md), line 41.
- Covered by [Tables](../design/compositions/Tables.md), line 48.

```reaction
when Sessioning.resume (token, player: me), asked by Tables.SwapSeats
where
  Table._tableOf (player: me) has (table)
  Table._get (table) has (host: me)
  DominoPlaying._activeAt (place: table)
  earlier, RequestBoundary.request (first, path: "/tables/swap", requestId, second, token)
then
  RequestBoundary.respond (error: "GAME_IN_PROGRESS", requestId)
```

### Tables.SwapSeats:host-before-game#2

Authored path: `Tables.SwapSeats`.
- Covered by [Tables](../design/compositions/Tables.md), line 41.
- Covered by [Tables](../design/compositions/Tables.md), line 48.

```reaction
when Sessioning.resume (token, player: me), asked by Tables.SwapSeats
where
  Table._tableOf (player: me) has (table)
  Table._get (table) has (host: me)
  no DominoPlaying._activeAt (place: table)
  no Matchmaking._placeRules (place: table)
  earlier, RequestBoundary.request (first, path: "/tables/swap", requestId, second, token)
then
  Table.swap (first, second, table)
```

### Tables.SwapSeats:host-before-game#3

Authored path: `Tables.SwapSeats`.
- Covered by [Tables](../design/compositions/Tables.md), line 41.
- Covered by [Tables](../design/compositions/Tables.md), line 48.

```reaction
when Table.swap (first, second, table), asked by Tables.SwapSeats:host-before-game#2
where
  earlier, RequestBoundary.request (first, path: "/tables/swap", requestId, second, token)
then
  RequestBoundary.respond (requestId, table)
```

### Tables.SwapSeats:not-host#2

Authored path: `Tables.SwapSeats`.
- Covered by [Tables](../design/compositions/Tables.md), line 41.
- Covered by [Tables](../design/compositions/Tables.md), line 48.

```reaction
when Sessioning.resume (token, player: me), asked by Tables.SwapSeats
where
  Table._tableOf (player: me) has (table)
  no Table._get (table) has (host: me)
  earlier, RequestBoundary.request (first, path: "/tables/swap", requestId, second, token)
then
  RequestBoundary.respond (error: "NOT_HOST", requestId)
```

### Tables.SwapSeats:not-seated#2

Authored path: `Tables.SwapSeats`.
- Covered by [Tables](../design/compositions/Tables.md), line 41.
- Covered by [Tables](../design/compositions/Tables.md), line 48.

```reaction
when Sessioning.resume (token, player: me), asked by Tables.SwapSeats
where
  no Table._tableOf (player: me)
  earlier, RequestBoundary.request (first, path: "/tables/swap", requestId, second, token)
then
  RequestBoundary.respond (error: "NOT_SEATED", requestId)
```

### Tables.SwapSeats:public-table#2

Authored path: `Tables.SwapSeats`.
- Covered by [Tables](../design/compositions/Tables.md), line 41.
- Covered by [Tables](../design/compositions/Tables.md), line 48.

```reaction
when Sessioning.resume (token, player: me), asked by Tables.SwapSeats
where
  Table._tableOf (player: me) has (table)
  Table._get (table) has (host: me)
  no DominoPlaying._activeAt (place: table)
  Matchmaking._placeRules (place: table)
  earlier, RequestBoundary.request (first, path: "/tables/swap", requestId, second, token)
then
  RequestBoundary.respond (error: "PUBLIC_TABLE", requestId)
```

## Endpoint input contracts

Before recording an action ask, the boundary rejects a body that is not an
object or lacks a required key. The response uses `INVALID_INPUT` and names
the path or missing key. A declared default fills an absent key. Endpoints
not listed here have no explicit input contract.

- `/games/bot-move` — requires `game`
- `/games/drop-absent` — requires `game`, `player`
- `/games/play` — requires `token`, `game`, `tile`, `side`
- `/games/seat-bot` — requires `game`, `position`
- `/games/start` — requires `token`
- `/games/view` — requires `token`
- `/guests/start` — requires `displayName`
- `/matchmaking/drop-absent` — requires `player`
- `/matchmaking/enqueue` — requires `token`, `rules`, `midway`
- `/matchmaking/launch` — requires `lobby`
- `/matchmaking/leave` — requires `token`
- `/matchmaking/view` — requires `token`
- `/sessions/end` — requires `token`
- `/sessions/expire` — requires `session`
- `/sessions/me` — requires `token`
- `/tables/close` — requires `token`, `table`
- `/tables/drop-absent` — requires `player`
- `/tables/join` — requires `token`, `code`
- `/tables/leave` — requires `token`, `table`
- `/tables/lobby` — requires `token`
- `/tables/open` — requires `token`, `rules`
- `/tables/swap` — requires `token`, `first`, `second`
