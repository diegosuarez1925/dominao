/**
 * Permanent accounts: registering with a username and a password, signing in from any
 * browser, changing the password and deleting the account. The player is the account
 * itself, so signing in elsewhere is still the same player, at the same table.
 *
 * Signing in is throttled per account: after several wrong passwords in a row, even
 * the right one is refused for a while. A wrong password and an unknown username get
 * the same answer, so nobody can find out which usernames exist by signing in.
 */
import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { each, earlier, form, former, no, reaction, when, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";
import { ACCOUNT_SESSION_MS } from "../timing.ts";
import { strings } from "./validators.ts";

const { CodeGenerating, PasswordAuthenticating, Sessioning, Throttling } = concepts;

// The same tokens guests get (see Guests.ts).
const SESSION_TOKENS = "SESSION_TOKENS";
const TOKEN_SIZE = 32;

/** Registers an account and signs its owner in on this browser. */
const Register = endpoint(
  "/accounts/register",
  ({ username, password, user, code, session }) =>
    receive({ username, password })
      .then(PasswordAuthenticating.register({ username, password }).responds({ user }))
      .then(CodeGenerating.generate({ context: SESSION_TOKENS, size: TOKEN_SIZE }).responds({ code }))
      .then(Sessioning.start({ player: user, token: code, lifetime: ACCOUNT_SESSION_MS }).responds({ session }))
      .then(respond({ player: user, token: code })),
  { input: { required: ["username", "password"] }, validators: { input: strings("username", "password") } },
);

/** Which password rules a password breaks, so the sign-up page can say why before it is sent. */
const Weaknesses = former("the weaknesses of (password) for (username)", ({ username, password }, { rule }) =>
  form({ weaknesses: each(PasswordAuthenticating._weaknesses({ username, password }).is({ rule })).form({ rule }) }),
);

const CheckPassword = endpoint(
  "/accounts/password-check",
  ({ username, password }) => receive({ username, password }).then(respond({ check: Weaknesses({ username, password }) })),
  { input: { required: ["username", "password"] }, validators: { input: strings("username", "password") } },
);

const SignIn = endpoint(
  "/accounts/signin",
  ({ username, password, user, code, session }) =>
    receive({ username, password }).then(
      where(
        PasswordAuthenticating._verify({ username, password }).is({ user }),
        Throttling._locked({ key: user }).is({ locked: false }),
      )
        .then(Throttling.reset({ key: user }))
        .then(CodeGenerating.generate({ context: SESSION_TOKENS, size: TOKEN_SIZE }).responds({ code }))
        .then(Sessioning.start({ player: user, token: code, lifetime: ACCOUNT_SESSION_MS }).responds({ session }))
        .then(respond({ player: user, token: code }))
        .named("signed-in"),
      where(
        PasswordAuthenticating._byUsername({ username }).is({ user }),
        no(PasswordAuthenticating._verify({ username, password })),
        Throttling._locked({ key: user }).is({ locked: false }),
      )
        .then(Throttling.fail({ key: user }))
        .then(respond({ error: "WRONG_CREDENTIALS" }))
        .named("wrong-password"),
      where(no(PasswordAuthenticating._byUsername({ username })))
        .then(respond({ error: "WRONG_CREDENTIALS" }))
        .named("unknown-username"),
      where(
        PasswordAuthenticating._byUsername({ username }).is({ user }),
        Throttling._locked({ key: user }).is({ locked: true }),
      )
        .then(respond({ error: "TOO_MANY_ATTEMPTS" }))
        .named("locked"),
    ),
  { input: { required: ["username", "password"] }, validators: { input: strings("username", "password") } },
);

/**
 * Changing the password signs the account out everywhere else
 * (SignOutOtherSessionsOnPasswordChange), but not on this browser. A guest has no
 * password to change.
 */
const ChangePassword = endpoint(
  "/accounts/password",
  ({ token, current, password, me }) =>
    receive({ token, current, password })
      .then(Sessioning.resume({ token }).responds({ player: me }))
      .then(
        where(PasswordAuthenticating._username({ user: me }))
          .then(PasswordAuthenticating.changePassword({ user: me, current, password }).responds({ user: me }))
          .then(respond({ player: me }))
          .named("account"),
        where(no(PasswordAuthenticating._username({ user: me })))
          .then(respond({ error: "NOT_AN_ACCOUNT" }))
          .named("guest"),
      ),
  {
    input: { required: ["token", "current", "password"] },
    validators: { input: strings("token", "current", "password") },
  },
);

/** Deleting an account takes its password again, so an unattended browser cannot do it. */
const DeleteAccount = endpoint(
  "/accounts/delete",
  ({ token, password, me }) =>
    receive({ token, password })
      .then(Sessioning.resume({ token }).responds({ player: me }))
      .then(
        where(PasswordAuthenticating._username({ user: me }))
          .then(PasswordAuthenticating.unregister({ user: me, password }).responds({ user: me }))
          .then(respond({ player: me }))
          .named("account"),
        where(no(PasswordAuthenticating._username({ user: me })))
          .then(respond({ error: "NOT_AN_ACCOUNT" }))
          .named("guest"),
      ),
  { input: { required: ["token", "password"] }, validators: { input: strings("token", "password") } },
);

// A new password signs out every other browser, so whoever knew the old one is out.
const SignOutOtherSessionsOnPasswordChange = reaction(({ user, keep, token }) =>
  when(PasswordAuthenticating.changePassword({ user }).responds({ user }))
    .where(
      earlier(Sessioning.resume, { token: keep }, { player: user }),
      Sessioning._others({ player: user, keep }).is({ token }),
    )
    .then(Sessioning.end({ token })),
);

// A deleted account is signed out everywhere. Ending its last session also gets it up
// from its table and out of the queue (Tables, Matchmaking).
const SignOutDeletedAccount = reaction(({ user, token }) =>
  when(PasswordAuthenticating.unregister({}).responds({ user }))
    .where(Sessioning._tokens({ player: user }).is({ token }))
    .then(Sessioning.end({ token })),
);

// Nor does Throttling keep counting for an account that is gone.
const ForgetThrottleOfDeletedAccount = reaction(({ user }) =>
  when(PasswordAuthenticating.unregister({}).responds({ user })).then(Throttling.reset({ key: user })),
);

export const composition = {
  Register,
  Weaknesses,
  CheckPassword,
  SignIn,
  ChangePassword,
  DeleteAccount,
  SignOutOtherSessionsOnPasswordChange,
  SignOutDeletedAccount,
  ForgetThrottleOfDeletedAccount,
};
