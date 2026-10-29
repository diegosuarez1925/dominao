# Guesting

## Purpose

Let someone play under a recognizable name without creating an account.

## Principle

Abuelo does not want an account, so he plays as the guest "Abuelo": the app keeps
that name for him, and everyone at his table sees it. When he is done the guest is
forgotten, and the name is no longer tied to him; another guest may use it.

## Types

```types
```

## State

```state
a set of Guests with
  a displayName String
Rule: a displayName is 1 to 20 characters long after trimming spaces
```

## Actions

```actions
create(displayName: String) : returns (guest: Guest)
  where displayName is empty or longer than 20 characters after trimming
  then
    refuses INVALID_NAME "A display name must be 1 to 20 characters long."
  where displayName is 1 to 20 characters long after trimming
  then
    add a new guest with the trimmed displayName
    returns guest

forget(guest: Guest) : returns (guest: Guest)
  where guest does not exist
  then
    refuses NO_SUCH_GUEST "There is no such guest."
  where guest exists
  then
    delete guest
    returns guest
```

## Queries

```queries
_name(guest: Guest) : optional (displayName: String)
  Answers the guest's display name, and no row when there is no such guest (so
  asking about anyone who is not a guest answers nothing).
```
