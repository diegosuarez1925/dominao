<script setup lang="ts">
// The game around a table: the board in the middle, the guest at the bottom with their
// hand face up, and the other three counter-clockwise in turn order (the next player on
// the right, the partner across, the one before on the left) with their hands face
// down. The score table folds; the move log is a side bar.
import { computed, ref, watch } from "vue";
import type { Game } from "../api.ts";
import { dismissGame, startGame, state } from "../session.ts";
import GameBoard from "./GameBoard.vue";
import MoveLog from "./MoveLog.vue";
import OpponentSeat from "./OpponentSeat.vue";
import PlayerBadge from "./PlayerBadge.vue";
import PlayerHand from "./PlayerHand.vue";
import ScoreCard from "./ScoreCard.vue";

const props = defineProps<{ game: Game }>();

const me = computed(() => props.game.players.find((p) => p.player === state.me?.session));
const myPosition = computed(() => me.value?.position ?? 0);
const myTeam = computed(() => myPosition.value % 2);
const active = computed(() => props.game.status === "ACTIVE");
const myTurn = computed(() => active.value && props.game.turnPlayer === state.me?.session);

/** The players after the guest in turn order, placed right, top and left. */
const others = computed(() =>
  (["right", "top", "left"] as const).map((side, index) => {
    const offset = index + 1;
    const player = props.game.players.find((p) => p.position === (myPosition.value + offset) % 4);
    return {
      side,
      player,
      note: offset === 2 ? "partner" : "opponent",
      turn: active.value && player?.player === props.game.turnPlayer,
    };
  }),
);

const name = (session: string) => props.game.players.find((p) => p.player === session)?.displayName ?? "?";
const team = (seatOrTeam: number) => (seatOrTeam % 2 === myTeam.value ? "Us" : "Them");

/** How the last match ended, in one line. */
const lastResult = computed(() => {
  const last = props.game.lastResult[0];
  if (last === undefined) return "";
  const how = last.ending === "DOMINO" ? `${name(last.winner)} dominoed` : "Tranque";
  if (last.team === -1) return `Match ${last.matchNumber}: ${how}, a tie. Nobody scores.`;
  const prize = last.prize > 0 ? ` (with a ${last.prize} prize)` : "";
  return `Match ${last.matchNumber}: ${how}. ${team(last.team)} +${last.points}${prize}.`;
});

// When a match ends, its result shows over the board for a few seconds.
const toast = ref("");
let toastTimer: ReturnType<typeof setTimeout> | undefined;
watch(
  () => props.game.lastResult[0]?.matchNumber,
  (match, before) => {
    if (match === undefined || before === undefined || match === before) return;
    toast.value = lastResult.value;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toast.value = ""), 5000);
  },
);

const ending = computed(() => {
  if (props.game.status === "ABANDONED") return { title: "Game stopped", text: "A player left the table." };
  if (props.game.status !== "FINISHED") return null;
  const won = (myTeam.value === 0 ? props.game.scoreA : props.game.scoreB) >= props.game.target;
  return { title: won ? "¡Ganamos!" : "They win this one", text: lastResult.value };
});
const isHost = computed(() => state.table?.host === state.me?.session);
const tableFull = computed(() => state.table?.seats.length === 4);

// Panels stay as the guest left them, on this device.
function remembered(key: string, fallback: boolean) {
  const value = ref(fallback);
  try {
    const saved = localStorage.getItem(key);
    if (saved !== null) value.value = saved === "1";
  } catch {}
  watch(value, (now) => {
    try {
      localStorage.setItem(key, now ? "1" : "0");
    } catch {}
  });
  return value;
}
const scoreOpen = remembered("dominao.scoreOpen", window.innerWidth > 640);
const logOpen = remembered("dominao.logOpen", false);
</script>

<template>
  <section class="game-table">
    <div class="area-score">
      <ScoreCard v-model:open="scoreOpen" :game="game" :my-team="myTeam" :last-result="lastResult" />
    </div>

    <div v-for="seat in others" :key="seat.side" :class="`area-${seat.side}`">
      <OpponentSeat
        v-if="seat.player"
        :side="seat.side"
        :name="seat.player.displayName"
        :note="seat.turn ? 'playing…' : seat.note"
        :tile-count="seat.player.tileCount"
        :active="seat.turn"
      />
    </div>

    <div class="area-board felt">
      <GameBoard :board="game.board" />
      <Transition name="pop">
        <p v-if="toast" class="toast">{{ toast }}</p>
      </Transition>
      <Transition name="pop">
        <div v-if="ending" class="ending">
          <h3 class="panel-title">{{ ending.title }}</h3>
          <p class="panel-text">{{ ending.text }}</p>
          <div class="row ending-actions">
            <button v-if="isHost && tableFull" class="btn" @click="startGame">Play again</button>
            <button class="btn btn--secondary" @click="dismissGame(game.game)">Back to lobby</button>
          </div>
        </div>
      </Transition>
    </div>

    <div class="area-me">
      <PlayerBadge
        :name="me?.displayName ?? state.me?.displayName"
        :note="myTurn ? 'your turn: pick a tile' : 'you'"
        :active="myTurn"
      />
      <PlayerHand :hand="game.hand" :board="game.board" :my-turn="myTurn" />
    </div>

    <MoveLog v-model:open="logOpen" :log="game.log" />
  </section>
</template>

<style scoped>
.game-table {
  display: grid;
  grid-template:
    ". top ." auto
    "left board right" minmax(14rem, 1fr)
    "score me ." auto / minmax(9rem, 1fr) minmax(0, 3.2fr) minmax(9rem, 1fr);
  gap: var(--space-4);
  align-items: center;
}

.area-score {
  grid-area: score;
  align-self: end;
}

.area-top {
  grid-area: top;
  justify-self: center;
}

.area-left {
  grid-area: left;
  justify-self: center;
}

.area-right {
  grid-area: right;
  justify-self: center;
}

.area-board {
  grid-area: board;
  position: relative;
  min-width: 0;
  display: grid;
  place-items: center;
  align-self: stretch;
  min-height: 14rem;
  padding: var(--space-4);
}

.area-me {
  grid-area: me;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
}

.toast {
  position: absolute;
  top: var(--space-3);
  left: 50%;
  translate: -50% 0;
  max-width: 90%;
  margin: 0;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-pill);
  font-weight: 700;
  text-align: center;
  color: var(--color-text);
  background: var(--color-accent-soft);
  box-shadow: var(--shadow-md);
}

.ending {
  position: absolute;
  inset: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  max-width: min(24rem, 90%);
  padding: var(--space-5);
  border-radius: var(--radius-lg);
  text-align: center;
  background: var(--color-surface);
  box-shadow: var(--shadow-md);
}

.ending-actions {
  justify-content: center;
}

/* On tablets the score goes on top and the side players get slimmer columns. */
@media (max-width: 48rem) {
  .game-table {
    grid-template:
      "score score score" auto
      "top top top" auto
      "left board right" minmax(12rem, 1fr)
      "me me me" auto / auto minmax(0, 1fr) auto;
    gap: var(--space-2);
  }

  .area-score {
    justify-self: center;
    width: 100%;
    max-width: 22rem;
  }

  .area-board {
    padding: var(--space-2);
  }
}

/* On phones the board gets the full width: the other three sit in a row above it, in
   the same order as around the table (left, across, right). */
@media (max-width: 34rem) {
  .game-table {
    grid-template:
      "score score score" auto
      "left top right" auto
      "board board board" minmax(10rem, auto)
      "me me me" auto / 1fr 1fr 1fr;
  }

  .area-left,
  .area-top,
  .area-right {
    align-self: start;
  }
}
</style>
