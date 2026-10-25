<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import type { QueueLobby } from "../api.ts";
import { launchQueue, leaveQueue, rulesDescription, rulesName, state } from "../session.ts";
import LobbyTable, { type LobbySeat } from "./LobbyTable.vue";

const props = defineProps<{ queue: QueueLobby }>();

/** The guest at the bottom, then the others in the order they arrived. */
const seats = computed<LobbySeat[]>(() => {
  const players = props.queue.players;
  const mine = Math.max(0, players.findIndex((p) => p.player === state.me?.session));
  return [0, 1, 2, 3].map((offset) => {
    const entry = players[(mine + offset) % 4];
    if (entry === undefined) return null;
    return { name: entry.displayName, note: offset === 0 ? "you" : undefined };
  });
});

// The server says how many seconds are left each time the page refreshes; between
// refreshes the page counts down on its own so the number moves every second.
const secondsLeft = ref(props.queue.secondsLeft);
let deadline = Date.now() + props.queue.secondsLeft * 1000;
watch(
  () => [props.queue.full, props.queue.secondsLeft] as const,
  ([full, seconds]) => {
    deadline = Date.now() + seconds * 1000;
    secondsLeft.value = full ? seconds : 0;
  },
);
let asked = false;
const timer = setInterval(() => {
  if (!props.queue.full) {
    asked = false;
    return;
  }
  secondsLeft.value = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  // At zero, ask the server to start the game (and again now and then, in case the
  // clocks disagree and it said "not yet").
  if (secondsLeft.value === 0 && !asked) {
    asked = true;
    launchQueue().finally(() => setTimeout(() => (asked = false), 1000));
  }
}, 250);
onBeforeUnmount(() => clearInterval(timer));
</script>

<template>
  <section class="lobby">
    <header class="lobby-header">
      <h2 class="screen-title">Looking for players</h2>
      <p class="screen-subtitle">
        <strong>{{ rulesName(queue.rules) }} rules.</strong> {{ rulesDescription(queue.rules) }}
      </p>
    </header>
    <LobbyTable :seats="seats">
      <div v-if="queue.full" class="stack center">
        <span class="table-label">Table complete!</span>
        <Transition name="pop" mode="out-in">
          <span :key="secondsLeft" class="countdown">{{ secondsLeft }}</span>
        </Transition>
        <span class="table-label">Game starts soon</span>
      </div>
      <div v-else class="stack center">
        <span class="spinner" aria-hidden="true" />
        <span class="table-label">
          Waiting for {{ 4 - queue.players.length }} more {{ 4 - queue.players.length === 1 ? "player" : "players" }}
        </span>
      </div>
    </LobbyTable>
    <p class="lobby-hint">Seats and partners are drawn at random when the game starts.</p>
    <div class="lobby-actions">
      <button class="btn btn--secondary" @click="leaveQueue">Leave queue</button>
    </div>
  </section>
</template>

<style scoped>
.center {
  align-items: center;
  gap: var(--space-2);
}

.countdown {
  font: 400 clamp(2.5rem, 9vw, 4rem) / 1 var(--font-display);
  color: var(--white);
}
</style>
