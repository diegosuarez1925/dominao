/**
 * Guest sessions: picking a display name, and recognizing a returning guest by
 * the token their browser kept. CodeGenerating makes the tokens, in their own
 * context, so they never collide with table codes or with each other.
 */
import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { reaction, when } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";
import { strings } from "./validators.ts";

const { CodeGenerating, GuestSessioning } = concepts;

// 32 characters from a 32-symbol alphabet is 160 random bits: far too many to guess.
const SESSION_TOKENS = "SESSION_TOKENS";
const TOKEN_SIZE = 32;

const Start = endpoint(
  "/guests/start",
  ({ displayName, code, session }) =>
    receive({ displayName })
      .then(CodeGenerating.generate({ context: SESSION_TOKENS, size: TOKEN_SIZE }).responds({ code }))
      .then(GuestSessioning.start({ displayName, token: code }).responds({ session }))
      .then(respond({ session, token: code })),
  { input: { required: ["displayName"] }, validators: { input: strings("displayName") } },
);

const Me = endpoint(
  "/guests/me",
  ({ token, session, displayName }) =>
    receive({ token })
      .then(GuestSessioning.resume({ token }).responds({ session, displayName }))
      .then(respond({ session, displayName })),
  { input: { required: ["token"] }, validators: { input: strings("token") } },
);

const Leave = endpoint(
  "/guests/leave",
  ({ token, session }) =>
    receive({ token })
      .then(GuestSessioning.end({ token }).responds({ session }))
      .then(respond({ session })),
  { input: { required: ["token"] }, validators: { input: strings("token") } },
);

/**
 * Ends a session nobody has used for longer than the inactivity limit. The server
 * asks this for every idle session on a timer (src/expiry.ts); a session still in use
 * is answered NOT_IDLE, so nobody can end another guest's session through it.
 */
const Expire = endpoint(
  "/guests/expire",
  ({ session, token }) =>
    receive({ session })
      .then(GuestSessioning.expire({ session }).responds({ session, token }))
      .then(respond({ session })),
  { input: { required: ["session"] }, validators: { input: strings("session") } },
);

// Whenever a session ends, its token goes back to CodeGenerating.
const FreeTokenOnSessionEnd = reaction(({ token, session }) =>
  when(GuestSessioning.end({ token }).responds({ session })).then(
    CodeGenerating.remove({ context: SESSION_TOKENS, code: token }),
  ),
);

// So does the token of a session that expired.
const FreeTokenOnSessionExpire = reaction(({ token }) =>
  when(GuestSessioning.expire({}).responds({ token })).then(
    CodeGenerating.remove({ context: SESSION_TOKENS, code: token }),
  ),
);

export const composition = { Start, Me, Leave, Expire, FreeTokenOnSessionEnd, FreeTokenOnSessionExpire };
