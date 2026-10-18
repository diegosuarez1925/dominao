import { httpPolicy } from "@mit-sdg/sync-engine-http/policy";

export const policy = httpPolicy({
  basePath: "/api",
  publicErrors: {
    INVALID_NAME: "INVALID_REQUEST",
    TOKEN_IN_USE: "CONFLICT",
    UNKNOWN_SESSION: "UNAUTHORIZED",
  },
});
