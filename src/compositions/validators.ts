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
