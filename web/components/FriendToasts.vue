<script setup lang="ts">
// Pop-ups at the top of the home screen when a friend request or a game invite comes
// in, or a friend accepts this account's request, so it can be answered right there.
// Each shows until it is answered or closed (closing is remembered on this device), or
// until the account looks at that part of its Friends section.
import { computed, ref } from "vue";
import {
  acceptFriendRequest,
  acceptInvite,
  declineInvite,
  newInvites,
  newlyAccepted,
  newRequests,
  rejectFriendRequest,
  rulesName,
  state,
} from "../session.ts";

const DISMISSED_KEY = "dominao.dismissedToasts";
const dismissed = ref<string[]>([]);
try {
  dismissed.value = JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? "[]");
} catch {}
function dismiss(key: string) {
  dismissed.value = [...dismissed.value, key].slice(-100);
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed.value));
  } catch {}
}

type Toast = {
  key: string;
  at: number;
  username: string;
  text: string;
  kind: "request" | "invite" | "accepted";
  id: string;
};

/** The newest three that are still new and not closed. */
const toasts = computed<Toast[]>(() =>
  [
    ...newRequests().map((row) => ({
      key: `request:${row.request}`,
      at: row.sentAt,
      username: row.username,
      text: "sent you a friend request",
      kind: "request" as const,
      id: row.request,
    })),
    ...newInvites().map((row) => ({
      key: `invite:${row.invite}`,
      at: row.sentAt,
      username: row.username,
      text: `invited you to their table · ${rulesName(row.rules || "DEFAULT")} rules · ${row.seats.length} of 4 seated`,
      kind: "invite" as const,
      id: row.invite,
    })),
    ...newlyAccepted().map((row) => ({
      key: `accepted:${row.player}:${row.since}`,
      at: row.since,
      username: row.username,
      text: "accepted your friend request. You're friends now!",
      kind: "accepted" as const,
      id: row.player,
    })),
  ]
    .filter((toast) => !dismissed.value.includes(toast.key))
    .sort((a, b) => b.at - a.at)
    .slice(0, 3),
);
</script>

<template>
  <div class="toasts" aria-live="polite">
    <TransitionGroup name="toast">
      <div v-for="toast in toasts" :key="toast.key" class="toast" role="status">
        <span class="avatar" aria-hidden="true">{{ toast.username.charAt(0).toUpperCase() }}</span>
        <span class="toast-text">
          <strong>{{ toast.username }}</strong> {{ toast.text }}
        </span>
        <span class="toast-actions">
          <template v-if="toast.kind === 'request'">
            <button class="btn btn--small" :disabled="state.busy" @click="acceptFriendRequest(toast.id)">Accept</button>
            <button class="btn btn--small btn--secondary" :disabled="state.busy" @click="rejectFriendRequest(toast.id)">Reject</button>
          </template>
          <template v-else-if="toast.kind === 'invite'">
            <button class="btn btn--small" :disabled="state.busy" @click="acceptInvite(toast.id)">Join</button>
            <button class="btn btn--small btn--secondary" :disabled="state.busy" @click="declineInvite(toast.id)">Decline</button>
          </template>
        </span>
        <button class="toast-close" :aria-label="`Close the note about ${toast.username}`" @click="dismiss(toast.key)">×</button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
/* Fixed at the top, over the home screen, below any open section or menu. */
.toasts {
  position: fixed;
  z-index: 30;
  top: var(--space-3);
  left: 50%;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  width: min(30rem, calc(100% - 2 * var(--space-4)));
  translate: -50% 0;
  pointer-events: none;
}

.toast {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2) var(--space-3);
  padding: var(--space-3) var(--space-3) var(--space-3) var(--space-3);
  border-left: 5px solid var(--color-accent);
  border-radius: var(--radius-md);
  color: var(--color-text);
  background: var(--color-surface);
  box-shadow: var(--shadow-md);
  pointer-events: auto;
}

.toast-text {
  flex: 1;
  min-width: 10rem;
  line-height: 1.3;
}

.toast-actions {
  display: flex;
  gap: var(--space-2);
  margin-left: auto;
}

.toast-actions:empty {
  display: none;
}

.toast-close {
  align-self: flex-start;
  padding: 0 var(--space-1);
  border: none;
  font-size: 1.4rem;
  line-height: 1;
  color: var(--color-text-muted);
  background: none;
  cursor: pointer;
}

.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.25s,
    transform 0.25s;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-0.75rem);
}

@media (prefers-reduced-motion: reduce) {
  .toast-enter-active,
  .toast-leave-active {
    transition: none;
  }
}
</style>
