<script setup lang="ts">
// The score table: us against them, the target, the match being played and how the
// last match went. It folds down to one line.
import { computed, ref, watchEffect } from "vue";
import type { Game } from "../api.ts";
import { useCountUp } from "../countUp.ts";
import { rulesName } from "../session.ts";

/** `hold` keeps the old scores showing while a match's celebration plays. */
const props = defineProps<{ game: Game; myTeam: number; lastResult: string; hold?: boolean }>();
const open = defineModel<boolean>("open", { default: true });

// Scores count up to their new value when a match is won.
const targetA = ref(props.game.scoreA);
const targetB = ref(props.game.scoreB);
watchEffect(() => {
  if (props.hold) return;
  targetA.value = props.game.scoreA;
  targetB.value = props.game.scoreB;
});
const shownA = useCountUp(() => targetA.value, 1400);
const shownB = useCountUp(() => targetB.value, 1400);

const teams = computed(() => {
  const names = (team: number) =>
    props.game.players
      .filter((p) => p.position % 2 === team)
      .map((p) => p.displayName ?? p.botName ?? "empty seat")
      .join(" & ");
  const score = (team: number) => (team === 0 ? shownA.value : shownB.value);
  const us = props.myTeam;
  const them = 1 - us;
  return [
    { label: "Us", names: names(us), score: score(us) },
    { label: "Them", names: names(them), score: score(them) },
  ];
});
</script>

<template>
  <section class="score-card">
    <button class="score-toggle" :aria-expanded="open" @click="open = !open">
      <span class="score-summary">
        <span>Us <strong>{{ teams[0].score }}</strong></span>
        <span class="vs">vs</span>
        <span>Them <strong>{{ teams[1].score }}</strong></span>
      </span>
      <span class="chevron" :class="{ flipped: open }" aria-hidden="true">▾</span>
    </button>
    <Transition name="fold">
      <div v-if="open" class="score-body">
        <table class="score-table">
          <tbody>
            <tr v-for="team in teams" :key="team.label">
              <th scope="row">
                {{ team.label }}<span class="team-names">{{ team.names }}</span>
              </th>
              <td>{{ team.score }}</td>
              <td class="to-go">{{ Math.max(0, game.target - team.score) }} to go</td>
            </tr>
          </tbody>
        </table>
        <p class="score-meta">{{ rulesName(game.rules) }} rules · first to {{ game.target }} · match {{ game.matchNumber }}</p>
        <p v-if="lastResult" class="score-meta">Last: {{ lastResult }}</p>
      </div>
    </Transition>
  </section>
</template>

<style scoped>
.score-card {
  width: 100%;
  max-width: 18rem;
  border-radius: var(--radius-md);
  color: var(--color-text);
  background: var(--color-surface);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}

.score-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: none;
  border-bottom: 4px solid var(--color-accent);
  font: inherit;
  color: inherit;
  background: none;
  cursor: pointer;
}

.score-summary {
  display: flex;
  gap: var(--space-2);
  align-items: baseline;
  font-family: var(--font-display);
}

.score-summary strong {
  color: var(--color-primary);
  font-weight: 400;
}

.vs {
  font: 0.8rem var(--font-body);
  color: var(--color-text-muted);
}

.chevron {
  transition: transform 0.2s;
}

.flipped {
  transform: rotate(180deg);
}

.score-body {
  padding: var(--space-2) var(--space-3) var(--space-3);
}

.score-table {
  width: 100%;
  border-collapse: collapse;
}

.score-table th,
.score-table td {
  padding: var(--space-1) 0;
  text-align: left;
  vertical-align: top;
}

.score-table td {
  font-family: var(--font-display);
  font-size: 1.25rem;
  color: var(--color-primary);
  text-align: right;
}

.score-table .to-go {
  white-space: nowrap;
  font: 0.75rem var(--font-body);
  color: var(--color-text-muted);
  padding-left: var(--space-2);
  padding-top: 0.55rem;
}

.team-names {
  display: block;
  font-weight: 400;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.score-meta {
  margin: var(--space-2) 0 0;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}
</style>
