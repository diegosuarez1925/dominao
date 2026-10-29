<script lang="ts">
/** Games this tab already said "you took over" for, so it is said once. */
const welcomed = new Set<string>();
</script>

<script setup lang="ts">
// The game around a table: the board in the middle, the guest at the bottom with their
// hand face up, and the other three counter-clockwise in turn order (the next player on
// the right, the partner across, the one before on the left) with their hands face
// down. The score table folds; the move log is a side bar.
//
// When someone gets up, the game pauses: their seat shows as empty with a countdown to
// the bot that will take it, and a card over the board says what is being waited for.
// Short notes pop up when someone leaves, sits down, a bot takes over, or a player
// whose connection seemed lost comes back.
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
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

const me = computed(() => props.game.players.find((p) => p.player === state.me?.player));
const myPosition = computed(() => me.value?.position ?? 0);
const myTeam = computed(() => myPosition.value % 2);
const active = computed(() => props.game.status === "ACTIVE");
const paused = computed(() => props.game.status === "PAUSED");
const myTurn = computed(() => active.value && props.game.turnPlayer === state.me?.player);

// The server's times (how long a seat has been empty, how long since someone checked
// in) are as of the last refresh; between refreshes the page keeps counting.
/** A player not heard from for this long is shown as reconnecting. */
const AWAY_MS = 7000;
const now = ref(Date.now());
let receivedAt = Date.now();
watch(
  () => props.game,
  () => {
    receivedAt = Date.now();
    now.value = receivedAt;
  },
);
const clock = setInterval(() => (now.value = Date.now()), 250);
onBeforeUnmount(() => clearInterval(clock));
const sinceRefresh = computed(() => Math.max(0, now.value - receivedAt));

type Player = Game["players"][number];
const playerName = (p: Player | undefined) => p?.displayName ?? p?.botName ?? undefined;
const isAway = (p: Player | undefined) => p?.idleMs != null && p.idleMs + sinceRefresh.value > AWAY_MS;
const vacancyAt = (position: number) => props.game.vacancies.find((v) => v.position === position);
/** Whole seconds until a bot takes the empty seat at this position. */
const botIn = (position: number) => {
  const vacancy = vacancyAt(position);
  if (vacancy === undefined) return 0;
  return Math.max(0, Math.ceil((props.game.botAfterMs - vacancy.vacantMs - sinceRefresh.value) / 1000));
};
const leaverName = (vacancy: Game["vacancies"][number] | undefined) => vacancy?.displayName ?? vacancy?.botName ?? "A player";

/** What a seat says under its name. */
function seatNote(player: Player, turn: boolean, fallback: string) {
  if (player.player === "") {
    const seconds = botIn(player.position);
    return seconds > 0 ? `empty · bot in ${seconds}s` : "empty · bot sitting down…";
  }
  if (isAway(player)) return "reconnecting…";
  if (turn) return player.botName !== null ? "bot thinking…" : "playing…";
  return fallback;
}

/** The players after the guest in turn order, placed right, top and left. */
const others = computed(() =>
  (["right", "top", "left"] as const).map((side, index) => {
    const offset = index + 1;
    const player = props.game.players.find((p) => p.position === (myPosition.value + offset) % 4);
    const turn = active.value && player !== undefined && player.player === props.game.turnPlayer;
    return {
      side,
      player,
      name: player?.player === "" ? `${leaverName(vacancyAt(player.position))}'s seat` : playerName(player),
      note: player === undefined ? "" : seatNote(player, turn, offset === 2 ? "partner" : "opponent"),
      turn,
    };
  }),
);

/** Anyone who held a seat in this game, by name: a guest, a bot, or someone who left. */
function name(session: string) {
  const seated = playerName(props.game.players.find((p) => p.player === session));
  if (seated !== undefined) return seated;
  const turn = [...props.game.log].reverse().find((t) => t.player === session);
  return turn?.displayName ?? turn?.botName ?? "?";
}
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
    .map((p) => playerName(p) ?? "empty seat")
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

// Notes about who comes and goes, a few seconds each.
const notes = ref<{ id: number; text: string; kind: "left" | "sat" | "bot" | "back" | "welcome" }[]>([]);
let noteId = 0;
function note(text: string, kind: (typeof notes.value)[number]["kind"]) {
  const id = ++noteId;
  notes.value = [...notes.value, { id, text, kind }].slice(-3);
  setTimeout(() => (notes.value = notes.value.filter((n) => n.id !== id)), 5000);
}
const ordered = () => [...props.game.log].sort((a, b) => a.turn - b.turn);
const who = (turn: Game["log"][number]) => (turn.player === state.me?.player ? "You" : (turn.displayName ?? turn.botName ?? "Someone"));
watch(
  () => props.game.log.length,
  (length, before) => {
    if (before === undefined || length <= before) return;
    const log = ordered();
    for (const [index, turn] of log.entries()) {
      if (index < before || turn.player === state.me?.player) continue;
      if (turn.move === "LEFT" && turn.botName === null) note(`${who(turn)} left the table. The game is paused until someone takes the seat.`, "left");
      if (turn.move === "SAT") {
        const left = log.slice(0, index).reverse().find((t) => t.move === "LEFT");
        const seat =
          left === undefined ? "the empty seat" : left.player === state.me?.player ? "your old seat" : `${who(left)}'s seat`;
        if (turn.botName !== null) note(`${turn.botName} (a bot) took ${seat} and plays for now.`, "bot");
        else if (left?.botName != null) note(`${who(turn)} took over from ${left.botName}.`, "sat");
        else note(`${who(turn)} sat down in ${seat}. Play goes on.`, "sat");
      }
    }
  },
);
// A player who seemed to have lost their connection and is back.
const away = new Set<string>();
watch(
  () => props.game.players.map((p) => [p.player, isAway(p)] as const),
  (seats) => {
    for (const [player, gone] of seats) {
      if (player === "" || player === state.me?.player) continue;
      if (gone) away.add(player);
      else if (away.delete(player)) note(`${name(player)} is back.`, "back");
    }
    for (const player of away) if (!seats.some(([p]) => p === player)) away.delete(player);
  },
);
// Arriving in a game already being played: say whose seat this is.
onMounted(() => {
  const log = ordered();
  const mine = log.findLastIndex((t) => t.move === "SAT" && t.player === state.me?.player);
  if (mine === -1 || welcomed.has(props.game.game)) return;
  welcomed.add(props.game.game);
  const left = log.slice(0, mine).reverse().find((t) => t.move === "LEFT");
  const whose = left === undefined ? "an empty seat" : `${left.displayName ?? left.botName ?? "someone"}'s seat`;
  note(`You took over ${whose} mid-game: these are their tiles, and their team's score is yours.`, "welcome");
});

const ending = computed(() => {
  if (props.game.status === "ABANDONED") return { title: "Game stopped", text: "The table was closed before anyone won." };
  if (props.game.status !== "FINISHED") return null;
  const won = (myTeam.value === 0 ? props.game.scoreA : props.game.scoreB) >= props.game.target;
  return { title: won ? "¡Ganamos!" : "They win this one", text: lastResult.value };
});
const isHost = computed(() => state.table?.host === state.me?.player);
const turnName = computed(() => (active.value ? name(props.game.turnPlayer) : ""));
const myNote = computed(() => {
  if (myTurn.value) return "your turn: pick a tile";
  if (active.value) return `waiting for ${turnName.value}`;
  if (paused.value) return "game paused";
  return "you";
});

/** What the paused game waits for, seat by seat. */
const waits = computed(() =>
  props.game.vacancies.map((vacancy) => {
    const seconds = botIn(vacancy.position);
    return {
      position: vacancy.position,
      text: `${leaverName(vacancy)} left.`,
      seconds,
      // How much of the wait is left, for the bar.
      share: Math.min(1, (seconds * 1000) / props.game.botAfterMs),
    };
  }),
);
const isPublic = computed(() => props.game.publicRules !== null);

/** Leaving pauses the game for the other three, so it is asked first. */
async function leaveGame() {
  const seconds = Math.round(props.game.botAfterMs / 1000);
  const yes = await confirmAction({
    title: "Leave this game?",
    text: isPublic.value
      ? `The game pauses for the other three until a stranger takes your seat. If nobody does within ${seconds} seconds, a bot plays it.`
      : `The game pauses for the other three until someone takes your seat. If nobody does within ${seconds} seconds, a bot plays it. While your seat is open, you can come back with the table code.`,
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
      <ScoreCard v-model:open="scoreOpen" :game="game" :my-team="myTeam" :hold="!!celebrating" />
    </div>

    <div v-for="seat in others" :key="seat.side" :class="`area-${seat.side}`">
      <OpponentSeat
        v-if="seat.player"
        :side="seat.side"
        :name="seat.name ?? '?'"
        :note="seat.note"
        :tile-count="seat.player.tileCount"
        :active="seat.turn"
        :passed="passing.has(seat.player.player)"
        :bot="seat.player.botName !== null"
        :away="isAway(seat.player)"
        :empty="seat.player.player === ''"
      />
    </div>

    <div class="area-board felt">
      <GameBoard :board="game.board" />
      <TransitionGroup tag="div" name="note" class="notes" aria-live="polite">
        <p v-for="n in notes" :key="n.id" class="note" :class="`note--${n.kind}`">{{ n.text }}</p>
      </TransitionGroup>
      <Transition name="pop">
        <div v-if="paused" class="ending paused" role="status">
          <h3 class="panel-title">Game paused</h3>
          <ul class="waits">
            <li v-for="wait in waits" :key="wait.position" class="wait">
              <span>
                {{ wait.text }}
                <strong v-if="wait.seconds > 0">A bot takes the seat in {{ wait.seconds }}s.</strong>
                <strong v-else>A bot is sitting down…</strong>
              </span>
              <span class="wait-bar" aria-hidden="true"><span :style="{ transform: `scaleX(${wait.share})` }" /></span>
            </li>
          </ul>
          <p v-if="isPublic" class="panel-text">
            Looking for a player who chose {{ game.rules.toLowerCase() }} rules and is OK joining a game in progress.
          </p>
          <p v-else-if="state.table" class="panel-text">
            Share the code <strong class="code">{{ state.table.code }}</strong> and a friend can take over the seat, tiles and all.
          </p>
        </div>
      </Transition>
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
        :note="myNote"
        :active="myTurn"
        :passed="passing.has(state.me?.player ?? '')"
      />
      <PlayerHand :hand="game.hand" :board="game.board" :my-turn="myTurn" />
    </div>

    <MoveLog v-model:open="logOpen" :log="game.log" />

    <div v-if="active || paused" class="area-leave">
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

/* The paused card says what the game waits for, seat by seat. */
.paused {
  color: var(--color-text);
  max-width: min(26rem, 92%);
  gap: var(--space-2);
  padding: var(--space-4);
}

.waits {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  width: 100%;
  margin: 0;
  padding: 0;
  list-style: none;
}

.wait {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.wait-bar {
  height: 0.35rem;
  border-radius: var(--radius-pill);
  overflow: hidden;
  background: var(--line);
}

.wait-bar span {
  display: block;
  height: 100%;
  background: var(--color-primary);
  transform-origin: left;
  transition: transform 0.25s linear;
}

.code {
  font-family: var(--font-mono, monospace);
  letter-spacing: 0.12em;
}

/* Notes about who comes and goes, stacked at the top of the screen. */
.notes {
  position: fixed;
  z-index: 30;
  top: var(--space-3);
  left: 50%;
  translate: -50% 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  width: min(26rem, 92%);
  pointer-events: none;
}

.note {
  margin: 0;
  padding: var(--space-2) var(--space-3);
  border-left: 4px solid var(--color-accent);
  border-radius: var(--radius-sm);
  font-size: 0.9rem;
  color: var(--color-text);
  background: var(--color-surface);
  box-shadow: var(--shadow-md);
}

.note--left {
  border-left-color: #f2b84b;
}

.note--bot {
  border-left-color: #5d6b78;
}

.note--sat,
.note--back,
.note--welcome {
  border-left-color: #4f9d69;
}

.note-enter-active,
.note-leave-active {
  transition:
    opacity 0.3s,
    transform 0.3s;
}

.note-enter-from,
.note-leave-to {
  opacity: 0;
  transform: translateY(-0.5rem);
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
