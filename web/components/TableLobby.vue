<script setup lang="ts">
import { computed } from "vue";
import type { Table } from "../api.ts";
import { closeTable, leaveTable, rulesDescription, rulesName, startGame, state } from "../session.ts";
import LobbyTable, { type LobbySeat } from "./LobbyTable.vue";

const props = defineProps<{ table: Table }>();

const isHost = computed(() => props.table.host === state.me?.session);
const mine = computed(() => props.table.seats.find((s) => s.player === state.me?.session)?.position ?? 0);
/** Seats from the guest's own, counter-clockwise; partners face each other. */
const seats = computed<LobbySeat[]>(() =>
  [0, 1, 2, 3].map((offset) => {
    const seat = props.table.seats.find((s) => s.position === (mine.value + offset) % 4);
    if (seat === undefined) return null;
    const notes = [];
    if (offset === 0) notes.push("you");
    else notes.push(offset === 2 ? "partner" : "opponent");
    if (seat.player === props.table.host) notes.push("host");
    return { name: seat.displayName, note: notes.join(" · ") };
  }),
);
const full = computed(() => props.table.seats.length === 4);
const canStart = computed(() => isHost.value && full.value && state.game?.status !== "ACTIVE");
</script>

<template>
  <section class="lobby">
    <header class="lobby-header">
      <h2 class="screen-title">Private table</h2>
      <p class="screen-subtitle">
        <strong>{{ rulesName(table.rules || "DEFAULT") }} rules.</strong> {{ rulesDescription(table.rules || "DEFAULT") }}
      </p>
    </header>
    <LobbyTable :seats="seats">
      <div class="stack center">
        <span class="table-label">Join code</span>
        <span class="join-code">{{ table.code }}</span>
        <span class="table-label">{{ full ? "Table full!" : 4 - table.seats.length === 1 ? "1 seat open" : `${4 - table.seats.length} seats open` }}</span>
      </div>
    </LobbyTable>
    <p class="lobby-hint">Share the code with your friends. You sit across from your partner.</p>
    <div class="lobby-actions">
      <button v-if="isHost" class="btn" :disabled="!canStart" @click="startGame">
        {{ full ? "Start game" : "Waiting for players…" }}
      </button>
      <button class="btn btn--secondary" @click="leaveTable">Leave table</button>
      <button v-if="isHost" class="btn btn--secondary" @click="closeTable">Close table</button>
    </div>
  </section>
</template>

<style scoped>
.join-code {
  font: 400 clamp(1.4rem, 5vw, 2rem) var(--font-display);
  letter-spacing: 0.08em;
  color: var(--white);
}

.center {
  align-items: center;
  gap: var(--space-1);
}
</style>
