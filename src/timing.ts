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

/**
 * How long someone sitting at a table with no game yet, or waiting for strangers, can
 * go unseen before they are taken out as if they had left. Longer than in a game:
 * nobody is kept waiting yet, and a browser may slow a background tab's check-ins to
 * about once a minute, so someone who only switched tabs must not be taken out. An
 * open page that sits idle still checks in by itself, so only a closed (or offline)
 * page reaches this.
 */
export const AWAY_BEFORE_GAME_MS = 2 * 60_000;

/** How long a guest's session lasts unused before the guest must start again. */
export const GUEST_SESSION_MS = 12 * 60 * 60 * 1000;

/** How often the server looks for empty seats, bots' turns and absent players. */
export const TICK_MS = 1_000;
