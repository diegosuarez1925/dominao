# Seats

A game keeps going when someone gets up. DominoPlaying keeps an empty seat with its
hand and pauses the game; this composition decides who sits down in it. Table seats
only people, and a table seat is free exactly when that seat in the game is empty or
held by a bot. Since Table hands out the lowest free seat, whoever joins a table in
the middle of a game lands on a seat that needs them, and table positions stay the
game's positions.

When a player [leaves the table](reaction:Seats.VacateSeatWhenPlayerLeaves) while a
game is being played there, their seat is left empty and the game pauses. Whoever
then sits down at the table [takes the empty seat](reaction:Seats.TakeEmptySeat),
hand and all, and once no seat is empty play goes on from where it stopped. The game
ends early only when the last person leaves, which closes the table.

Nobody may be kept waiting forever, so a seat that has waited long enough for a
person (30 seconds) [gets a bot](reaction:Seats.SeatBot), which Botting names so
everyone can tell. A person who later sits down at that table
[takes over from the bot](reaction:Seats.ReplaceBotWithJoiner). When it is a bot's
turn, after a moment to "think", it [plays](reaction:Seats.BotMove) one of its legal
moves, chosen by DominoPlaying's move chooser (random for now; the chooser is passed
in when the app is assembled, so a smarter bot changes nothing here).

A guest whose page stops checking in (closed, or offline) for long enough (45
seconds) is [taken out of their game](reaction:Seats.DropAbsentPlayer) as if they had
left, so the others are not stuck waiting on a player who is gone.

The server's own ticker asks for these three every second. Each endpoint checks the
time itself, so asking early, or asking as anyone else, changes nothing: they answer
`TOO_SOON`, `STILL_HERE`, `SEAT_TAKEN`, `NOT_A_BOT`, `GAME_NOT_ACTIVE`,
`NOT_IN_GAME`, `NOT_SEATED` or `NOT_A_GUEST` instead.

```endpoints
Seats.SeatBot at /games/seat-bot
Seats.BotMove at /games/bot-move
Seats.DropAbsentPlayer at /games/drop-absent
```
