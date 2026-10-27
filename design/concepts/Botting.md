# Botting

## Purpose

Stand in for a person who is not there, under a name everyone can tell is a bot's.

## Principle

Cheo leaves a game and nobody takes his seat in time, so a bot is created to sit
there instead. It gets a name such as "Bot Chago", so everyone at the table can see
that a bot, not a person, is playing that seat. Asking for the name of anyone who
is not a bot answers nothing, which is how the app tells bots from people.

## Types

```types
```

## State

```state
a set of Bots with
  a name String
```

## Actions

```actions
create() : returns (bot: Bot)
  where always
  then
    add a new bot named "Bot" followed by a nickname picked from a fixed list
    returns bot
```

## Queries

```queries
_name(bot: Bot) : optional (name: String)
  Answers the bot's name, and no row when there is no such bot (so asking about a
  person answers nothing).
```
