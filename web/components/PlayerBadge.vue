<script setup lang="ts">
// A player at the table: their initial in a circle, their name, and a note such as
// "you" or "partner". The player whose turn it is glows. An empty seat shows a dashed
// circle instead. A player who just passed shakes and says so in a bubble. A bot gets a
// robot face and a BOT tag; a player whose connection seems lost is faded, with a
// pulsing dot. A guest gets a GUEST tag, so nobody tries to befriend them. With
// `clickable` the badge is a button, which opens the player's little menu.
defineProps<{
  name?: string;
  note?: string;
  active?: boolean;
  stacked?: boolean;
  passed?: boolean;
  bot?: boolean;
  guest?: boolean;
  away?: boolean;
  empty?: boolean;
  clickable?: boolean;
}>();
</script>

<template>
  <component
    :is="clickable ? 'button' : 'div'"
    class="badge"
    :class="{ active, stacked, passed, bot, away, clickable, empty: empty || !name }"
    :type="clickable ? 'button' : undefined"
  >
    <Transition name="pop">
      <span v-if="passed" class="pass-bubble" role="status">¡Paso!</span>
    </Transition>
    <span class="avatar badge-avatar" aria-hidden="true">
      <svg v-if="bot" class="bot-face" viewBox="0 0 24 24">
        <line x1="12" y1="2.5" x2="12" y2="6" />
        <circle cx="12" cy="2.5" r="1.4" class="fill" />
        <rect x="4" y="6" width="16" height="13" rx="3.5" />
        <circle cx="9" cy="12" r="1.8" class="fill" />
        <circle cx="15" cy="12" r="1.8" class="fill" />
        <line x1="9" y1="16" x2="15" y2="16" />
      </svg>
      <template v-else>{{ name && !empty ? name.charAt(0).toUpperCase() : "?" }}</template>
    </span>
    <span class="badge-text">
      <span class="badge-name">
        {{ name ?? "Waiting…" }}
        <span v-if="bot" class="bot-tag">bot</span>
        <span v-else-if="guest" class="bot-tag guest-tag">guest</span>
      </span>
      <span v-if="note" class="badge-note">
        <span v-if="away" class="away-dot" aria-hidden="true" />
        {{ note }}
      </span>
    </span>
  </component>
</template>

<style scoped>
.badge {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  max-width: 100%;
  padding: var(--space-1) var(--space-3) var(--space-1) var(--space-1);
  border-radius: var(--radius-pill);
  color: var(--white);
  background: rgb(0 0 0 / 0.25);
  transition:
    box-shadow 0.3s,
    background-color 0.3s;
}

.badge-avatar {
  width: 2.5rem;
  height: 2.5rem;
  font-size: 1.1rem;
}

.badge-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.15;
}

.badge-name {
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.badge-note {
  font-size: 0.75rem;
  opacity: 0.8;
}

/* Name under the circle, for narrow places such as the sides of the game table. */
.stacked {
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-2);
  border-radius: var(--radius-md);
  text-align: center;
  max-width: 7rem;
}

.stacked .badge-text {
  align-items: center;
  max-width: 100%;
}

.empty .badge-avatar {
  color: rgb(255 255 255 / 0.7);
  background: transparent;
  border: 2px dashed rgb(255 255 255 / 0.6);
}

.empty .badge-name {
  font-weight: 400;
  font-style: italic;
  opacity: 0.8;
}

/* A bot: a steel-grey face and a small tag, so nobody mistakes it for a person. */
.bot .badge-avatar {
  color: var(--white);
  background: #5d6b78;
}

.bot-face {
  width: 1.5rem;
  height: 1.5rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
}

.bot-face .fill {
  fill: currentColor;
  stroke: none;
}

.bot-tag {
  display: inline-block;
  margin-left: 0.2rem;
  padding: 0 0.35rem;
  border-radius: var(--radius-pill);
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  vertical-align: 0.1em;
  color: #22303b;
  background: #c9d3dc;
}

/* A guest: a sand-coloured tag in the same place as a bot's. */
.guest-tag {
  color: #4a3a1c;
  background: #ead9b5;
}

/* A badge that opens the player's menu. */
.clickable {
  border: 0;
  font: inherit;
  text-align: inherit;
  cursor: pointer;
}

.clickable:hover {
  background: rgb(0 0 0 / 0.38);
}

.clickable:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 2px;
}

/* Lost connection: faded, with an amber dot that pulses by the note. */
.away .badge-avatar {
  opacity: 0.45;
}

.away-dot {
  display: inline-block;
  width: 0.45rem;
  height: 0.45rem;
  margin-right: 0.15rem;
  border-radius: 50%;
  background: #f2b84b;
  animation: pulse 1.2s ease-in-out infinite;
}

@keyframes pulse {
  50% {
    opacity: 0.25;
  }
}

/* Whose turn it is: a light-blue ring that breathes. */
.active {
  background: rgb(169 207 226 / 0.25);
  box-shadow: 0 0 0 3px var(--color-accent);
  animation: breathe 1.6s ease-in-out infinite;
}

@keyframes breathe {
  50% {
    box-shadow:
      0 0 0 3px var(--color-accent),
      0 0 18px 4px rgb(169 207 226 / 0.6);
  }
}

/* Passing: a speech bubble over the player and a shake of the head. */
.pass-bubble {
  position: absolute;
  z-index: 2;
  bottom: calc(100% + 0.4rem);
  left: 50%;
  translate: -50% 0;
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-pill);
  font: 400 1rem var(--font-display);
  white-space: nowrap;
  color: var(--color-primary);
  background: var(--white);
  box-shadow: var(--shadow-md);
}

.pass-bubble::after {
  content: "";
  position: absolute;
  top: 100%;
  left: 50%;
  translate: -50% 0;
  border: 0.4rem solid transparent;
  border-top-color: var(--white);
}

.passed .badge-avatar {
  animation: no-no 0.6s ease;
  background: var(--line);
}

@keyframes no-no {
  20%,
  60% {
    transform: rotate(-14deg);
  }
  40%,
  80% {
    transform: rotate(14deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .active,
  .away-dot {
    animation: none;
  }
}
</style>
