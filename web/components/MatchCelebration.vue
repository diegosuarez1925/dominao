<script setup lang="ts">
// What plays over the table when a match ends: how it ended, which team won, and the
// points it earned, counted up line by line. A Capicú or a Chuchazo gets its own big
// show. Tapping anywhere, or waiting, closes it.
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import type { MatchResult } from "../api.ts";
import { useCountUp } from "../countUp.ts";
import DominoTile from "./DominoTile.vue";

const props = defineProps<{ result: MatchResult; winnerName: string; ours: boolean; teamNames: string }>();
const emit = defineEmits<{ done: [] }>();

const special = computed(() => (props.result.special === "NONE" ? null : props.result.special));
const tie = computed(() => props.result.team === -1);
const title = computed(() => {
  if (special.value === "CAPICU") return "¡Capicú!";
  if (special.value === "CHUCHAZO") return "¡Chuchazo!";
  return props.result.ending === "DOMINO" ? "¡Dominó!" : "¡Tranque!";
});
const subtitle = computed(() => {
  if (tie.value) return "Tied on pips. Nobody scores this match.";
  const how =
    props.result.ending === "TRANQUE"
      ? `${props.winnerName} held the fewest pips`
      : special.value === "CAPICU"
        ? `${props.winnerName} closed it with a tile that fit both ends`
        : special.value === "CHUCHAZO"
          ? `${props.winnerName} went out with the double blank`
          : `${props.winnerName} played their last tile`;
  return how;
});

/** The points, one line each, shown one after another. */
const lines = computed(() => {
  const { points, prize, bonus } = props.result;
  const rows = [{ label: "Pips", value: points - prize - bonus }];
  if (prize > 0) rows.push({ label: `Match ${props.result.matchNumber} prize`, value: prize });
  if (bonus > 0) rows.push({ label: special.value === "CAPICU" ? "Capicú bonus" : "Chuchazo bonus", value: bonus });
  return rows;
});
const shownLines = ref(0);
const total = ref(0);
const totalShown = useCountUp(() => total.value, 700);

// A shower of little dominoes; more of them for the hype endings.
const confetti = computed(() =>
  Array.from({ length: tie.value ? 0 : special.value ? 36 : 14 }, (_, i) => ({
    key: i,
    style: {
      "--x": `${Math.random() * 100}vw`,
      "--delay": `${Math.random() * 0.8}s`,
      "--spin": `${Math.random() * 720 - 360}deg`,
      "--fall": `${2.2 + Math.random() * 1.6}s`,
    },
  })),
);

const timers: ReturnType<typeof setTimeout>[] = [];
onMounted(() => {
  const start = special.value ? 1200 : 700;
  lines.value.forEach((line, index) =>
    timers.push(
      setTimeout(() => {
        shownLines.value = index + 1;
        total.value += line.value;
      }, start + index * 650),
    ),
  );
  const end = start + lines.value.length * 650 + (special.value ? 2600 : 2000);
  timers.push(setTimeout(() => emit("done"), tie.value ? 2800 : end));
});
onBeforeUnmount(() => timers.forEach(clearTimeout));
</script>

<template>
  <div
    class="celebration"
    :class="[special ? `celebration--${special.toLowerCase()}` : '', { 'celebration--tie': tie, 'celebration--theirs': !ours && !tie }]"
    role="status"
    @click="emit('done')"
  >
    <div class="confetti" aria-hidden="true">
      <span v-for="piece in confetti" :key="piece.key" class="confetti-piece" :style="piece.style" />
    </div>
    <div v-if="special" class="rays" aria-hidden="true" />
    <div class="celebration-card">
      <DominoTile v-if="special === 'CHUCHAZO'" :first="0" :second="0" class="slam" />
      <h2 class="celebration-title" :data-text="title">
        <span v-for="(letter, index) in title" :key="index" class="letter" :style="{ '--i': index }">{{ letter }}</span>
      </h2>
      <p class="celebration-winner">
        <template v-if="tie">Match {{ result.matchNumber }}</template>
        <template v-else>
          <strong>{{ ours ? "Us" : "Them" }}</strong> win match {{ result.matchNumber }}
          <span class="celebration-names">{{ teamNames }}</span>
        </template>
      </p>
      <p class="celebration-how">{{ subtitle }}</p>
      <ul v-if="!tie" class="points">
        <TransitionGroup name="pop">
          <li v-for="line in lines.slice(0, shownLines)" :key="line.label" class="points-line">
            <span>{{ line.label }}</span>
            <span>+{{ line.value }}</span>
          </li>
        </TransitionGroup>
      </ul>
      <p v-if="!tie" class="points-total">+{{ totalShown }}</p>
      <p class="celebration-skip">Tap to continue</p>
    </div>
  </div>
</template>

<style scoped>
.celebration {
  position: fixed;
  z-index: 30;
  inset: 0;
  display: grid;
  place-items: center;
  padding: var(--gutter);
  overflow: hidden;
  background: rgb(40 8 10 / 0.6);
  backdrop-filter: blur(3px);
  cursor: pointer;
  animation: fade-in 0.3s ease;
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
}

.celebration-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  width: min(26rem, 100%);
  padding: var(--space-6) var(--space-5) var(--space-4);
  border-top: 6px solid var(--color-accent);
  border-radius: var(--radius-lg);
  text-align: center;
  color: var(--color-text);
  background: var(--color-surface);
  box-shadow: var(--shadow-md);
  animation: rise 0.45s cubic-bezier(0.2, 1.4, 0.4, 1);
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.85);
  }
}

.celebration-title {
  margin: 0;
  font-family: var(--font-display);
  font-weight: 400;
  font-size: clamp(2.2rem, 9vw, 3.4rem);
  line-height: 1;
  color: var(--color-primary);
  white-space: nowrap;
}

/* Letters drop in one after another. */
.letter {
  display: inline-block;
  animation: letter-in 0.5s cubic-bezier(0.2, 1.6, 0.4, 1) both;
  animation-delay: calc(var(--i) * 45ms + 0.15s);
}

@keyframes letter-in {
  from {
    opacity: 0;
    transform: translateY(-0.8em) scale(1.4);
  }
}

.celebration-winner {
  margin: 0;
  font-size: 1.15rem;
}

.celebration-winner strong {
  font-family: var(--font-display);
  font-weight: 400;
  color: var(--color-primary);
}

.celebration-names {
  display: block;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.celebration-how {
  margin: 0;
  color: var(--color-text-muted);
}

.points {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  width: 100%;
  min-height: 1.75rem;
  margin: var(--space-2) 0 0;
  padding: 0;
  list-style: none;
}

.points-line {
  display: flex;
  justify-content: space-between;
  margin: 0;
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-sm);
  font-weight: 700;
  background: var(--color-accent-soft);
}

.points-total {
  margin: 0;
  font: 400 2.6rem / 1 var(--font-display);
  color: var(--color-primary);
}

.celebration-skip {
  margin: var(--space-2) 0 0;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

/* Their win: the same, in quieter colors. */
.celebration--theirs .celebration-title,
.celebration--theirs .celebration-winner strong,
.celebration--theirs .points-total {
  color: var(--red-800);
}

.celebration--tie .celebration-title {
  color: var(--color-text-muted);
}

/* Falling dominoes. */
.confetti {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.confetti-piece {
  position: absolute;
  top: -2rem;
  left: var(--x);
  width: 0.7rem;
  height: 1.4rem;
  border-radius: 3px;
  background: linear-gradient(var(--white) 0 47%, var(--ink) 47% 53%, var(--white) 53%);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.3);
  animation: fall var(--fall) linear var(--delay) both;
}

.confetti-piece:nth-child(3n) {
  background: var(--color-accent);
}

@keyframes fall {
  to {
    transform: translateY(110vh) rotate(var(--spin));
  }
}

/* Capicú and Chuchazo: light rays turning behind the card. */
.rays {
  position: absolute;
  width: 160vmax;
  height: 160vmax;
  background: repeating-conic-gradient(rgb(169 207 226 / 0.28) 0 10deg, transparent 10deg 20deg);
  animation:
    fade-in 0.6s ease,
    turn 14s linear infinite;
}

@keyframes turn {
  to {
    transform: rotate(360deg);
  }
}

.celebration--capicu .celebration-title,
.celebration--chuchazo .celebration-title {
  font-size: clamp(2rem, 8vw, 3.2rem);
  text-shadow:
    0 3px 0 var(--blue-300),
    0 0 24px rgb(169 207 226 / 0.9);
}

/* Capicú: the title swings in from both ends, like a tile fitting either side. */
.celebration--capicu .letter {
  animation-name: capicu-in;
  animation-duration: 0.7s;
}

@keyframes capicu-in {
  from {
    opacity: 0;
    transform: translateX(calc((var(--i) - 3) * 0.6em)) rotate(-25deg) scale(1.6);
  }
}

.celebration--capicu .celebration-card {
  animation:
    rise 0.45s cubic-bezier(0.2, 1.4, 0.4, 1),
    glow 1.2s ease-in-out 0.5s infinite;
}

@keyframes glow {
  50% {
    box-shadow:
      0 0 0 4px var(--color-accent),
      0 0 40px 10px rgb(169 207 226 / 0.7);
  }
}

/* Chuchazo: the double blank slams down and the screen shakes. */
.celebration--chuchazo {
  animation:
    fade-in 0.3s ease,
    shake 0.5s ease 0.55s;
}

@keyframes shake {
  20%,
  60% {
    transform: translate(-8px, 4px);
  }
  40%,
  80% {
    transform: translate(8px, -4px);
  }
}

.slam {
  width: 3.4rem;
  height: 1.7rem;
  margin-top: calc(-1 * var(--space-7));
  animation: slam 0.55s cubic-bezier(0.5, 0, 0.75, 0) both;
}

@keyframes slam {
  from {
    opacity: 0;
    transform: translateY(-60vh) rotate(-540deg) scale(3);
  }
  85% {
    transform: translateY(0) rotate(0) scale(1.15);
  }
}

@media (prefers-reduced-motion: reduce) {
  .rays,
  .confetti {
    display: none;
  }
}
</style>
