<script setup lang="ts">
// The little menu of a player at the table, opened by tapping who they are: their
// name, whether they are a guest or a bot, and (for an account, to an account) a
// friend request, or where the two already stand. Whatever else the seat offers, such
// as swapping seats for the host, comes in the default slot.
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { acceptFriendRequest, sendFriendRequest, state } from "../session.ts";

export type MenuSeat = { player: string; name: string; username: string | null; bot: boolean };
const seat = defineModel<MenuSeat | null>("seat", { default: null });
const close = ref<HTMLButtonElement | null>(null);
watch(seat, async (now) => {
  if (now === null) return;
  await nextTick();
  close.value?.focus();
});

const isMe = computed(() => seat.value?.player === state.me?.player);
const kind = computed(() => (seat.value?.bot ? "bot" : seat.value?.username === null ? "guest" : "account"));
/** Where this account stands with the player: friends, asked, asked by them (their request), or not yet. */
const standing = computed(() => {
  const player = seat.value?.player;
  const friends = state.friends;
  if (player === undefined || friends === null) return "none";
  if (friends.friends.some((row) => row.player === player)) return "friends";
  if (friends.outgoing.some((row) => row.to === player)) return "asked";
  return friends.incoming.find((row) => row.from === player)?.request ?? "none";
});
// Escape closes it even when the button that had focus went away (it turned into a note).
function onKey(event: KeyboardEvent) {
  if (event.key === "Escape" && seat.value !== null) seat.value = null;
}
window.addEventListener("keydown", onKey);
onBeforeUnmount(() => window.removeEventListener("keydown", onKey));
</script>

<template>
  <Transition name="pop">
    <div v-if="seat" class="seat-backdrop" @click.self="seat = null">
      <section class="panel seat-menu" role="dialog" aria-modal="true" aria-labelledby="seat-menu-name">
        <header class="seat-menu-head">
          <span class="avatar seat-menu-avatar" :class="{ 'seat-menu-avatar--bot': kind === 'bot' }" aria-hidden="true">
            {{ seat.name.charAt(0).toUpperCase() }}
          </span>
          <span class="seat-menu-who">
            <span id="seat-menu-name" class="seat-menu-name">{{ seat.name }}</span>
            <span class="seat-menu-kind">
              <span v-if="isMe">That's you</span>
              <span v-else-if="kind === 'bot'" class="tag tag--bot">Bot</span>
              <span v-else-if="kind === 'guest'" class="tag tag--guest">Guest</span>
              <span v-else>Has an account</span>
            </span>
          </span>
          <button ref="close" class="seat-menu-close" aria-label="Close" @click="seat = null">×</button>
        </header>

        <template v-if="!isMe">
          <p v-if="kind === 'bot'" class="panel-text">A bot plays this seat until a person takes it over.</p>
          <p v-else-if="kind === 'guest'" class="panel-text">Guests can't have friends. They'd need to make an account first.</p>
          <p v-else-if="!state.me?.username" class="panel-text">Make an account to add {{ seat.name }} as a friend.</p>
          <p v-else-if="standing === 'friends'" class="panel-text seat-menu-state">✓ You're friends</p>
          <p v-else-if="standing === 'asked'" class="panel-text seat-menu-state">Friend request sent. Waiting for an answer.</p>
          <button
            v-else-if="standing !== 'none'"
            class="btn btn--block"
            :disabled="state.busy"
            @click="acceptFriendRequest(standing)"
          >
            Accept their friend request
          </button>
          <button v-else class="btn btn--block" :disabled="state.busy" @click="sendFriendRequest(seat.username!)">
            Send friend request
          </button>
        </template>
        <slot />
      </section>
    </div>
  </Transition>
</template>

<style scoped>
.seat-backdrop {
  position: fixed;
  z-index: 40;
  inset: 0;
  display: grid;
  place-items: center;
  padding: var(--gutter);
  background: rgb(40 8 10 / 0.45);
}

.seat-menu {
  width: min(20rem, 100%);
  gap: var(--space-3);
}

.seat-menu-head {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.seat-menu-avatar {
  width: 3rem;
  height: 3rem;
  font: 400 1.3rem/1 var(--font-display);
}

.seat-menu-avatar--bot {
  color: var(--white);
  background: #5d6b78;
}

.seat-menu-who {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  line-height: 1.25;
}

.seat-menu-name {
  overflow: hidden;
  font-weight: 800;
  font-size: 1.1rem;
  text-overflow: ellipsis;
}

.seat-menu-kind {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.tag {
  display: inline-block;
  padding: 0 0.4rem;
  border-radius: var(--radius-pill);
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.tag--bot {
  color: #22303b;
  background: #c9d3dc;
}

.tag--guest {
  color: #4a3a1c;
  background: #ead9b5;
}

.seat-menu-state {
  font-weight: 700;
}

.seat-menu-close {
  align-self: flex-start;
  padding: 0 var(--space-1);
  border: none;
  font-size: 1.6rem;
  line-height: 1;
  color: var(--color-text-muted);
  background: none;
  cursor: pointer;
}
</style>
