# Guests

Nobody signs up for DOMINAO. A visitor [starts a guest session](reaction:Guests.Start)
by typing a display name. The app asks CodeGenerating for a 32-character code in the
session-token context and starts the session with that code as its secret token.
The visitor gets back the session (which other players will see as their identity
at a table) and the token, which their browser keeps.

```endpoints
Guests.Start at /guests/start
```

When the page loads again, the browser presents its token to
[find out who it is](reaction:Guests.Me). This also counts as activity, so a guest
who keeps playing never expires. A guest can also [leave](reaction:Guests.Leave),
which ends the session at once.

```endpoints
Guests.Me at /guests/me
Guests.Leave at /guests/leave
```

However a session ends, [its token is freed](reaction:Guests.FreeTokenOnSessionEnd)
in the session-token context, so CodeGenerating only holds tokens that are in use.
