# GuestSessioning

## Purpose

Let someone play under a recognizable name without creating an account.

## Principle

Abuelo opens the app, types the display name "Abuelo", and starts a session with a
secret token the app supplies. His device keeps that token, so when he reloads the page he resumes the
same session and is still called "Abuelo". If he stays away longer than the
inactivity limit, resuming with that token is refused and the name is no longer tied
to him. Ending the session makes the token unknown right away.

## Types

```types
```

## State

```state
a set of Sessions with
  a unique token String
  a displayName String
  a lastSeen DateTime
Rule: a displayName is 1 to 20 characters long after trimming spaces
```

## Actions

```actions
start(displayName: String, token: String) : returns (session: Session)
  where displayName is empty or longer than 20 characters after trimming
  then
    refuses INVALID_NAME "A display name must be 1 to 20 characters long."
  where displayName is 1 to 20 characters long after trimming, and another session already has this token
  then
    refuses TOKEN_IN_USE "That token already belongs to another session."
  where displayName is 1 to 20 characters long after trimming, and no session has this token
  then
    add a new session with the token, the trimmed displayName, and lastSeen set to now
    returns session

resume(token: String) : returns (session: Session, displayName: String)
  where no session has this token, or its lastSeen is more than the inactivity limit ago
  then
    delete the session with this token if it has expired
    refuses UNKNOWN_SESSION "This guest session is not active."
  where a session with this token was seen within the inactivity limit
  then
    set that session's lastSeen to now
    returns session, displayName

end(token: String) : returns (session: Session)
  where no session has this token
  then
    refuses UNKNOWN_SESSION "This guest session is not active."
  where a session has this token
  then
    delete that session
    returns session
```

## Queries

```queries
_getName(session: Session) : optional (displayName: String)
  Answers the session's display name, and no row when the session does not exist.
```
