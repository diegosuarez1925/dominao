# Tallying

## Purpose

Keep each player's record of wins and losses under each set of rules, so they can see
how they do.

## Principle

Abuelo's team wins a match by Default rules with 63 points, so Abuelo's Default record
shows one match won, his best match being 63 points. His team then loses a match,
which shows as one lost. When his team wins the whole game, that is one game won. Each
match and each game is counted once for him, however many times it is reported, and
his records under other rules stay apart.

## Types

```types
external Player
  Whose record it is.

external Rules
  The set of rules a record is kept under.

external Game
  A game whose matches and result are counted.
```

## State

```state
a set of Records with
  a player Player
  a rules Rules
  a matchesWon Number
  a matchesLost Number
  a gamesWon Number
  a gamesLost Number
  a bestMatchPoints Number
  unique player and rules

a set of CountedMatches with
  a player Player
  a game Game
  a match Number
  unique player and game and match

a set of CountedGames with
  a player Player
  a game Game
  unique player and game
```

## Actions

```actions
recordMatch(player: Player, rules: Rules, game: Game, match: Number, won: Flag, points: Number) : returns (player: Player)
  where that match of that game was already counted for player
  then
    refuses ALREADY_COUNTED "That was already counted."
  where it was not
  then
    remember it as counted for player
    add one to player's matchesWon under rules if won, or to matchesLost if not, adding a record of zeros first if there was none
    if won and points is more than bestMatchPoints, set bestMatchPoints to points
    returns player

recordGame(player: Player, rules: Rules, game: Game, won: Flag) : returns (player: Player)
  where that game was already counted for player
  then
    refuses ALREADY_COUNTED "That was already counted."
  where it was not
  then
    remember it as counted for player
    add one to player's gamesWon under rules if won, or to gamesLost if not, adding a record of zeros first if there was none
    returns player

forget(player: Player) : returns (player: Player)
  where always
  then
    remove every record of player, and what was counted for them
    returns player
```

## Queries

```queries
_records(player: Player) : many (rules: Rules, matchesWon: Number, matchesLost: Number, matchesPlayed: Number, matchWinrate: Number, gamesWon: Number, gamesLost: Number, gamesPlayed: Number, gameWinrate: Number, bestMatchPoints: Number)
  Answers the player's record under each set of rules they have played by, ordered by
  rules: wins, losses, how many were played (wins plus losses), and the share won as
  a whole percentage (rounded, 0 when none were played).

_overall(player: Player) : one (matchesWon: Number, matchesLost: Number, matchesPlayed: Number, matchWinrate: Number, gamesWon: Number, gamesLost: Number, gamesPlayed: Number, gameWinrate: Number)
  Answers the player's records under all rules added together, with winrates as
  above; all zeros for a player with no record.

_matchCounted(player: Player, game: Game, match: Number) : one (counted: Flag)
  Answers whether that match of that game was counted for the player.

_gameCounted(player: Player, game: Game) : one (counted: Flag)
  Answers whether that game was counted for the player.
```
