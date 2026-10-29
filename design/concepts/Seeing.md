# Seeing

## Purpose

Point out only what is new to someone, by remembering when they last looked at each
part of what they have.

## Principle

Titi opens her friend requests, and the app records that she has seen them as of
now. A request that arrives later is newer than that, so it is pointed out to her as
new; the ones she already looked at are not. When she opens her requests again,
nothing there is new any more. What she has seen of her game invites is kept apart,
so looking at her requests does not mark her invites as seen.

## Types

```types
external User
  Who looks.
```

## State

```state
a set of Looks with
  a user User
  a part String
  a seenAt DateTime
  unique user and part
```

## Actions

```actions
see(user: User, part: String) : returns (user: User, part: String)
  where always
  then
    set when user last saw part to now, adding a look if there was none
    returns user, part

forget(user: User) : returns (user: User)
  where always
  then
    remove every look of user
    returns user
```

## Queries

```queries
_seenAt(user: User, part: String) : one (seenAt: Number)
  Answers when the user last saw that part (milliseconds since 1970), and 0 when they
  never have.
```
