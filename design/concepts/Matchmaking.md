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
players are handed out in a random order, which is the order they will sit in,
together with the rules they asked for.

Cheo, who does not mind joining a game that has already begun, asks for a game
under the standard rules and says so. The app has told Matchmaking that the game
of an earlier launched lobby, with the same rules, is being played at a certain
place, which Matchmaking now knows as one of its places. While Cheo waits, anyone
can ask which of its places play by his rules, and who has waited longest among
the players happy to join midway, so that he can be sent to an empty seat there.
Once that game's place closes, the app tells Matchmaking to forget it.

## Types

```types
external Player
  A person looking for a game.

external Rules
  The rules a player wants to play by. Only players asking for the same rules are
  put in the same lobby.

external Place
  Where the game of a launched lobby is played, which a player waiting for the same
  rules may still be sent to.
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
  a midway Flag
Rule: a lobby has at most four entries

a set of Places with
  a unique place Place
  a rules Rules
```

## Actions

```actions
enqueue(player: Player, rules: Rules, midway: Flag) : returns (lobby: Lobby)
  where player has an entry
  then
    refuses ALREADY_QUEUED "That player is already waiting for a game."
  where player has no entry
  then
    choose the earliest opened lobby with these rules and fewer than four entries, or add a new lobby with these rules opened now if there is none
    add an entry for player in that lobby, joined now, noting midway (whether they would also join a game already being played)
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

launch(lobby: Lobby) : returns (first: Player, second: Player, third: Player, fourth: Player, rules: Rules)
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
    returns first, second, third, fourth, rules

adopt(place: Place, rules: Rules) : returns (place: Place)
  where place is one of the Places
  then
    refuses PLACE_KNOWN "That place already has strangers playing at it."
  where place is not one of the Places
  then
    add place to the Places with rules
    returns place

release(place: Place) : returns (place: Place)
  where place is not one of the Places
  then
    refuses NO_SUCH_PLACE "There is no such place."
  where place is one of the Places
  then
    remove place from the Places
    returns place
```

## Queries

```queries
_lobbyOf(player: Player) : optional (lobby: Lobby)
  Answers the lobby the player waits in, and no row when they are not waiting.

_status(lobby: Lobby) : optional (rules: Rules, full: Flag, secondsLeft: Number)
  Answers the lobby's rules, whether it is full, and how many whole seconds remain
  in its countdown (0 when it is not full or the countdown has run out); no row when
  the lobby does not exist.

_lobbies() : many (lobby: Lobby)
  Answers every lobby there is, the oldest first.

_ready() : many (lobby: Lobby)
  Answers every full lobby whose countdown has run out, so it can be launched, the
  one that filled first first; no rows when there is none.

_entries(lobby: Lobby) : many (player: Player, midway: Flag)
  Answers the players waiting in the lobby in the order they joined, with whether
  each would join a game midway, and no rows when the lobby does not exist.

_placeRules(place: Place) : optional (rules: Rules)
  Answers the rules of one of the Places, and no row for any other place.

_places(rules: Rules) : many (place: Place)
  Answers every one of the Places with these rules.

_midwayWaiting(rules: Rules) : optional (player: Player)
  Answers, among players waiting under these rules who would join a game midway, the
  one who has waited longest; no row when there is none.
```
