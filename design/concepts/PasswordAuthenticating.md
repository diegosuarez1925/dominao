# PasswordAuthenticating

## Purpose

Let a person prove they own an account with a unique username and a password only
they know.

## Principle

Abuelo registers with the username "abuelo_pr" and a password that is hard to guess,
and gets an account. Later, on another computer, he gives the same two, and they are
recognized as his account; someone who gives a wrong password is not. "Abuelo_PR"
cannot be registered, because usernames are unique whatever their case. If Abuelo
changes his password, the old one stops working. If he unregisters, his username is
free for someone else.

## Types

```types
```

## State

```state
a set of Users with
  a unique usernameKey String
  a username String
  a passwordHash String
  a createdAt DateTime
Rule: usernameKey is the username in lower case
Rule: a username is 3 to 20 letters, digits, _ . or -, and starts with a letter or digit
Rule: passwordHash is an argon2id hash with its own salt; the password itself is never kept
Rule: a password is strong enough when it breaks none of the password rules
Rule: LENGTH: a password is 10 to 128 characters long
Rule: VARIETY: a password has at least three of a lowercase letter, an uppercase letter, a digit, and anything else
Rule: CONTAINS_USERNAME: a password does not contain the username, ignoring case
Rule: COMMON: ignoring case, neither a password nor its letters alone (also read with swaps such as @ for a or 0 for o undone) are on a list of passwords people pick first (such as "password", "qwerty" or "dominoes"), and it is not one character repeated
```

## Actions

```actions
register(username: String, password: String) : returns (user: User)
  where username breaks the username rule
  then
    refuses INVALID_USERNAME "A username is 3 to 20 letters, digits, _ . or -, starting with a letter or digit."
  where username follows the rule, and a user has the same usernameKey
  then
    refuses USERNAME_TAKEN "That username is taken."
  where username follows the rule, no user has its usernameKey, and password breaks a password rule
  then
    refuses WEAK_PASSWORD "That password is too easy to guess."
  where username follows the rule, no user has its usernameKey, and password is strong enough
  then
    add a new user with the username, its usernameKey, a hash of password, and createdAt now
    returns user

changePassword(user: User, current: String, password: String) : returns (user: User)
  where user does not exist
  then
    refuses NO_SUCH_USER "There is no such account."
  where user exists, and current is not the user's password
  then
    refuses WRONG_PASSWORD "That is not the current password."
  where current is the user's password, and password breaks a password rule or is the same as current
  then
    refuses WEAK_PASSWORD "That password is too easy to guess."
  where current is the user's password, and password is strong enough and differs from current
  then
    replace the user's passwordHash with a hash of password
    returns user

unregister(user: User, password: String) : returns (user: User)
  where user does not exist
  then
    refuses NO_SUCH_USER "There is no such account."
  where user exists, and password is not the user's password
  then
    refuses WRONG_PASSWORD "That is not the current password."
  where password is the user's password
  then
    delete user
    returns user
```

## Queries

```queries
_verify(username: String, password: String) : optional (user: User)
  Answers the user whose usernameKey is the username in lower case and whose password
  this is. A wrong password and an unknown username both answer no row, and take as
  long, so the two cannot be told apart.

_byUsername(username: String) : optional (user: User)
  Answers the user with this username, ignoring case.

_username(user: User) : optional (username: String)
  Answers the username as its owner typed it, and no row when there is no such user.

_weaknesses(username: String, password: String) : many (rule: String)
  Answers each password rule (LENGTH, VARIETY, CONTAINS_USERNAME, COMMON) the password
  breaks for this username, and no rows when it is strong enough.
```
