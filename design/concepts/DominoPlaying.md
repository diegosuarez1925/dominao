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

If Cheo gets up in the middle of a game, his seat is left empty with his tiles in it
and the game pauses: nobody can play until someone sits in that seat. Tío takes it
over, holding Cheo's tiles, and play goes on from exactly where it stopped. Someone
who is not there to choose, such as a bot in that seat, can have the game play for
them: it picks one of their legal moves.

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

Status is ACTIVE or PAUSED or FINISHED or ABANDONED
  Whether a game is being played, is waiting for someone to take an empty seat, was
  won, or was stopped before anyone won.

Ending is DOMINO or TRANQUE
  How a match ended: a player ran out of tiles, or nobody could play.

Move is PLAYED or SKIPPED or LEFT or SAT
  What happened: a player played a tile, or could not play on their turn, or got
  up from their seat, or sat down in an empty seat.

Special is CAPICU or CHUCHAZO or NONE
  A celebrated way to win a match by domino. CAPICU: the last tile, not a double,
  shows the board's two ends, one number each (3-5 on ends 3 and 5, not on 3 and 3),
  so it could have been played on either end. CHUCHAZO: the last tile is the
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
  a changedAt DateTime
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

a set of Vacancies with
  a game Game
  a position Number
  a player Player
  a since DateTime
Rule: a vacancy's position is a seat nobody holds; its player is who left it
Rule: a game is PAUSED exactly when it has a vacancy and is not over

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
  where place already has an ACTIVE or PAUSED game
  then
    refuses GAME_IN_PROGRESS "A game is already being played there."
  where the four players are different and place has no ACTIVE or PAUSED game
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
  where game is FINISHED or ABANDONED
  then
    refuses GAME_NOT_ACTIVE "That game is over."
  where game is PAUSED
  then
    refuses GAME_PAUSED "The game is paused until every seat is taken."
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
    when a match ends in a DOMINO whose last tile is 0-0, it is a CHUCHAZO; when that last tile is not a double and its two numbers are the board's two ends before it was played, one each, it is a CAPICU; the winning team also gets the rules' bonus for it
    when a match ends, record its result; if the scoring team reached the target the game becomes FINISHED, and otherwise a new match is dealt and its starter plays first with any tile
    set changedAt to now
    returns game

autoplay(game: Game, player: Player) : returns (game: Game)
  where game is not in Games
  then
    refuses NO_SUCH_GAME "There is no such game."
  where game is FINISHED or ABANDONED
  then
    refuses GAME_NOT_ACTIVE "That game is over."
  where game is PAUSED
  then
    refuses GAME_PAUSED "The game is paused until every seat is taken."
  where it is not player's turn
  then
    refuses NOT_YOUR_TURN "It is not your turn."
  where game is ACTIVE and it is player's turn
  then
    pick one of the moves player could make (each tile in their hand on each end it fits, or any tile on an empty board), the way the game's move chooser decides
    play that tile on that side exactly as play does
    returns game

vacate(game: Game, player: Player) : returns (game: Game, place: Place, position: Number)
  where game is not in Games
  then
    refuses NO_SUCH_GAME "There is no such game."
  where game is FINISHED or ABANDONED
  then
    refuses GAME_NOT_ACTIVE "That game is over."
  where player does not hold a seat in game
  then
    refuses NOT_IN_GAME "That player is not playing in that game."
  where game is ACTIVE or PAUSED and player holds a seat in it
  then
    leave player's seat empty, keeping its hand, and add a vacancy for that position left by player since now
    record that player LEFT
    set game's status to PAUSED, and changedAt to now
    returns game, place, position

seat(game: Game, position: Number, player: Player) : returns (game: Game)
  where game is not in Games
  then
    refuses NO_SUCH_GAME "There is no such game."
  where game is FINISHED or ABANDONED
  then
    refuses GAME_NOT_ACTIVE "That game is over."
  where player already holds a seat in game
  then
    refuses ALREADY_PLAYING "That player is already playing in that game."
  where position is not a vacancy of game
  then
    refuses SEAT_TAKEN "That seat is not empty."
  where position is a vacancy of game and player holds no seat in it
  then
    give player the seat at position, with the hand left there, and remove the vacancy
    record that player SAT
    if game has no vacancies left, set its status to ACTIVE; set changedAt to now
    returns game

abandon(game: Game) : returns (game: Game)
  where game is not in Games
  then
    refuses NO_SUCH_GAME "There is no such game."
  where game is FINISHED or ABANDONED
  then
    refuses GAME_NOT_ACTIVE "That game is over."
  where game is ACTIVE or PAUSED
  then
    set game's status to ABANDONED
    returns game
```

## Queries

```queries
_activeAt(place: Place) : optional (game: Game)
  Answers the place's game that is not over (ACTIVE or PAUSED), and no row when
  nobody is playing there.

_gameOf(player: Player) : optional (game: Game)
  Answers the game, ACTIVE or PAUSED, in which the player holds a seat, and no row
  when they hold none.

_running() : many (game: Game)
  Answers every game that is ACTIVE or PAUSED.

_turn(game: Game) : optional (player: Player, waitingMs: Number)
  Answers whose turn it is in an ACTIVE game and how many milliseconds have passed
  since the game last changed; no row when the game is not ACTIVE.

_vacancies(game: Game) : many (position: Number, player: Player, vacantMs: Number)
  Answers each empty seat of an ACTIVE or PAUSED game, by position, with who left it
  and how many milliseconds ago; no rows otherwise.

_latestAt(place: Place) : optional (game: Game)
  Answers the most recently started game at the place, whatever its status, and no
  row when no game was ever played there.

_summary(game: Game) : optional (rules: RuleSet, status: Status, target: Number, matchNumber: Number, scoreA: Number, scoreB: Number, turnPlayer: Player)
  Answers the game's rules, status, target, current match, the scores of team 0
  (scoreA) and team 1 (scoreB), and whose turn it is; no row when the game does not
  exist.

_players(game: Game) : many (position: Number, player: Player, tileCount: Number)
  Answers each seat in turn order with who holds it (empty when it is a vacancy)
  and how many tiles are in it, and no rows when the game does not exist.

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
  the whole game: who played which tile, or who was skipped, left or sat down (with
  an empty tile); no rows when the game does not exist. The number keeps two skips by the same player in
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
