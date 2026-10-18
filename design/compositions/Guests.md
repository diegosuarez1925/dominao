# Guests

Nobody signs up for DOMINAO. A visitor [starts a guest session](reaction:Guests.Start)
by typing a display name, and gets back the session (which other players will see
as their identity at a table) and a secret token that their browser keeps.

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
