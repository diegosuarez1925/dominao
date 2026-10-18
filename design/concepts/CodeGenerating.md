# CodeGenerating

## Purpose

Provide unique codes, short or long, that can be used as identifiers within a
particular context.

## Principle

The app asks for a code of size 6 in the context of table codes and gets "K7QF2M".
No later request in that context returns "K7QF2M" while it is in use, so
`_isAvailable` answers false for it, although the same string could still be handed
out in another context. Once the app removes "K7QF2M", it is available again.

## Types

```types
external Context
  The setting in which a code must be unique, such as session tokens or table codes.
```

## State

```state
a set of Codes with
  a context Context
  a code String
  unique context and code
```

## Actions

```actions
generate(context: Context, size?: Number) : returns (code: String)
  where size is given and is not a whole number greater than 5
  then
    refuses INVALID_LENGTH "A code must be a whole number of characters greater than 5."
  where size is absent, or is a whole number greater than 5
  then
    create a random code of that size, or of 6 characters when size is absent, that is not already a code in that context
    add a new code with context and code
    returns code

remove(context: Context, code: String) : returns (code: String)
  where no code in Codes has this context and code
  then
    refuses NO_SUCH_CODE "That code is not in use in this context."
  where a code in Codes has this context and code
  then
    remove that code
    returns code
```

## Queries

```queries
_isAvailable(context: Context, code: String) : one (available: Flag)
  Answers true when no code in Codes has this context and code, including when no code
  has ever been generated for that context, and false otherwise.
```
