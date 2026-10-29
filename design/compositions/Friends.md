# Friends

Accounts can have friends; guests cannot, since a guest is forgotten when they leave.
Every endpoint here first resumes a session from its token, and the account that
session acts as is the one sending, answering or inviting, so nobody acts in someone
else's name. A guest asking for any of it is answered `NOT_AN_ACCOUNT`.

An account [sees its friends](reaction:Friends.ShowFriends): the
[Friends section](former:Friends.FriendsView) lists each friend by username with how
long since their page last checked in (the page shows a friend as online when that is
under the `onlineWithinMs` it is given, ninety seconds), the friend requests sent to it
and by it that have not run out, the invites it was sent (who from, the table's rules
and how many sit there) and the ones it sent, and when it last looked at its requests,
its invites and its friends. The page asks again every couple of seconds, so new
requests and invites appear (and pop up) without reloading.

```endpoints
Friends.ShowFriends at /friends/view
```

To find someone, an account [searches](reaction:Friends.Search) by the start of a
username, ignoring case, and is shown [up to ten accounts](former:Friends.Matches).
It [sends a friend request](reaction:Friends.SendRequest) to an account by its
username, from that search or by tapping a player at a table. Friending refuses a
request to yourself (`SELF`), to a friend (`ALREADY_FRIENDS`), a second one while the
first waits (`ALREADY_REQUESTED`), and one to someone who already asked you
(`REQUEST_WAITING`, accept theirs instead). An unknown username is answered
`NO_SUCH_USER`.

```endpoints
Friends.Search at /friends/search
Friends.SendRequest at /friends/request
```

The account a request was sent to can [accept it](reaction:Friends.AcceptRequest),
which makes the two friends, or [reject it](reaction:Friends.RejectRequest); either way
the request is gone. To anyone else the request does not exist (`NO_SUCH_REQUEST`).
A request nobody answers for a week runs out and stops showing; every few minutes the
server [clears away](reaction:Friends.ExpireRequest) the ones that have.

```endpoints
Friends.AcceptRequest at /friends/accept
Friends.RejectRequest at /friends/reject
Friends.ExpireRequest at /friends/expire
```

The page [marks what the account has seen](reaction:Friends.MarkSeen) when it opens
its requests (`REQUESTS`), its invites (`INVITES`) or its friend list (`FRIENDS`).
Requests and invites newer than that look are pointed out with a bubble, and a friend
who accepted the account's request since it last looked at its friends gets a pop-up.

```endpoints
Friends.MarkSeen at /friends/seen
```

The host of a private table [invites a friend](reaction:Friends.SendInvite) to it,
before its game starts. Anyone else at the table is answered `NOT_HOST`, a table
Matchmaking seated strangers at `PUBLIC_TABLE`, a table whose game is being played
`GAME_IN_PROGRESS`, someone who is not a friend `NOT_FRIENDS`, a friend already
sitting there `ALREADY_SEATED`, and a second invite to the same friend
`ALREADY_INVITED`.

```endpoints
Friends.SendInvite at /invites/send
```

The friend [accepts the invite](reaction:Friends.AcceptInvite) to sit down at that
table, as joining by its code would (a full table is answered `TABLE_FULL`, and the
invite stays in case a seat frees up), or [declines it](reaction:Friends.DeclineInvite).
Sitting down at the table, by the invite or by its code,
[uses up the invite](reaction:Friends.UseInviteOnJoin). An invite lasts until the
table's game [starts](reaction:Friends.WithdrawInvitesWhenGameStarts) or the table
[closes](reaction:Friends.WithdrawInvitesWhenTableCloses), when every invite to it is
withdrawn.

```endpoints
Friends.AcceptInvite at /invites/accept
Friends.DeclineInvite at /invites/decline
```

A deleted account leaves nothing behind: its
[friendships and requests](reaction:Friends.ForgetFriendsOfDeletedAccount), the
[invites it sent and was sent](reaction:Friends.ForgetInvitesOfDeletedAccount), and
[what it had seen](reaction:Friends.ForgetLooksOfDeletedAccount) are all forgotten.
