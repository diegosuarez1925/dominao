<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { Table } from "../api.ts";
import { confirmAction } from "../dialog.ts";
import { closeTable, leaveTable, rulesDescription, rulesName, startGame, state, swapSeats } from "../session.ts";
import InviteFriends from "./InviteFriends.vue";
import LobbyTable, { type LobbySeat } from "./LobbyTable.vue";
import SeatMenu, { type MenuSeat } from "./SeatMenu.vue";

const props = defineProps<{ table: Table }>();

const isHost = computed(() => props.table.host === state.me?.player);
const mine = computed(() => props.table.seats.find((s) => s.player === state.me?.player)?.position ?? 0);
/** Seats from the guest's own, counter-clockwise; partners face each other. */
const seats = computed<LobbySeat[]>(() =>
  [0, 1, 2, 3].map((offset) => {
    const seat = props.table.seats.find((s) => s.position === (mine.value + offset) % 4);
    if (seat === undefined) return null;
    const notes = [];
    if (offset === 0) notes.push("you");
    else notes.push(offset === 2 ? "partner" : "opponent");
    if (seat.player === props.table.host) notes.push("host");
    return { name: seat.displayName, note: notes.join(" · "), guest: seat.username === null };
  }),
);
const full = computed(() => props.table.seats.length === 4);

// Tapping a player opens their menu (a friend request, and for the host, swapping
// seats). The host picks a seat, then another, and the two swap (either may be empty).
// Seats are only arranged before a game: once it starts they are its turn order.
const running = computed(() => state.game?.status === "ACTIVE" || state.game?.status === "PAUSED");
const canArrange = computed(() => isHost.value && !running.value && props.table.seats.length > 1);
const picked = ref<number | null>(null);
watch(canArrange, (can) => {
  if (!can) picked.value = null;
});
const menuIndex = ref<number | null>(null);
const menuSeat = computed<MenuSeat | null>({
  get() {
    if (menuIndex.value === null) return null;
    const seat = props.table.seats.find((s) => s.position === (mine.value + menuIndex.value!) % 4);
    return seat === undefined ? null : { player: seat.player, name: seat.displayName, username: seat.username, bot: false };
  },
  set(value) {
    if (value === null) menuIndex.value = null;
  },
});
function swapFrom() {
  picked.value = menuIndex.value;
  menuIndex.value = null;
}
async function pick(index: number) {
  if (picked.value === null) {
    if (seats.value[index] !== null) menuIndex.value = index;
    else if (canArrange.value) picked.value = index;
    return;
  }
  const [from, to] = [picked.value, index];
  picked.value = null;
  if (from === to) return;
  await swapSeats((mine.value + from) % 4, (mine.value + to) % 4);
}
const inviteOpen = ref(false);
/** The host of a table with room, who has an account (so friends), can invite them. */
const canInvite = computed(() => isHost.value && state.me?.username !== undefined && !running.value && !full.value);
const canStart = computed(() => isHost.value && full.value && state.game?.status !== "ACTIVE");
const hostName = computed(() => props.table.seats.find((s) => s.player === props.table.host)?.displayName ?? "the host");
const open = computed(() => 4 - props.table.seats.length);
/** What the guest is waiting for, in one line. */
const hint = computed(() => {
  if (picked.value !== null) return "Now pick the seat to swap with. Pick the same seat again to cancel.";
  if (!full.value) return `${canInvite.value ? "Share the code, or invite friends." : "Share the code with your friends."} ${open.value === 1 ? "1 more player" : `${open.value} more players`} needed. You sit across from your partner.`;
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
    <LobbyTable :seats="seats" :pickable="canArrange && !state.busy" tappable :picked="picked" @pick="pick">
      <div class="stack center">
        <span class="table-label">Invite code</span>
        <span class="join-code">{{ table.code }}</span>
        <span class="table-label">{{ full ? "Table full!" : open === 1 ? "1 seat open" : `${open} seats open` }}</span>
      </div>
    </LobbyTable>
    <p class="lobby-hint" role="status">{{ hint }}</p>
    <p v-if="canArrange && picked === null" class="lobby-hint">
      Partners sit across from each other. Tap a player and pick Swap seats to choose the teams.
    </p>
    <p v-else-if="!isHost && !running" class="lobby-hint">Partners sit across from each other. The host can swap seats to choose the teams.</p>
    <div class="lobby-actions">
      <button v-if="canInvite" class="btn btn--secondary" :disabled="state.busy" @click="inviteOpen = true">
        Invite friends
      </button>
      <button v-if="isHost" class="btn" :disabled="!canStart || state.busy" @click="startGame">
        {{ full ? "Start game" : "Waiting for players…" }}
      </button>
      <button class="btn btn--secondary" :disabled="state.busy" @click="leaveTable">Leave table</button>
      <button v-if="isHost" class="btn btn--secondary" :disabled="state.busy" @click="close">Close table</button>
    </div>
    <SeatMenu v-model:seat="menuSeat">
      <button v-if="canArrange" class="btn btn--block btn--secondary" @click="swapFrom">Swap seats</button>
    </SeatMenu>
    <InviteFriends v-model:open="inviteOpen" :table="table" />
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
