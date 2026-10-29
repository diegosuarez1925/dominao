<script setup lang="ts">
// Two lines of stats, matches then games: won, lost and played, and the winrate with a
// bar. A winrate with nothing played shows as a dash, not 0%.
import { computed } from "vue";
import type { StatsTotals } from "../api.ts";

const props = defineProps<{ totals: StatsTotals }>();

const lines = computed(() => [
  {
    label: "Matches",
    won: props.totals.matchesWon,
    lost: props.totals.matchesLost,
    played: props.totals.matchesPlayed,
    rate: props.totals.matchWinrate,
  },
  {
    label: "Games",
    won: props.totals.gamesWon,
    lost: props.totals.gamesLost,
    played: props.totals.gamesPlayed,
    rate: props.totals.gameWinrate,
  },
]);
</script>

<template>
  <dl class="stats-lines">
    <div v-for="line in lines" :key="line.label" class="stats-line">
      <dt class="stats-label">{{ line.label }}</dt>
      <dd class="stats-counts">
        <span><strong>{{ line.won }}</strong> won</span>
        <span><strong>{{ line.lost }}</strong> lost</span>
        <span><strong>{{ line.played }}</strong> played</span>
      </dd>
      <dd class="stats-rate">
        <span class="stats-rate-number">{{ line.played === 0 ? "—" : `${line.rate}%` }}</span>
        <span class="stats-bar" aria-hidden="true"><span :style="{ width: `${line.played === 0 ? 0 : line.rate}%` }" /></span>
        <span class="stats-rate-label">winrate</span>
      </dd>
    </div>
  </dl>
</template>

<style scoped>
.stats-lines {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin: 0;
}

/* A line: its name, the counts, then the winrate with a bar under it. */
.stats-line {
  display: grid;
  grid-template-columns: 4.5rem 1fr 4.5rem;
  align-items: center;
  gap: var(--space-3);
}

.stats-line dd {
  margin: 0;
}

.stats-label {
  font-weight: 800;
}

.stats-counts {
  display: flex;
  flex-wrap: wrap;
  gap: 0 var(--space-3);
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.stats-counts strong {
  font-size: 1rem;
  color: var(--color-text);
}

.stats-rate {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.2rem;
}

.stats-rate-number {
  font: 400 1.05rem/1 var(--font-display);
  color: var(--color-primary);
}

.stats-bar {
  width: 100%;
  height: 0.35rem;
  overflow: hidden;
  border-radius: var(--radius-pill);
  background: var(--line);
}

.stats-bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--color-primary);
}

.stats-rate-label {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--color-text-muted);
}
</style>
