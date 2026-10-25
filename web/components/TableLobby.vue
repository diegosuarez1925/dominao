<script setup lang="ts">
import { computed } from "vue";
import type { Table } from "../api.ts";
import { confirmAction } from "../dialog.ts";
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
const hostName = computed(() => props.table.seats.find((s) => s.player === props.table.host)?.displayName ?? "the host");
const open = computed(() => 4 - props.table.seats.length);
/** What the guest is waiting for, in one line. */
const hint = computed(() => {
  if (!full.value) return `Share the code with your friends. ${open.value === 1 ? "1 more player" : `${open.value} more players`} needed. You sit across from your partner.`;
  return isHost.value ? "Everyone's here. Start when you're ready." : `Everyone's here. Waiting for ${hostName.value} to start.`;
});

async function close() {
  const yes = await confirmAction({
    title: "Close this table?",
    text: "Everyone at it goes back to the home screen, and its code stops working.",
    confirm: "Close table",
  });
  if (yes) await closeTable();
}
</script>

<template>
  <section class="lobby">
    <header class="lobby-header">
      <h2 class="screen-title">Your private table</h2>
      <p class="screen-subtitle">
        <strong>{{ rulesName(table.rules || "DEFAULT") }} rules.</strong> {{ rulesDescription(table.rules || "DEFAULT") }}
      </p>
    </header>
    <LobbyTable :seats="seats">
      <div class="stack center">
        <span class="table-label">Invite code</span>
        <span class="join-code">{{ table.code }}</span>
        <span class="table-label">{{ full ? "Table full!" : open === 1 ? "1 seat open" : `${open} seats open` }}</span>
      </div>
    </LobbyTable>
    <p class="lobby-hint" role="status">{{ hint }}</p>
    <div class="lobby-actions">
      <button v-if="isHost" class="btn" :disabled="!canStart || state.busy" @click="startGame">
        {{ full ? "Start game" : "Waiting for players…" }}
      </button>
      <button class="btn btn--secondary" :disabled="state.busy" @click="leaveTable">Leave table</button>
      <button v-if="isHost" class="btn btn--secondary" :disabled="state.busy" @click="close">Close table</button>
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
