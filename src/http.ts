import { httpPolicy } from "@mit-sdg/sync-engine-http/policy";

export const policy = httpPolicy({
  basePath: "/api",
  publicErrors: {
    INVALID_NAME: "INVALID_REQUEST",
    TOKEN_IN_USE: "CONFLICT",
    UNKNOWN_SESSION: "UNAUTHORIZED",
    ALREADY_SEATED: "CONFLICT",
    CODE_IN_USE: "CONFLICT",
    TABLE_FULL: "CONFLICT",
    NO_SUCH_TABLE: "NOT_FOUND",
    NOT_SEATED: "NOT_FOUND",
    NOT_HOST: "FORBIDDEN",
  },
});
