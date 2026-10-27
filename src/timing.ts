/**
 * How long the app waits before it acts for someone who is not there. The ticker uses
 * these to decide when to ask, and the endpoints it calls check them again, so asking
 * early does nothing. This module holds no declarations, so assembly never walks it.
 */

/** How long an empty seat waits for a person before a bot takes it. */
export const BOT_AFTER_MS = 30_000;

/** How long a bot "thinks" before it plays, so people can follow its moves. */
export const BOT_MOVE_MS = 1_500;

/**
 * How long a player can go unseen before they are taken out of their game, which
 * pauses it as if they had left. An open page checks in every two seconds, so this
 * only happens when their page is closed or their connection is gone.
 */
export const ABSENT_MS = 45_000;

/** How often the server looks for empty seats, bots' turns and absent players. */
export const TICK_MS = 1_000;
