# Table

## Purpose

Let a specific group of people sit down together at a table they can find by its
code, to play by the rules its host chose.

## Principle

Abuelo opens a table with the code "K7QF2M" and the rules he wants to play by, and
sits in seat 0 as its host. His three
brothers join the table they found by that code and fill seats 1, 2 and 3; a fifth
person who tries to join is refused because the table is full. Abuelo wants the
brother in seat 1 as his partner, so he swaps seats 1 and 2, putting that brother
across from him. When Abuelo leaves,
the brother in the lowest seat becomes host. Once everyone has left, the table can
be closed, which deletes it and hands back its code.

## Types

```types
external Player
  The person who sits at a table.

external Rules
  The rules the people at a table will play by. Table keeps them for the table but
  never interprets them.
```

## State

```state
a set of Tables with
  a host Player
  a unique code String
  a rules Rules

a set of Seats with
  a table Table
  a position Number
  a unique player Player
  unique table and position
Rule: a table has at most four seats, at positions 0 to 3
Rule: a table's host is seated at that table
```

## Actions

```actions
open(host: Player, code: String, rules: Rules) : returns (table: Table)
  where host is seated at some table
  then
    refuses ALREADY_SEATED "That player is already sitting at a table."
  where host is not seated, and another table already has this code
  then
    refuses CODE_IN_USE "Another table already has that code."
  where host is not seated, and no table has this code
  then
    add a new table with host, code and rules
    seat host at position 0 of the table
    returns table

join(table: Table, player: Player) : returns (position: Number)
  where table is not in Tables
  then
    refuses NO_SUCH_TABLE "There is no such table."
  where player is seated at some table
  then
    refuses ALREADY_SEATED "That player is already sitting at a table."
  where all four positions at table are taken
  then
    refuses TABLE_FULL "That table is full."
  where table has a free position and player is not seated
  then
    seat player at the lowest free position of table
    returns position

leave(table: Table, player: Player) : returns (table: Table)
  where player is not seated at table
  then
    refuses NOT_SEATED "That player is not sitting at that table."
  where player is seated at table
  then
    remove player's seat
    if player was the host and others remain, make the remaining player with the lowest position the host
    returns table

swap(table: Table, first: Number, second: Number) : returns (table: Table)
  where table is not in Tables
  then
    refuses NO_SUCH_TABLE "There is no such table."
  where first and second are the same position
  then
    refuses SAME_SEAT "Pick two different seats."
  where table is in Tables and first and second differ
  then
    the player seated at first, if any, moves to second
    the player seated at second, if any, moves to first
    returns table

close(table: Table) : returns (code: String)
  where table is not in Tables
  then
    refuses NO_SUCH_TABLE "There is no such table."
  where table is in Tables
  then
    remove every seat at table
    remove table
    returns code
```

## Queries

```queries
_tables() : many (table: Table)
  Answers every table there is.

_getByCode(code: String) : optional (table: Table)
  Answers the table with this code, and no row when no table has it.

_get(table: Table) : optional (host: Player, code: String, rules: Rules)
  Answers the table's host, code and rules, and no row when the table does not
  exist.

_seats(table: Table) : many (position: Number, player: Player)
  Answers every seat at the table in order of position, and no rows when nobody sits
  there or the table does not exist.

_isFull(table: Table) : one (full: Flag)
  Answers true when all four positions at the table are taken, and false otherwise,
  including when the table does not exist.

_tableOf(player: Player) : optional (table: Table)
  Answers the table where the player sits, and no row when they sit nowhere.
```
