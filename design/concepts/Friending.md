# Friending

## Purpose

Let people keep a list of others they choose to play with, where both sides agreed.

## Principle

Abuelo sends Titi a friend request. Titi sees that Abuelo asked, and accepts, so the
request is gone and the two are friends: each sees the other in their list of
friends, and each knows Abuelo was the one who asked. Abuelo also asks Papo, who
rejects him, so that request is gone and they are not friends. A request nobody
answers for a week runs out: it is answered as if it had never been sent, and can be
cleared away.

## Types

```types
external User
  Someone who can have friends.
```

## State

```state
a set of Requests with
  a from User
  a to User
  a sentAt DateTime
  unique from and to

a set of Friendships with
  a first User
  a second User
  an asker User
  a since DateTime
  unique first and second
Rule: a request runs out a week after its sentAt; one that has run out counts as not sent
Rule: in a friendship, first and second are different, and first is the one that sorts first, so a pair is stored once
Rule: a friendship's asker is its first or its second
```

## Actions

```actions
request(from: User, to: User) : returns (request: Request)
  where from and to are the same
  then
    refuses SELF "You can't send a friend request to yourself."
  where from and to are already friends
  then
    refuses ALREADY_FRIENDS "You're already friends."
  where from has a request to to that has not run out
  then
    refuses ALREADY_REQUESTED "You already sent them a friend request."
  where to has a request to from that has not run out
  then
    refuses REQUEST_WAITING "They already sent you a friend request. Accept it instead."
  where they differ, are not friends, and neither has a request to the other that has not run out
  then
    remove any request from from to to that has run out
    add a new request from from to to, with sentAt now
    returns request

accept(request: Request, to: User) : returns (request: Request, from: User, to: User)
  where request does not exist, has run out, or was sent to someone other than to
  then
    refuses NO_SUCH_REQUEST "That friend request is no longer there."
  where request was sent to to and has not run out
  then
    remove request
    add a friendship between its from and to, asked by its from, since now
    returns request, from, to

reject(request: Request, to: User) : returns (request: Request, from: User)
  where request does not exist, has run out, or was sent to someone other than to
  then
    refuses NO_SUCH_REQUEST "That friend request is no longer there."
  where request was sent to to and has not run out
  then
    remove request
    returns request, from

expire(request: Request) : returns (request: Request)
  where request does not exist
  then
    refuses NO_SUCH_REQUEST "That friend request is no longer there."
  where request exists and has not run out
  then
    refuses NOT_EXPIRED "That friend request is still waiting for an answer."
  where request has run out
  then
    remove request
    returns request

forget(user: User) : returns (user: User)
  where always
  then
    remove every request from or to user, and every friendship of user
    returns user
```

## Queries

```queries
_friends(user: User) : many (friend: User, asker: User, since: Number)
  Answers each friend of the user, who asked whom, and since when (milliseconds since
  1970), oldest friendship first.

_areFriends(user: User, other: User) : one (friends: Flag)
  Answers whether the two are friends.

_incoming(user: User) : many (request: Request, from: User, sentAt: Number)
  Answers each request sent to the user that has not run out, newest first, with when
  it was sent (milliseconds since 1970).

_outgoing(user: User) : many (request: Request, to: User, sentAt: Number)
  Answers each request the user sent that has not run out, newest first.

_expired() : many (request: Request)
  Answers every request that has run out.
```
