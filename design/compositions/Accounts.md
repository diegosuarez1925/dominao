# Accounts

A regular can keep a permanent account instead of playing as a guest. The player is
the account itself, not one browser's session, so signing in on another device is
still the same player, at the same table.

Someone [registers](reaction:Accounts.Register) with a username and a password.
PasswordAuthenticating refuses a username that breaks its rule or is taken (whatever
its case), and a password that is too easy to guess. The new account is signed in at
once: the app asks CodeGenerating for a token in the session-token context, as for a
guest, and Sessioning starts a session for the account with a lifetime of thirty
days. Before sending, the sign-up page can [check a password](reaction:Accounts.CheckPassword)
and show [which rules it breaks](former:Accounts.Weaknesses).

```endpoints
Accounts.Register at /accounts/register
Accounts.CheckPassword at /accounts/password-check
```

To [sign in](reaction:Accounts.SignIn), the person gives their username and password.
The right pair starts a new session, the same way registering does, and starts the
account's count of failed sign-ins over. A wrong password counts one more failure in
Throttling and is answered `WRONG_CREDENTIALS`, the same answer an unknown username
gets, so nobody can learn which usernames exist. After five failures in fifteen
minutes the account is locked for fifteen minutes, and every sign-in for it is
answered `TOO_MANY_ATTEMPTS`, even with the right password.

```endpoints
Accounts.SignIn at /accounts/signin
```

Signing out is the same for accounts and guests (see Guests). Once an account has no
session left anywhere, it gets up from its table and stops waiting for strangers, as
a guest does.

An account's owner can [change the password](reaction:Accounts.ChangePassword) by
giving the current one. The new one must be strong enough and different. Every other
browser signed in to the account is then [signed out](reaction:Accounts.SignOutOtherSessionsOnPasswordChange),
so whoever knew the old password is out; this one stays signed in. The owner can also
[delete the account](reaction:Accounts.DeleteAccount), with its password. That frees
the username, [signs the account out everywhere](reaction:Accounts.SignOutDeletedAccount)
(which gets it up from its table and out of the queue), and
[forgets its failed sign-ins](reaction:Accounts.ForgetThrottleOfDeletedAccount).
A guest asking for either is answered `NOT_AN_ACCOUNT`.

```endpoints
Accounts.ChangePassword at /accounts/password
Accounts.DeleteAccount at /accounts/delete
```
