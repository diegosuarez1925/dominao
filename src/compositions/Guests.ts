/**
 * Guest sessions: picking a display name, and recognizing a returning guest by
 * the token their browser kept.
 */
import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { concepts } from "../concepts.ts";
import { strings } from "./validators.ts";

const { GuestSessioning } = concepts;

const Start = endpoint(
  "/guests/start",
  ({ displayName, session, token }) =>
    receive({ displayName })
      .then(GuestSessioning.start({ displayName }).responds({ session, token }))
      .then(respond({ session, token })),
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

export const composition = { Start, Me, Leave };
