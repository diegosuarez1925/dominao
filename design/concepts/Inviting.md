# Inviting

## Purpose

Ask someone to come to a particular place, so they can go there in one step without
being told how to find it.

## Principle

Abuelo invites Titi to his table. Titi sees the invite, from Abuelo, to that table,
and accepts it, so the invite is gone and she knows where to go. Abuelo also invites
Papo, who declines, so that invite is gone too. Abuelo invites Mami, but before she
answers, every invite to the table is withdrawn, so hers is gone as well. Nobody is
invited to the same place twice at once.

## Types

```types
external User
  Who invites, and who is invited.

external Place
  Where someone is invited to.
```

## State

```state
a set of Invites with
  a from User
  a to User
  a place Place
  a sentAt DateTime
  unique to and place
```

## Actions

```actions
invite(from: User, to: User, place: Place) : returns (invite: Invite)
  where from and to are the same
  then
    refuses SELF "You can't invite yourself."
  where to already has an invite to place
  then
    refuses ALREADY_INVITED "They're already invited."
  where they differ and to has no invite to place
  then
    add a new invite from from to to, to place, with sentAt now
    returns invite

accept(invite: Invite, to: User) : returns (invite: Invite, place: Place)
  where invite does not exist, or was sent to someone other than to
  then
    refuses NO_SUCH_INVITE "That invite is no longer there."
  where invite was sent to to
  then
    remove invite
    returns invite, place

decline(invite: Invite, to: User) : returns (invite: Invite, place: Place)
  where invite does not exist, or was sent to someone other than to
  then
    refuses NO_SUCH_INVITE "That invite is no longer there."
  where invite was sent to to
  then
    remove invite
    returns invite, place

withdraw(place: Place) : returns (place: Place)
  where always
  then
    remove every invite to place
    returns place

forget(user: User) : returns (user: User)
  where always
  then
    remove every invite from or to user
    returns user
```

## Queries

```queries
_invitesFor(to: User) : many (invite: Invite, from: User, place: Place, sentAt: Number)
  Answers each invite sent to the user, newest first, with when it was sent
  (milliseconds since 1970).

_sentBy(from: User) : many (invite: Invite, to: User, place: Place)
  Answers each invite the user sent.

_inviteTo(to: User, place: Place) : optional (invite: Invite)
  Answers the user's invite to the place, and no row when they have none.

_invite(invite: Invite) : optional (from: User, to: User, place: Place)
  Answers who sent the invite, to whom and where, and no row when it does not exist.
```
