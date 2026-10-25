<script setup lang="ts">
import { computed } from "vue";
import type { Table } from "../api.ts";
import { closeTable, leaveTable, startGame, state } from "../session.ts";
import LobbySeats from "./LobbySeats.vue";

const props = defineProps<{ table: Table }>();

const isHost = computed(() => props.table.host === state.me?.session);
const seats = computed(() =>
  [0, 1, 2, 3].map((position) => {
    const seat = props.table.seats.find((s) => s.position === position);
    if (seat === undefined) return null;
    const tags = [];
    if (seat.player === props.table.host) tags.push("host");
    if (seat.player === state.me?.session) tags.push("you");
    return { name: seat.displayName, tags };
  }),
);
// The host can start once all four seats are taken and no game is being played.
const canStart = computed(() => isHost.value && props.table.seats.length === 4 && state.game?.status !== "ACTIVE");
</script>

<template>
  <section>
    <h2>Table {{ table.code }}</h2>
    <p>Share this code with your friends. Seats 0 and 2 are partners, as are 1 and 3.</p>
    <LobbySeats :seats="seats" />
    <button v-if="canStart" @click="startGame">Start game</button>
    <button @click="leaveTable">Leave table</button>
    <button v-if="isHost" @click="closeTable">Close table</button>
  </section>
</template>
