import type { Collection, Db } from "mongodb";

interface Key {
  _id: string;
  failures: number;
  firstFailureAt: Date;
  lockedUntil?: Date;
}

/** Failures within WINDOW_MS that lock a key. */
export const LIMIT = 5;
export const WINDOW_MS = 15 * 60 * 1000;
export const LOCKOUT_MS = 15 * 60 * 1000;

export class ThrottlingConcept {
  private readonly keys: Collection<Key>;

  constructor(
    db: Db,
    private readonly clock: () => Date = () => new Date(),
  ) {
    this.keys = db.collection<Key>("throttling.keys");
  }

  /** Counts one more failure for the key, and answers whether that locked it. */
  async fail({ key }: { key: string }) {
    const now = this.clock();
    const windowStart = new Date(now.getTime() - WINDOW_MS);
    // One update, so failures that arrive together are all counted.
    const updated = await this.keys.findOneAndUpdate(
      { _id: key },
      [
        {
          $set: {
            // A new count starts once the window has passed or a lock has run out, but
            // never while the key is locked.
            fresh: {
              $and: [
                { $not: [{ $gt: ["$lockedUntil", now] }] },
                {
                  $or: [
                    { $lt: [{ $ifNull: ["$firstFailureAt", new Date(0)] }, windowStart] },
                    { $ne: [{ $type: "$lockedUntil" }, "missing"] },
                  ],
                },
              ],
            },
          },
        },
        {
          $set: {
            failures: { $cond: ["$fresh", 1, { $add: ["$failures", 1] }] },
            firstFailureAt: { $cond: ["$fresh", now, "$firstFailureAt"] },
            lockedUntil: { $cond: ["$fresh", "$$REMOVE", "$lockedUntil"] },
          },
        },
        {
          $set: {
            lockedUntil: {
              $cond: [{ $gte: ["$failures", LIMIT] }, { $ifNull: ["$lockedUntil", new Date(now.getTime() + LOCKOUT_MS)] }, "$$REMOVE"],
            },
          },
        },
        { $unset: "fresh" },
      ],
      { upsert: true, returnDocument: "after" },
    );
    return { key, locked: updated?.lockedUntil !== undefined && updated.lockedUntil > now };
  }

  /** Forgets the key's failures and lock. */
  async reset({ key }: { key: string }) {
    await this.keys.deleteOne({ _id: key });
    return { key };
  }

  async _locked({ key }: { key: string }) {
    const now = this.clock();
    const found = await this.keys.findOne({ _id: key });
    const left = found?.lockedUntil === undefined ? 0 : found.lockedUntil.getTime() - now.getTime();
    return left > 0 ? { locked: true, secondsLeft: Math.ceil(left / 1000) } : { locked: false, secondsLeft: 0 };
  }
}
