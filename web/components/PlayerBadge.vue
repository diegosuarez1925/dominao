<script setup lang="ts">
// A player at the table: their initial in a circle, their name, and a note such as
// "you" or "partner". The player whose turn it is glows. An empty seat shows a dashed
// circle instead.
defineProps<{ name?: string; note?: string; active?: boolean; stacked?: boolean }>();
</script>

<template>
  <div class="badge" :class="{ active, stacked, empty: !name }">
    <span class="avatar badge-avatar" aria-hidden="true">{{ name ? name.charAt(0).toUpperCase() : "?" }}</span>
    <span class="badge-text">
      <span class="badge-name">{{ name ?? "Waiting…" }}</span>
      <span v-if="note" class="badge-note">{{ note }}</span>
    </span>
  </div>
</template>

<style scoped>
.badge {
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

@media (prefers-reduced-motion: reduce) {
  .active {
    animation: none;
  }
}
</style>
