<script setup lang="ts">
// The Stats section, opened from the side menu over the home screen: an account's
// matches and games won and lost, and their winrates, for every rule set together and
// for each rule set on its own, with the most points it won in one match. Tranque ties
// are not counted. Guests have no stats, so they never see this.
import { computed, onMounted, ref } from "vue";
import type { Stats, StatsTotals } from "../api.ts";
import { loadStats, rulesName, state } from "../session.ts";
import StatsLines from "./StatsLines.vue";

const stats = ref<Stats | null>(null);
const loaded = ref(false);
onMounted(async () => {
  stats.value = await loadStats();
  loaded.value = true;
});

const NONE: StatsTotals = {
  matchesWon: 0,
  matchesLost: 0,
  matchesPlayed: 0,
  matchWinrate: 0,
  gamesWon: 0,
  gamesLost: 0,
  gamesPlayed: 0,
  gameWinrate: 0,
};

const overall = computed(() => stats.value?.overall[0] ?? NONE);
/** Every rule set the server offers, in its order, with zeros for one never played. */
const perRules = computed(() =>
  state.rulesets.map((ruleset) => ({
    ...ruleset,
    record: stats.value?.records.find((row) => row.rules === ruleset.rules) ?? { ...NONE, bestMatchPoints: 0 },
  })),
);

</script>

<template>
  <section class="panel stats" aria-labelledby="stats-title">
    <h2 id="stats-title" class="panel-title">Stats</h2>
    <p v-if="loaded && stats === null" class="notice">Your stats could not be loaded. Try again in a moment.</p>
    <template v-else-if="loaded">
      <div class="stats-block stats-block--overall" aria-labelledby="stats-overall">
        <h3 id="stats-overall" class="stats-heading">All rule sets</h3>
        <StatsLines :totals="overall" />
        <p v-if="overall.matchesPlayed === 0" class="field-hint">
          Play a game while logged in and your results show up here. Tied matches (tranques) are not counted.
        </p>
      </div>

      <div v-for="row in perRules" :key="row.rules" class="stats-block" :aria-labelledby="`stats-${row.rules}`">
        <div class="stats-head">
          <h3 :id="`stats-${row.rules}`" class="stats-heading">{{ rulesName(row.rules) }} <span class="stats-target">to {{ row.target }}</span></h3>
          <span class="stats-best">
            Best match <strong>{{ row.record.bestMatchPoints > 0 ? `${row.record.bestMatchPoints} pts` : "—" }}</strong>
          </span>
        </div>
        <StatsLines :totals="row.record" />
      </div>
    </template>
    <p v-else class="field-hint">Loading your stats…</p>
  </section>
</template>

<style scoped>
.stats {
  width: min(34rem, 100%);
  max-height: calc(100dvh - 2 * var(--gutter));
  overflow-y: auto;
}

.stats .panel-title {
  padding-right: var(--space-6);
}

.stats-block {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: var(--white);
}

.stats-block--overall {
  border-color: var(--color-accent);
  background: var(--color-accent-soft);
}

.stats-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-1) var(--space-3);
}

.stats-heading {
  margin: 0;
  font-size: 1rem;
  font-weight: 800;
  color: var(--red-800);
}

.stats-target {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-text-muted);
}

.stats-best {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.stats-best strong {
  color: var(--color-text);
}

</style>
