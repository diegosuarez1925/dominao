<script setup lang="ts">
import { computed } from "vue";
import type { Table } from "../api.ts";
import { closeTable, leaveTable, startGame, state } from "../session.ts";

const props = defineProps<{ table: Table }>();

const isHost = computed(() => props.table.host === state.me?.session);
const seats = computed(() => [0, 1, 2, 3].map((position) => props.table.seats.find((s) => s.position === position)));
// The host can start once all four seats are taken and no game is being played.
const canStart = computed(() => isHost.value && props.table.seats.length === 4 && state.game?.status !== "ACTIVE");
</script>

<template>
  <section>
    <h2>Table {{ table.code }}</h2>
    <p>Share this code with your friends. Seats 0 and 2 are partners, as are 1 and 3.</p>
    <ol start="0">
      <li v-for="(seat, position) in seats" :key="position">
        <template v-if="seat">
          {{ seat.displayName }}<template v-if="seat.player === table.host"> (host)</template
          ><template v-if="seat.player === state.me?.session"> (you)</template>
        </template>
        <template v-else>(empty)</template>
      </li>
    </ol>
    <button v-if="canStart" @click="startGame">Start game</button>
    <button @click="leaveTable">Leave table</button>
    <button v-if="isHost" @click="closeTable">Close table</button>
  </section>
</template>
