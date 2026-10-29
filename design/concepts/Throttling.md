# Throttling

## Purpose

Make guessing too slow to be worth it, by refusing more attempts at something after
several failures in a row.

## Principle

Someone tries five wrong passwords for Abuelo's account within fifteen minutes. From
then on, attempts for that account are refused for fifteen minutes, even with the
right password. Once that time has passed, attempts are allowed again. When Abuelo
gets in, his count of failures starts over.

## Types

```types
external Key
  What attempts are counted for.
```

## State

```state
a set of Keys with
  a failures Number
  a firstFailureAt DateTime
  an optional lockedUntil DateTime
Rule: 5 failures within 15 minutes of the first lock the key for 15 minutes
```

## Actions

```actions
fail(key: Key) : returns (key: Key, locked: Flag)
  where key is locked
  then
    add one to its failures; locked is true
    returns key, locked
  where key is not locked, and has no failures, its first failure was more than 15 minutes ago, or its lock has run out
  then
    start counting again: failures is 1, firstFailureAt is now, and no lockedUntil; locked is false
    returns key, locked
  where key is not locked, and its first failure was within 15 minutes
  then
    add one to its failures, and when that makes 5, set lockedUntil to 15 minutes from now; locked is whether it is now locked
    returns key, locked

reset(key: Key) : returns (key: Key)
  where key has failures or a lock
  then
    forget its failures and lock
    returns key
  where key has neither
  then
    returns key
```

## Queries

```queries
_locked(key: Key) : one (locked: Flag, secondsLeft: Number)
  Answers whether attempts for the key are refused right now, and for how many more
  seconds (0 when they are not).
```
