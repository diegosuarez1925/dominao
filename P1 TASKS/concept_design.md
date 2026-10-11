
# Concepts


**concept** GuestSessioning 

**purpose** \
let someone play under a recognizable name without creating an account

**principle** \
a person opens the app, types a display name, and starts a session; their device keeps the session's token, so when they reload the page or reconnect they resume as the same guest with the same name; if they stay away longer than the inactivity limit, the session expires and the name is no longer tied to them \

**state** \
a set of Sessions with
- a token String
- a displayName String
- a lastSeen DateTime


**actions** \
start (displayName: String): (session: Session, token: String) \
**where** displayName is 1 to 20 characters \
**then** creates a new session with a fresh, long, unguessable token, the given displayName, and lastSeen := now; returns both 

resume (token: String): (session: Session) \
**where** a session with this token exists \
**then** sets that session's lastSeen := now; returns it 

rename (session: Session, displayName: String) \
**where** session exists and displayName is 1 to 20 characters \
**then** sets session's displayName 

end (session: Session) \
**where** session exists \
**then** deletes session 

system_expire (session: Session) \
**where** session exists and lastSeen + INACTIVITY_LIMIT < now \
**then** ends session 

queries 

_getName (session: Session): (displayName: String) \
_getSession (token: String): (session: Session) 

---

**concept** CodeGenerating 

**purpose** \
provide a set of unique codes, either short or long, that can be used as identifiers

**principle** \
a caller asks for a code to be generated within a ceratin context, and the concept generates a unique code within this context

**state** 

a set of Contexts with
- a set of code Strings 

**actions**

generate (context: Context, optional length: Number) : (code: String)
**where** length > 5 \
**then** creates a code of length specidied unique within this context, adds its set of codes, and returns it \

remove (context: Context, code: String) \
**where** code exists within context \
**then** removes the code from this context's code set 

queries 

_isAvailable (context: Context, code: String) : (available: Boolean) \
**then** returns true if code does not exists within this context or if the context has not had any code generated for it; false otherwise 


---


**concept** Matchmaking [Player, Rules] 

**purpose** \
get a player into a game with strangers quickly, when no group of friends is available 

**principle** \
a player picks one of the public rule presets and joins its queue; as soon as four players are waiting for the same preset, the four who have waited longest are removed from the queue and grouped into random seats; a player can leave the queue at any moment before that 

**state** \
a set of Entries with \
a player Player \
a rules Rules \
a joinedAt DateTime 

**actions** \
enqueue (player: Player, rules: Rules) \
**where** player has no entry \
**then** creates an entry for player with rules and joinedAt := now 

cancel (player: Player) \
**where** player has an entry \
**then** deletes that entry 

system formGroup (rules: Rules): (players: seq of Player) \
**where** at least four entries have these rules \
**then** deletes the four entries with these rules that have the earliest joinedAt; returns their players in a random order (order = seat position, so partners are random)


---


**concept** Table [Player, Rules]

**purpose**
let a specific group of people sit down together, form teams, and agree on the rules before playing

**principle**
a host opens a table with a chosen set of rules and sits in seat 0; three friends join and fill seats 1-3; players in seats 0 and 2 are partners, as are seats 1 and 3, so moving seats is how teams are chosen; when all four seats are full the host starts the game and the table is marked as playing; when that game ends the table reopens with the same people seated, ready for a rematch

**state**
a set of Tables with
- a host Player
- a rules Rules
- a status of OPEN or PLAYING

a set of Seats with
- a table Table
- a position Number          
- a player Player

**actions**

open (host: Player, rules: Rules): (table: Table) \
**where** host is not seated at any table \
**then** creates a table with this host and rules, status := OPEN, and seats host at position 0

join (table: Table, player: Player): (position: Number) \
**where** table is OPEN, has a free position, and player is not seated at any table \
**then** seats player at the lowest free position; returns it

moveSeat (table: Table, player: Player, position: Number) \
**where** table is OPEN and player is seated at table \
**then** if position is free, moves player there; if another player sits there, the two players swap positions

setRules (table: Table, host: Player, rules: Rules) \
**where** table is OPEN and host is table's host \
**then** sets table's rules

leave (table: Table, player: Player) \
**where** player is seated at table \
**then** removes player's seat; if player was host and others remain, host := the remaining player with the lowest position; if no one remains, deletes the table

start (table: Table, host: Player): (players: seq of Player, rules: Rules) \
**where** table is OPEN, all four positions are filled, and host is table's host \
**then** status := PLAYING; returns players ordered by position, and the table's rules

finish (table: Table) \
**where** table is PLAYING \
**then** status := OPEN


# Reactions

## Guest sessions

**reaction** StartGuestSession \
**when** Request.startSession (displayName) \
**then** CodeGenerating.generate (context: SESSION_TOKENS, length: 32)

**reaction** CreateSessionWithToken \
**when**
- Request.startSession (displayName)
- CodeGenerating.generate (context: SESSION_TOKENS): (code)

**then** GuestSessioning.start (displayName, token: code)

**reaction** FreeTokenOnSessionEnd \
**when** GuestSessioning.end (session): (token) \
**then** CodeGenerating.remove (context: SESSION_TOKENS, code: token)

## Private tables

**reaction** GenerateTableCode \
**when** Request.openTable (token, rules) \
**where** in GuestSessioning: _getSession (token) is session \
**then** CodeGenerating.generate (context: TABLE_CODES, length: 6)

**reaction** OpenTableWithCode \
**when**
- Request.openTable (token, rules)
- CodeGenerating.generate (context: TABLE_CODES): (code)

**where** in GuestSessioning: _getSession (token) is session \
**then** Table.open (host: session, rules, code)

**reaction** JoinByCode \
**when** Request.joinByCode (token, code) \
**where**
- in GuestSessioning: _getSession (token) is session
- in Table: _getByCode (code) is table

**then** Table.join (table, player: session)

**reaction** CloseEmptyTable \
**when** Table.leave (table, player) \
**where** in Table: table has no seated players \
**then** Table.close (table)

**reaction** FreeTableCode \
**when** Table.close (table): (code) \
**then** CodeGenerating.remove (context: TABLE_CODES, code)

# Design Note

Here, I introduce four foundational concepts used for the design of the app. **GuestSessioning** is essential for accesibility, to not have to create usernames and passwords to remember. The **CodeGenerating** concept can be used to handle creation of codes for the **GuestSessioning** concept, but also for the join codes of private **Table**s, which is a concept that will also be fundamental to allow players to play with one another. Then, **Matchmaking** handles the quick play functiomality, to not limit the player to schedule with their friends to be able to play. I included multiple reactions that illustrate how these concepts would work together, like how codes are generated for tables and guest sessioning.