# DominoPlaying

## Purpose

Let four players, in two teams of partners, play a game of Puerto Rican dominoes to a
target score, under a rule set they agreed on.

## Principle

Four players start a game under the DEFAULT rules, which play to 200 points, sitting
in turn order; the first and third
are partners against the second and fourth. Each gets seven tiles of the double-six
set, and whoever holds the double six plays it at once. Turns then pass in order:
each player must play a tile that matches one end of the line, and a player with
no such tile is skipped. When Abuelo plays his last tile, his team scores the pips
left in the other three hands and a new match is dealt, which Abuelo starts with any
tile. If the line is blocked so nobody can play (a tranque), the team holding fewer
pips scores all the pips in the four hands. The first team to reach 200 wins the
game. Under the LONG rules the same four would play to 500, the winners of the first
four matches would earn prizes on top of their points, a match won with a Capicú or
a Chuchazo would earn 100 more, and a tranque would go to the team of the single
player holding the fewest pips.

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

Special is CAPICU or CHUCHAZO or NONE
  A celebrated way to win a match by domino. CAPICU: the last tile, not a double,
  could have been played on either end of the board. CHUCHAZO: the last tile is the
  double blank (0-0). NONE: any other ending.

RuleSet is DEFAULT or LONG or SHORT
  The rules a game is played by. DEFAULT plays to 200 and settles a tranque by team:
  the team whose two hands hold fewer pips wins it. SHORT is DEFAULT played to 100.
  LONG plays to 500, settles a tranque by player: the team of the player whose own
  hand holds the fewest pips wins it, and gives the winning team a prize on top of
  its points for each of the first four matches: 100, 75, 50 and 25, and a bonus
  of 100 for a match won with a Capicú or a Chuchazo. Every rule set records a
  Capicú or Chuchazo; only LONG pays for it.
```

## State

```state
a set of Games with
  a place Place
  a players seq of Player
  a rules RuleSet
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
Rule: target is the target of the game's rules

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
  a prize Number
  a special Special
  a bonus Number
  an ending Ending
Rule: points include the prize and the bonus
```

## Actions

```actions
start(place: Place, first: Player, second: Player, third: Player, fourth: Player, rules: RuleSet) : returns (game: Game)
  where rules is not a known rule set
  then
    refuses UNKNOWN_RULES "Those are not rules this game knows."
  where the four players are not all different
  then
    refuses DUPLICATE_PLAYER "A game needs four different players."
  where place already has an ACTIVE game
  then
    refuses GAME_IN_PROGRESS "A game is already being played there."
  where the four players are different and place has no ACTIVE game
  then
    add a new ACTIVE game at place with the players in that order, the given rules, the target of those rules, and both team scores at 0
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
    otherwise, if no player can play, the match ends in a TRANQUE and its winning team scores the pips in all four hands; by team rules, the team whose two hands hold fewer pips wins, and its player earliest in the match's turn order starts the next match; by player rules, the player holding the fewest pips wins for their team and starts the next match (when several hold that fewest, they win only if they are all partners, and the earliest of them in turn order starts); on a tie nobody scores and the same player starts again
    otherwise, pass the turn to the next player who can play, skipping those who cannot
    when a match is won, the winning team also gets the rules' prize for that match, if any; a tie wins no prize
    when a match ends in a DOMINO whose last tile is 0-0, it is a CHUCHAZO; when that last tile is not a double and either of its numbers matched each end of the board before it was played, it is a CAPICU; the winning team also gets the rules' bonus for it
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

_summary(game: Game) : optional (rules: RuleSet, status: Status, target: Number, matchNumber: Number, scoreA: Number, scoreB: Number, turnPlayer: Player)
  Answers the game's rules, status, target, current match, the scores of team 0
  (scoreA) and team 1 (scoreB), and whose turn it is; no row when the game does not
  exist.

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

_lastResult(game: Game) : optional (matchNumber: Number, winner: Player, team: Number, points: Number, prize: Number, special: Special, bonus: Number, ending: Ending)
  Answers how the most recent finished match ended, and no row before any match has
  ended. Points include the prize and the bonus. On a tied tranque, team is -1 and
  points, prize and bonus are 0, and special is NONE.

_ruleset(rules: RuleSet) : optional (target: Number, description: String)
  Answers the target of a rule set and a sentence describing it, and no row when the
  rule set is not known.

_rulesets() : many (rules: RuleSet, target: Number, description: String)
  Answers every rule set games can be played by, with its target and description, in
  a fixed order with DEFAULT first.
```
