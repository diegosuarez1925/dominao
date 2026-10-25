# Matchmaking

## Purpose

Get a player into a game with strangers quickly, when no group of friends is
available.

## Principle

Abuelo asks for a game under the standard rules. Nobody else is waiting for those
rules, so a new lobby is opened and he waits in it. Three strangers who ask for the
same rules join his lobby one by one, in the order they asked; when the fourth
arrives the lobby is full and a short countdown begins. If one of them leaves before
it ends, the countdown stops and the lobby waits for someone else. Once a full
lobby's countdown has run out, it is launched: the lobby is removed and its four
players are handed out in a random order, which is the order they will sit in.

## Types

```types
external Player
  A person looking for a game.

external Rules
  The rules a player wants to play by. Only players asking for the same rules are
  put in the same lobby.
```

## State

```state
a set of Lobbies with
  a rules Rules
  an openedAt DateTime
  an optional fullAt DateTime
Rule: a lobby has fullAt exactly when it has four entries
Rule: a lobby with no entries does not exist

a set of Entries with
  a lobby Lobby
  a unique player Player
  a joinedAt DateTime
Rule: a lobby has at most four entries
```

## Actions

```actions
enqueue(player: Player, rules: Rules) : returns (lobby: Lobby)
  where player has an entry
  then
    refuses ALREADY_QUEUED "That player is already waiting for a game."
  where player has no entry
  then
    choose the earliest opened lobby with these rules and fewer than four entries, or add a new lobby with these rules opened now if there is none
    add an entry for player in that lobby, joined now
    if the lobby now has four entries, set its fullAt to now, which starts the countdown
    returns lobby

cancel(player: Player) : returns (lobby: Lobby)
  where player has no entry
  then
    refuses NOT_QUEUED "That player is not waiting for a game."
  where player has an entry
  then
    remove player's entry
    clear the lobby's fullAt, which stops any countdown
    if the lobby has no entries left, remove it
    returns lobby

launch(lobby: Lobby) : returns (first: Player, second: Player, third: Player, fourth: Player)
  where lobby is not in Lobbies
  then
    refuses NO_SUCH_LOBBY "There is no such lobby."
  where lobby has fewer than four entries
  then
    refuses LOBBY_NOT_FULL "That lobby is still waiting for players."
  where lobby is full and its countdown has not run out (fullAt plus the countdown is later than now)
  then
    refuses COUNTDOWN_RUNNING "The countdown for that lobby has not finished."
  where lobby is full and its countdown has run out
  then
    put the lobby's four players in a random order, which is the order they will sit in
    remove lobby and its entries
    returns first, second, third, fourth
```

## Queries

```queries
_lobbyOf(player: Player) : optional (lobby: Lobby)
  Answers the lobby the player waits in, and no row when they are not waiting.

_status(lobby: Lobby) : optional (rules: Rules, full: Flag, secondsLeft: Number)
  Answers the lobby's rules, whether it is full, and how many whole seconds remain
  in its countdown (0 when it is not full or the countdown has run out); no row when
  the lobby does not exist.

_entries(lobby: Lobby) : many (player: Player)
  Answers the players waiting in the lobby in the order they joined, and no rows
  when the lobby does not exist.
```
