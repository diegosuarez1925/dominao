# DominoPlaying

## Purpose

Let four players, in two teams of partners, play a game of Puerto Rican dominoes to a
target score.

## Principle

Four players start a game to 200 points, sitting in turn order; the first and third
are partners against the second and fourth. Each gets seven tiles of the double-six
set, and whoever holds the double six plays it at once. Turns then pass in order:
each player must play a tile that matches one end of the line, and a player with
no such tile is skipped. When Abuelo plays his last tile, his team scores the pips
left in the other three hands and a new match is dealt, which Abuelo starts with any
tile. If the line is blocked so nobody can play (a tranque), the team holding fewer
pips scores all the pips in the four hands. The first team to reach 200 wins the
game.

## Types

```types
external Player
  A person playing in the game.

external Place
  Where the game is played, such as a table. A place has at most one active game.

opaque Tile
  One domino of the double-six set, written as its two numbers, smaller first, such
  as 3-5.

Side is LEFT or RIGHT
  The end of the line a tile is played on.

Status is ACTIVE or FINISHED or ABANDONED
  Whether a game is being played, was won, or was stopped before anyone won.

Ending is DOMINO or TRANQUE
  How a match ended: a player ran out of tiles, or nobody could play.

Move is PLAYED or SKIPPED
  What happened on a player's turn: they played a tile, or they could not play.
```

## State

```state
a set of Games with
  a place Place
  a players seq of Player
  a status Status
  a target Number
  a teamScores seq of Number
  a matchNumber Number
  a starter Number
  a turn Number
  a board seq of Tile
  a leftCount Number
Rule: players are in turn order, and players 0 and 2 form team 0 while players 1 and 3 form team 1
Rule: the board lists the played tiles from its left end to its right end, each turned so touching numbers match
Rule: leftCount is how many tiles of the match were played to the left of its first tile

a set of Hands with
  a game Game
  a position Number
  a tiles seq of Tile

a seq of Turns with
  a game Game
  a matchNumber Number
  a player Player
  a move Move
  an optional tile Tile

a set of Results with
  a game Game
  a matchNumber Number
  a winner Player
  a team Number
  a points Number
  an ending Ending
```

## Actions

```actions
start(place: Place, first: Player, second: Player, third: Player, fourth: Player) : returns (game: Game)
  where the four players are not all different
  then
    refuses DUPLICATE_PLAYER "A game needs four different players."
  where place already has an ACTIVE game
  then
    refuses GAME_IN_PROGRESS "A game is already being played there."
  where the four players are different and place has no ACTIVE game
  then
    add a new ACTIVE game at place with the players in that order, a target of 200, and both team scores at 0
    deal match 1: shuffle the 28 tiles and give each player 7
    the player holding the double six plays it as the first tile on the board, recorded as PLAYED
    pass the turn to the next player who can play, skipping those who cannot
    returns game

play(game: Game, player: Player, tile: Tile, side: Side) : returns (game: Game)
  where game is not in Games
  then
    refuses NO_SUCH_GAME "There is no such game."
  where game is not ACTIVE
  then
    refuses GAME_NOT_ACTIVE "That game is over."
  where it is not player's turn
  then
    refuses NOT_YOUR_TURN "It is not your turn."
  where tile is not in player's hand
  then
    refuses NOT_IN_HAND "That tile is not in your hand."
  where the board is not empty and neither number of tile matches the board's end on side
  then
    refuses ILLEGAL_PLAY "That tile does not match that end of the board."
  where it is player's turn, tile is in their hand, and it fits the end on side or the board is empty
  then
    move tile from player's hand to that end of the board; its other number becomes the new end
    record that player PLAYED tile, and record SKIPPED for each player passed over below
    if player's hand is now empty, the match ends in a DOMINO: player's team scores the pips in the other three hands, and player starts the next match
    otherwise, if no player can play, the match ends in a TRANQUE: the team whose two hands hold fewer pips scores the pips in all four hands, and its player earliest in the match's turn order starts the next match; on a tie nobody scores and the same player starts again
    otherwise, pass the turn to the next player who can play, skipping those who cannot
    when a match ends, record its result; if the scoring team reached the target the game becomes FINISHED, and otherwise a new match is dealt and its starter plays first with any tile
    returns game

abandon(game: Game) : returns (game: Game)
  where game is not in Games
  then
    refuses NO_SUCH_GAME "There is no such game."
  where game is not ACTIVE
  then
    refuses GAME_NOT_ACTIVE "That game is over."
  where game is ACTIVE
  then
    set game's status to ABANDONED
    returns game
```

## Queries

```queries
_activeAt(place: Place) : optional (game: Game)
  Answers the place's ACTIVE game, and no row when nobody is playing there.

_latestAt(place: Place) : optional (game: Game)
  Answers the most recently started game at the place, whatever its status, and no
  row when no game was ever played there.

_summary(game: Game) : optional (status: Status, target: Number, matchNumber: Number, scoreA: Number, scoreB: Number, turnPlayer: Player)
  Answers the game's status, target, current match, the scores of team 0 (scoreA)
  and team 1 (scoreB), and whose turn it is; no row when the game does not exist.

_players(game: Game) : many (position: Number, player: Player, tileCount: Number)
  Answers each player in turn order with how many tiles they hold, and no rows when
  the game does not exist.

_hand(game: Game, player: Player) : many (tile: Tile)
  Answers the tiles in the player's hand, ordered by their numbers, and no rows when
  the player is not in the game.

_board(game: Game) : many (tile: Tile, left: Number, right: Number, fromFirst: Number)
  Answers the board's tiles from its left end to its right end, each with the number
  facing left, the number facing right, and its place counted from the match's first
  tile (0), negative to the left and positive to the right; no rows when the board is
  empty.

_log(game: Game) : many (turn: Number, matchNumber: Number, player: Player, move: Move, tile: String)
  Answers every turn of the game in the order they happened, numbered from 1 across
  the whole game: who played which tile, or who was skipped (with an empty tile); no
  rows when the game does not exist. The number keeps two skips by the same player in
  the same match apart.

_lastResult(game: Game) : optional (matchNumber: Number, winner: Player, team: Number, points: Number, ending: Ending)
  Answers how the most recent finished match ended, and no row before any match has
  ended. On a tied tranque, team is -1 and points is 0.
```
