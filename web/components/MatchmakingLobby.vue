<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import type { QueueLobby } from "../api.ts";
import { launchQueue, leaveQueue, state } from "../session.ts";
import LobbySeats from "./LobbySeats.vue";

const props = defineProps<{ queue: QueueLobby }>();

const seats = computed(() =>
  [0, 1, 2, 3].map((index) => {
    const entry = props.queue.players[index];
    if (entry === undefined) return null;
    return { name: entry.displayName, tags: entry.player === state.me?.session ? ["you"] : [] };
  }),
);

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
  <section>
    <h2>Looking for players</h2>
    <p v-if="queue.full">Table complete! The game starts in {{ secondsLeft }}…</p>
    <p v-else>
      Waiting for {{ 4 - queue.players.length }} more
      {{ 4 - queue.players.length === 1 ? "player" : "players" }}. Seats and partners are drawn
      at random when the game starts.
    </p>
    <LobbySeats :seats="seats" />
    <button @click="leaveQueue">Leave queue</button>
  </section>
</template>
