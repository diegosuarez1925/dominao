<script setup lang="ts">
// The game around a table: the board in the middle, the guest at the bottom with their
// hand face up, and the other three counter-clockwise in turn order (the next player on
// the right, the partner across, the one before on the left) with their hands face
// down. The score table folds; the move log is a side bar.
import { computed, ref, watch } from "vue";
import type { Game } from "../api.ts";
import { confirmAction } from "../dialog.ts";
import { dismissGame, leaveTable, startGame, state } from "../session.ts";
import GameBoard from "./GameBoard.vue";
import MatchCelebration from "./MatchCelebration.vue";
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
  const how =
    last.special === "CAPICU"
      ? `Capicú by ${name(last.winner)}`
      : last.special === "CHUCHAZO"
        ? `Chuchazo by ${name(last.winner)}`
        : last.ending === "DOMINO"
          ? `${name(last.winner)} dominoed`
          : "Tranque";
  if (last.team === -1) return `Match ${last.matchNumber}: ${how}, a tie. Nobody scores.`;
  const extra = last.prize + last.bonus;
  const prize = extra > 0 ? ` (${extra} of it prizes and bonuses)` : "";
  return `Match ${last.matchNumber}: ${how}. ${team(last.team)} +${last.points}${prize}.`;
});

// When a match ends while the guest watches, it is celebrated. (Opening the page on a
// game whose match ended earlier does not replay it.)
const celebrating = ref<Game["lastResult"][number] | null>(null);
watch(
  () => props.game.lastResult[0]?.matchNumber,
  (match, before) => {
    if (match === undefined || match === before) return;
    celebrating.value = props.game.lastResult[0];
  },
);
const teamNames = (team: number) =>
  props.game.players
    .filter((p) => p.position % 2 === team)
    .map((p) => p.displayName)
    .join(" & ");

// Players who could not play just now say "¡Paso!" for a moment. Skips arrive with the
// log, sometimes several at once.
const passing = ref(new Set<string>());
watch(
  () => props.game.log.length,
  (length, before) => {
    if (before === undefined || length <= before) return;
    const fresh = [...props.game.log]
      .sort((a, b) => a.turn - b.turn)
      .slice(before)
      .filter((turn) => turn.move === "SKIPPED");
    for (const [index, turn] of fresh.entries()) {
      // One after another, in turn order.
      setTimeout(() => {
        passing.value = new Set([...passing.value, turn.player]);
        setTimeout(() => {
          const rest = new Set(passing.value);
          rest.delete(turn.player);
          passing.value = rest;
        }, 1600);
      }, index * 500);
    }
  },
);

const ending = computed(() => {
  if (props.game.status === "ABANDONED") return { title: "Game stopped", text: "A player left the table." };
  if (props.game.status !== "FINISHED") return null;
  const won = (myTeam.value === 0 ? props.game.scoreA : props.game.scoreB) >= props.game.target;
  return { title: won ? "¡Ganamos!" : "They win this one", text: lastResult.value };
});
const isHost = computed(() => state.table?.host === state.me?.session);
const turnName = computed(() => (active.value ? name(props.game.turnPlayer) : ""));

/** Leaving stops the game for all four, so it is asked first. */
async function leaveGame() {
  const yes = await confirmAction({
    title: "Leave this game?",
    text: "You'll leave the table, and the game stops for all four players. The score isn't kept.",
    confirm: "Leave game",
  });
  if (yes) await leaveTable();
}
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
      <ScoreCard v-model:open="scoreOpen" :game="game" :my-team="myTeam" :last-result="lastResult" :hold="!!celebrating" />
    </div>

    <div v-for="seat in others" :key="seat.side" :class="`area-${seat.side}`">
      <OpponentSeat
        v-if="seat.player"
        :side="seat.side"
        :name="seat.player.displayName"
        :note="seat.turn ? 'playing…' : seat.note"
        :tile-count="seat.player.tileCount"
        :active="seat.turn"
        :passed="passing.has(seat.player.player)"
      />
    </div>

    <div class="area-board felt">
      <GameBoard :board="game.board" />
      <Transition name="pop">
        <div v-if="ending && !celebrating" class="ending">
          <h3 class="panel-title">{{ ending.title }}</h3>
          <p class="panel-text">{{ ending.text }}</p>
          <div class="row ending-actions">
            <button v-if="isHost && tableFull" class="btn" :disabled="state.busy" @click="startGame">Play again</button>
            <p v-else-if="tableFull" class="panel-text">The host can start another game.</p>
            <button class="btn btn--secondary" @click="dismissGame(game.game)">Back to lobby</button>
          </div>
        </div>
      </Transition>
    </div>

    <div class="area-me">
      <PlayerBadge
        :name="me?.displayName ?? state.me?.displayName"
        :note="myTurn ? 'your turn: pick a tile' : active ? `waiting for ${turnName}` : 'you'"
        :active="myTurn"
        :passed="passing.has(state.me?.session ?? '')"
      />
      <PlayerHand :hand="game.hand" :board="game.board" :my-turn="myTurn" />
    </div>

    <MoveLog v-model:open="logOpen" :log="game.log" />

    <div v-if="active" class="area-leave">
      <button class="btn btn--ghost btn--small" :disabled="state.busy" @click="leaveGame">Leave game</button>
    </div>

    <Transition name="pop">
      <MatchCelebration
        v-if="celebrating"
        :key="celebrating.matchNumber"
        :result="celebrating"
        :winner-name="name(celebrating.winner)"
        :ours="celebrating.team === myTeam"
        :team-names="celebrating.team === -1 ? '' : teamNames(celebrating.team)"
        @done="celebrating = null"
      />
    </Transition>
  </section>
</template>

<style scoped>
.game-table {
  display: grid;
  grid-template:
    ". top ." auto
    "left board right" minmax(14rem, 1fr)
    "score me leave" auto / minmax(9rem, 1fr) minmax(0, 3.2fr) minmax(9rem, 1fr);
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

.area-leave {
  grid-area: leave;
  align-self: end;
  justify-self: end;
}

.area-me {
  grid-area: me;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
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
      "me me me" auto
      "leave leave leave" auto / auto minmax(0, 1fr) auto;
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

  .area-leave {
    justify-self: center;
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
      "me me me" auto
      "leave leave leave" auto / 1fr 1fr 1fr;
  }

  .area-left,
  .area-top,
  .area-right {
    align-self: start;
  }
}
</style>
