# Guests

A visitor can play without signing up. They [start as a guest](reaction:Guests.Start)
by typing a display name: Guesting keeps the name, the app asks CodeGenerating for a
32-character code in the session-token context, and Sessioning starts a session for
the guest with that code as its secret token and a lifetime of twelve hours. The
visitor gets back their player (which other players will see as their identity at a
table) and the token, which their browser keeps.

```endpoints
Guests.Start at /guests/start
```

When the page loads again, the browser presents its token to
[find out who it is](reaction:Guests.Me). This also counts as activity, so a player
who keeps playing never expires. A player can also [sign out](reaction:Guests.End),
which ends the session at once.

```endpoints
Guests.Me at /sessions/me
Guests.End at /sessions/end
```

However a session ends, [its token is freed](reaction:Guests.FreeTokenOnSessionEnd)
in the session-token context, so CodeGenerating only holds tokens that are in use.
A guest whose session ended can never be played as again, so the guest is
[forgotten](reaction:Guests.ForgetGuestOnSessionEnd) once they have no session left.

A player who stays away longer than their session's lifetime cannot resume, but the
session still holds a seat or a place in a lobby until it ends. So the server, every
ten minutes, asks to [expire](reaction:Guests.Expire) each idle session. Expiring a
session that is still in use is answered `NOT_IDLE`, so nobody can end someone else's
session this way. An expired session's [token is freed](reaction:Guests.FreeTokenOnSessionExpire)
as well, and a guest left with no session is
[forgotten](reaction:Guests.ForgetGuestOnSessionExpire).

```endpoints
Guests.Expire at /sessions/expire
```
