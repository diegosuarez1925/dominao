/**
 * Playing as a guest, and the sessions every player's browser keeps. A guest picks a
 * display name, and the app starts a session for them under a fresh token. The token
 * comes from CodeGenerating, in its own context, so it never collides with table codes
 * or with another token. The rest of the app only ever sees the player a session acts
 * as, never the token.
 */
import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { no, reaction, when, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";
import { GUEST_SESSION_MS } from "../timing.ts";
import { strings } from "./validators.ts";

const { CodeGenerating, Guesting, Sessioning } = concepts;

// 32 characters from a 32-symbol alphabet is 160 random bits: far too many to guess.
const SESSION_TOKENS = "SESSION_TOKENS";
const TOKEN_SIZE = 32;

const Start = endpoint(
  "/guests/start",
  ({ displayName, guest, code, session }) =>
    receive({ displayName })
      .then(Guesting.create({ displayName }).responds({ guest }))
      .then(CodeGenerating.generate({ context: SESSION_TOKENS, size: TOKEN_SIZE }).responds({ code }))
      .then(Sessioning.start({ player: guest, token: code, lifetime: GUEST_SESSION_MS }).responds({ session }))
      .then(respond({ player: guest, token: code })),
  { input: { required: ["displayName"] }, validators: { input: strings("displayName") } },
);

/** Who a returning browser is. This also counts as activity, so the session lasts. */
const Me = endpoint(
  "/sessions/me",
  ({ token, player, displayName }) =>
    receive({ token })
      .then(Sessioning.resume({ token }).responds({ player }))
      .then(
        where(Guesting._name({ guest: player }).is({ displayName }))
          .then(respond({ player, displayName }))
          .named("guest"),
      ),
  { input: { required: ["token"] }, validators: { input: strings("token") } },
);

const End = endpoint(
  "/sessions/end",
  ({ token, player }) =>
    receive({ token })
      .then(Sessioning.end({ token }).responds({ player }))
      .then(respond({ player })),
  { input: { required: ["token"] }, validators: { input: strings("token") } },
);

/**
 * Ends a session nobody has used for longer than its lifetime. The server asks this
 * for every idle session on a timer (src/expiry.ts); a session still in use is
 * answered NOT_IDLE, so nobody can end someone else's session through it.
 */
const Expire = endpoint(
  "/sessions/expire",
  ({ session, player }) =>
    receive({ session })
      .then(Sessioning.expire({ session }).responds({ player }))
      .then(respond({ session })),
  { input: { required: ["session"] }, validators: { input: strings("session") } },
);

// Whenever a session ends, its token goes back to CodeGenerating.
const FreeTokenOnSessionEnd = reaction(({ token, player }) =>
  when(Sessioning.end({ token }).responds({ player })).then(
    CodeGenerating.remove({ context: SESSION_TOKENS, code: token }),
  ),
);

// So does the token of a session that expired.
const FreeTokenOnSessionExpire = reaction(({ token }) =>
  when(Sessioning.expire({}).responds({ token })).then(
    CodeGenerating.remove({ context: SESSION_TOKENS, code: token }),
  ),
);

// A guest exists only to play under a name. Once their last session is gone (they
// left, or stayed away too long) nobody can play as them again, so they are forgotten.
const ForgetGuestOnSessionEnd = reaction(({ player }) =>
  when(Sessioning.end({}).responds({ player }))
    .where(Guesting._name({ guest: player }), no(Sessioning._idleFor({ player })))
    .then(Guesting.forget({ guest: player })),
);

const ForgetGuestOnSessionExpire = reaction(({ player }) =>
  when(Sessioning.expire({}).responds({ player }))
    .where(Guesting._name({ guest: player }), no(Sessioning._idleFor({ player })))
    .then(Guesting.forget({ guest: player })),
);

export const composition = {
  Start,
  Me,
  End,
  Expire,
  FreeTokenOnSessionEnd,
  FreeTokenOnSessionExpire,
  ForgetGuestOnSessionEnd,
  ForgetGuestOnSessionExpire,
};
