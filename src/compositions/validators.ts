/**
 * Runtime checks on request bodies. The generated client types keep the frontend
 * honest; these reject the untyped values a hand-made request can carry. This
 * module holds no declarations, so assembly never walks it.
 */
import type { EndpointValidator } from "@mit-sdg/sync-engine/boundary";

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Accepts an object whose listed fields are all bounded strings. */
export function strings(...fields: string[]): EndpointValidator {
  return (value) =>
    record(value) &&
    fields.every((field) => typeof value[field] === "string" && (value[field] as string).length <= 200)
      ? { ok: true }
      : { ok: false, detail: `${fields.join(", ")} must be strings` };
}

/** Like another validator, but also requires the field to be LEFT or RIGHT. */
export function sides(field: string, rest: EndpointValidator): EndpointValidator {
  return (value) =>
    record(value) && (value[field] === "LEFT" || value[field] === "RIGHT")
      ? rest(value)
      : { ok: false, detail: `${field} must be LEFT or RIGHT` };
}

/** Like another validator, but also requires the listed fields to be whole numbers from 0 to 3 (a seat). */
export function seats(fields: string[], rest: EndpointValidator): EndpointValidator {
  return (value) =>
    record(value) && fields.every((field) => Number.isInteger(value[field]) && (value[field] as number) >= 0 && (value[field] as number) <= 3)
      ? rest(value)
      : { ok: false, detail: `${fields.join(", ")} must be seat numbers from 0 to 3` };
}

/** Like another validator, but also requires the field to be true or false. */
export function flags(field: string, rest: EndpointValidator): EndpointValidator {
  return (value) =>
    record(value) && typeof value[field] === "boolean" ? rest(value) : { ok: false, detail: `${field} must be true or false` };
}

/** Like another validator, but also requires the field to name a part of the Friends section: REQUESTS, INVITES or FRIENDS. */
export function parts(field: string, rest: EndpointValidator): EndpointValidator {
  return (value) =>
    record(value) && (value[field] === "REQUESTS" || value[field] === "INVITES" || value[field] === "FRIENDS")
      ? rest(value)
      : { ok: false, detail: `${field} must be REQUESTS, INVITES or FRIENDS` };
}
