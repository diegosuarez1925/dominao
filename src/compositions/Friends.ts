/**
 * Friends, for accounts only: finding someone by username and sending them a friend
 * request, answering the requests sent to you, and seeing your friends and whether
 * they are online. The host of a private table can invite friends to it, and a friend
 * accepts the invite to sit down there, as if they had typed its code.
 *
 * Friending and Inviting know nothing about tables, games or who is online; this
 * module decides that only the host of a private table invites, that an invite lasts
 * until its table's game starts or the table closes, and what the page is shown.
 */
import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { each, form, former, no, reaction, when, where, whether } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";
import { ONLINE_MS } from "../timing.ts";
import { parts, strings } from "./validators.ts";

const { DominoPlaying, Friending, Inviting, Matchmaking, PasswordAuthenticating, Seeing, Sessioning, Table } = concepts;

/**
 * Everything the Friends section shows an account: its friends (with how long since
 * each was last seen, so the page can tell who is online), the friend requests sent to
 * it and by it, the invites it was sent (who from, the table's rules and who sits
 * there), the invites it sent, and when it last looked at its requests, invites and
 * friends, so the page can point out what is new.
 */
const FriendsView = former(
  "the friends of (me)",
  (
    { me },
    {
      friend,
      asker,
      since,
      friendName,
      idleMs,
      request,
      from,
      fromName,
      sentAt,
      outRequest,
      to,
      toName,
      outSentAt,
      invite,
      inviter,
      inviterName,
      place,
      rules,
      invitedAt,
      position,
      seated,
      sentInvite,
      invitee,
      sentPlace,
      requestsSeen,
      invitesSeen,
      friendsSeen,
    },
  ) =>
    form({
      onlineWithinMs: ONLINE_MS,
      seen: each(Seeing._seenAt({ user: me, part: "REQUESTS" }).is({ seenAt: requestsSeen }))
        .where(
          Seeing._seenAt({ user: me, part: "INVITES" }).is({ seenAt: invitesSeen }),
          Seeing._seenAt({ user: me, part: "FRIENDS" }).is({ seenAt: friendsSeen }),
        )
        .form({ requests: requestsSeen, invites: invitesSeen, friends: friendsSeen }),
      friends: each(Friending._friends({ user: me }).is({ friend, asker, since }))
        .where(
          PasswordAuthenticating._username({ user: friend }).is({ username: friendName }),
          whether(Sessioning._idleFor({ player: friend }).is({ idleMs })),
        )
        .form({ player: friend, username: friendName, asker, since, idleMs }),
      incoming: each(Friending._incoming({ user: me }).is({ request, from, sentAt }))
        .where(PasswordAuthenticating._username({ user: from }).is({ username: fromName }))
        .form({ request, from, username: fromName, sentAt }),
      outgoing: each(Friending._outgoing({ user: me }).is({ request: outRequest, to, sentAt: outSentAt }))
        .where(PasswordAuthenticating._username({ user: to }).is({ username: toName }))
        .form({ request: outRequest, to, username: toName, sentAt: outSentAt }),
      invites: each(Inviting._invitesFor({ to: me }).is({ invite, from: inviter, place, sentAt: invitedAt }))
        .where(
          PasswordAuthenticating._username({ user: inviter }).is({ username: inviterName }),
          Table._get({ table: place }).is({ rules }),
        )
        .form({
          invite,
          from: inviter,
          username: inviterName,
          table: place,
          rules,
          sentAt: invitedAt,
          seats: each(Table._seats({ table: place }).is({ position, player: seated })).form({ position }),
        }),
      sent: each(Inviting._sentBy({ from: me }).is({ invite: sentInvite, to: invitee, place: sentPlace })).form({
        invite: sentInvite,
        to: invitee,
        table: sentPlace,
      }),
    }),
);

/** Friends are for accounts; a guest is answered NOT_AN_ACCOUNT. */
const ShowFriends = endpoint(
  "/friends/view",
  ({ token, me }) =>
    receive({ token })
      .then(Sessioning.resume({ token }).responds({ player: me }))
      .then(
        where(PasswordAuthenticating._username({ user: me }))
          .then(respond({ friends: FriendsView({ me }) }))
          .named("account"),
        where(no(PasswordAuthenticating._username({ user: me })))
          .then(respond({ error: "NOT_AN_ACCOUNT" }))
          .named("guest"),
      ),
  { input: { required: ["token"] }, validators: { input: strings("token") } },
);

/** Accounts whose username starts with the text, to send one of them a request. */
const Matches = former("the accounts matching (text)", ({ text }, { user, username }) =>
  form({ accounts: each(PasswordAuthenticating._search({ text }).is({ user, username })).form({ player: user, username }) }),
);

const Search = endpoint(
  "/friends/search",
  ({ token, me, text }) =>
    receive({ token, text })
      .then(Sessioning.resume({ token }).responds({ player: me }))
      .then(
        where(PasswordAuthenticating._username({ user: me }))
          .then(respond({ found: Matches({ text }) }))
          .named("account"),
        where(no(PasswordAuthenticating._username({ user: me })))
          .then(respond({ error: "NOT_AN_ACCOUNT" }))
          .named("guest"),
      ),
  { input: { required: ["token", "text"] }, validators: { input: strings("token", "text") } },
);

/**
 * A request goes to an account named by its username (ignoring case), from the
 * search or from a player's seat at a table. Guests have no username, so they can
 * neither send a request nor be sent one.
 */
const SendRequest = endpoint(
  "/friends/request",
  ({ token, me, username, other, request }) =>
    receive({ token, username })
      .then(Sessioning.resume({ token }).responds({ player: me }))
      .then(
        where(
          PasswordAuthenticating._username({ user: me }),
          PasswordAuthenticating._byUsername({ username }).is({ user: other }),
        )
          .then(Friending.request({ from: me, to: other }).responds({ request }))
          .then(respond({ request, to: other }))
          .named("account-found"),
        where(PasswordAuthenticating._username({ user: me }), no(PasswordAuthenticating._byUsername({ username })))
          .then(respond({ error: "NO_SUCH_USER" }))
          .named("no-such-account"),
        where(no(PasswordAuthenticating._username({ user: me })))
          .then(respond({ error: "NOT_AN_ACCOUNT" }))
          .named("guest"),
      ),
  { input: { required: ["token", "username"] }, validators: { input: strings("token", "username") } },
);

/** Only the account a request was sent to can accept or reject it; for anyone else it does not exist. */
const AcceptRequest = endpoint(
  "/friends/accept",
  ({ token, me, request, from }) =>
    receive({ token, request })
      .then(Sessioning.resume({ token }).responds({ player: me }))
      .then(Friending.accept({ request, to: me }).responds({ request, from }))
      .then(respond({ request, friend: from })),
  { input: { required: ["token", "request"] }, validators: { input: strings("token", "request") } },
);

const RejectRequest = endpoint(
  "/friends/reject",
  ({ token, me, request }) =>
    receive({ token, request })
      .then(Sessioning.resume({ token }).responds({ player: me }))
      .then(Friending.reject({ request, to: me }).responds({ request }))
      .then(respond({ request })),
  { input: { required: ["token", "request"] }, validators: { input: strings("token", "request") } },
);

/**
 * The page says the account looked at its requests, its invites or its friends, so
 * what was there is no longer pointed out as new.
 */
const MarkSeen = endpoint(
  "/friends/seen",
  ({ token, me, part }) =>
    receive({ token, part })
      .then(Sessioning.resume({ token }).responds({ player: me }))
      .then(
        where(PasswordAuthenticating._username({ user: me }))
          .then(Seeing.see({ user: me, part }))
          .then(respond({ part }))
          .named("account"),
        where(no(PasswordAuthenticating._username({ user: me })))
          .then(respond({ error: "NOT_AN_ACCOUNT" }))
          .named("guest"),
      ),
  { input: { required: ["token", "part"] }, validators: { input: parts("part", strings("token")) } },
);

/** Asked by the server every few minutes for each request that has run out, to clear it away. */
const ExpireRequest = endpoint(
  "/friends/expire",
  ({ request }) =>
    receive({ request })
      .then(Friending.expire({ request }).responds({ request }))
      .then(respond({ request })),
  { input: { required: ["request"] }, validators: { input: strings("request") } },
);

/**
 * The host of a private table invites a friend to it, before its game starts. Anyone
 * else at the table is answered NOT_HOST; a table Matchmaking seated strangers at,
 * PUBLIC_TABLE; someone who is not a friend, NOT_FRIENDS; and a friend already sitting
 * at this table, ALREADY_SEATED.
 */
const SendInvite = endpoint(
  "/invites/send",
  ({ token, me, friend, table, invite }) =>
    receive({ token, friend })
      .then(Sessioning.resume({ token }).responds({ player: me }))
      .then(
        where(
          Table._tableOf({ player: me }).is({ table }),
          Table._get({ table }).is({ host: me }),
          no(Matchmaking._placeRules({ place: table })),
          no(DominoPlaying._activeAt({ place: table })),
          Friending._areFriends({ user: me, other: friend }).is({ friends: true }),
          no(Table._tableOf({ player: friend }).is({ table })),
        )
          .then(Inviting.invite({ from: me, to: friend, place: table }).responds({ invite }))
          .then(respond({ invite }))
          .named("host-invites-friend"),
        where(
          Table._tableOf({ player: me }).is({ table }),
          Table._get({ table }).is({ host: me }),
          no(Matchmaking._placeRules({ place: table })),
          no(DominoPlaying._activeAt({ place: table })),
          Friending._areFriends({ user: me, other: friend }).is({ friends: true }),
          Table._tableOf({ player: friend }).is({ table }),
        )
          .then(respond({ error: "ALREADY_SEATED" }))
          .named("friend-already-here"),
        where(
          Table._tableOf({ player: me }).is({ table }),
          Table._get({ table }).is({ host: me }),
          no(Matchmaking._placeRules({ place: table })),
          no(DominoPlaying._activeAt({ place: table })),
          Friending._areFriends({ user: me, other: friend }).is({ friends: false }),
        )
          .then(respond({ error: "NOT_FRIENDS" }))
          .named("not-friends"),
        where(
          Table._tableOf({ player: me }).is({ table }),
          Table._get({ table }).is({ host: me }),
          no(Matchmaking._placeRules({ place: table })),
          DominoPlaying._activeAt({ place: table }),
        )
          .then(respond({ error: "GAME_IN_PROGRESS" }))
          .named("game-running"),
        where(
          Table._tableOf({ player: me }).is({ table }),
          Table._get({ table }).is({ host: me }),
          Matchmaking._placeRules({ place: table }),
        )
          .then(respond({ error: "PUBLIC_TABLE" }))
          .named("public-table"),
        where(Table._tableOf({ player: me }).is({ table }), no(Table._get({ table }).is({ host: me })))
          .then(respond({ error: "NOT_HOST" }))
          .named("not-host"),
        where(no(Table._tableOf({ player: me })))
          .then(respond({ error: "NOT_SEATED" }))
          .named("not-seated"),
      ),
  { input: { required: ["token", "friend"] }, validators: { input: strings("token", "friend") } },
);

/**
 * Accepting an invite sits the friend down at its table, as joining by its code would
 * (the invite itself is then used up, by UseInviteOnJoin). A full table is answered
 * TABLE_FULL and the invite stays, in case a seat frees up. Someone waiting for
 * strangers must leave the queue first (IN_QUEUE).
 */
const AcceptInvite = endpoint(
  "/invites/accept",
  ({ token, me, invite, table, position }) =>
    receive({ token, invite })
      .then(Sessioning.resume({ token }).responds({ player: me }))
      .then(
        where(Inviting._invite({ invite }).is({ to: me, place: table }), no(Matchmaking._lobbyOf({ player: me })))
          .then(Table.join({ table, player: me }).responds({ position }))
          .then(respond({ table, position }))
          .named("invited"),
        where(Inviting._invite({ invite }).is({ to: me }), Matchmaking._lobbyOf({ player: me }))
          .then(respond({ error: "IN_QUEUE" }))
          .named("queued"),
        where(no(Inviting._invite({ invite }).is({ to: me })))
          .then(respond({ error: "NO_SUCH_INVITE" }))
          .named("no-such-invite"),
      ),
  { input: { required: ["token", "invite"] }, validators: { input: strings("token", "invite") } },
);

const DeclineInvite = endpoint(
  "/invites/decline",
  ({ token, me, invite }) =>
    receive({ token, invite })
      .then(Sessioning.resume({ token }).responds({ player: me }))
      .then(Inviting.decline({ invite, to: me }).responds({ invite }))
      .then(respond({ invite })),
  { input: { required: ["token", "invite"] }, validators: { input: strings("token", "invite") } },
);

// Sitting down at a table, by its invite or by its code, uses up the invite to it.
const UseInviteOnJoin = reaction(({ table, player, position, invite }) =>
  when(Table.join({ table, player }).responds({ position }))
    .where(Inviting._inviteTo({ to: player, place: table }).is({ invite }))
    .then(Inviting.accept({ invite, to: player })),
);

// Once the game at a table starts, nobody is waited for: its invites are withdrawn.
const WithdrawInvitesWhenGameStarts = reaction(({ place, game }) =>
  when(DominoPlaying.start({ place }).responds({ game })).then(Inviting.withdraw({ place })),
);

// So are those to a table that closes.
const WithdrawInvitesWhenTableCloses = reaction(({ table, code }) =>
  when(Table.close({ table }).responds({ code })).then(Inviting.withdraw({ place: table })),
);

// A deleted account leaves no friends, requests, invites or looks behind.
const ForgetFriendsOfDeletedAccount = reaction(({ user }) =>
  when(PasswordAuthenticating.unregister({}).responds({ user })).then(Friending.forget({ user })),
);

const ForgetInvitesOfDeletedAccount = reaction(({ user }) =>
  when(PasswordAuthenticating.unregister({}).responds({ user })).then(Inviting.forget({ user })),
);

const ForgetLooksOfDeletedAccount = reaction(({ user }) =>
  when(PasswordAuthenticating.unregister({}).responds({ user })).then(Seeing.forget({ user })),
);

export const composition = {
  FriendsView,
  ShowFriends,
  Matches,
  Search,
  SendRequest,
  AcceptRequest,
  RejectRequest,
  MarkSeen,
  ExpireRequest,
  SendInvite,
  AcceptInvite,
  DeclineInvite,
  UseInviteOnJoin,
  WithdrawInvitesWhenGameStarts,
  WithdrawInvitesWhenTableCloses,
  ForgetFriendsOfDeletedAccount,
  ForgetInvitesOfDeletedAccount,
  ForgetLooksOfDeletedAccount,
};
