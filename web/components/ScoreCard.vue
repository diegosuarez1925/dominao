<script setup lang="ts">
// The score table, kept the way it is on paper at a domino table: a column for us and
// one for them, a line for each match with the points written under whoever won it,
// and the totals under a double line. Matches we won are blue, theirs red, so who is
// ahead shows at a glance. It folds down to one line.
import { computed, nextTick, ref, watch, watchEffect } from "vue";
import type { Game } from "../api.ts";
import { useCountUp } from "../countUp.ts";
import { rulesName } from "../session.ts";

/** `hold` keeps the old scores (and hides the newest line) while a match's celebration plays. */
const props = defineProps<{ game: Game; myTeam: number; hold?: boolean }>();
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

const HOW: Record<string, string> = { DOMINO: "", TRANQUE: "tranque" };
const SPECIAL: Record<string, string> = { CAPICU: "capicú", CHUCHAZO: "chuchazo" };

/** One line per finished match, oldest first, then the match being played. */
const lines = computed(() => {
  const results = [...props.game.results].sort((a, b) => a.matchNumber - b.matchNumber);
  const shown = props.hold ? results.slice(0, -1) : results;
  const rows = shown.map((r) => ({
    match: r.matchNumber,
    winner: r.team === -1 ? "tie" : r.team === props.myTeam ? "us" : "them",
    points: r.points,
    how: SPECIAL[r.special] ?? HOW[r.ending] ?? "",
  }));
  const playing = props.game.status === "ACTIVE" || props.game.status === "PAUSED";
  return { rows, current: playing || props.hold ? props.game.matchNumber : null };
});

// Keep the newest line in view when one is written.
const sheet = ref<HTMLDivElement | null>(null);
watch(
  () => [lines.value.rows.length, open.value],
  async () => {
    await nextTick();
    if (sheet.value) sheet.value.scrollTop = sheet.value.scrollHeight;
  },
  { immediate: true },
);
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
        <div ref="sheet" class="sheet">
          <table class="tally">
            <thead>
              <tr>
                <th scope="col" class="num"><span class="sr-only">Match</span></th>
                <th v-for="(team, index) in teams" :key="team.label" scope="col" :class="index === 0 ? 'us' : 'them'">
                  {{ team.label }}
                  <span class="team-names">{{ team.names }}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in lines.rows" :key="row.match" :class="`won-${row.winner}`">
                <th scope="row" class="num">{{ row.match }}</th>
                <template v-if="row.winner === 'tie'">
                  <td colspan="2" class="tie">tie · nobody scores</td>
                </template>
                <template v-else>
                  <td class="us">
                    <template v-if="row.winner === 'us'">
                      {{ row.points }}<span v-if="row.how" class="how">{{ row.how }}</span>
                    </template>
                  </td>
                  <td class="them">
                    <template v-if="row.winner === 'them'">
                      {{ row.points }}<span v-if="row.how" class="how">{{ row.how }}</span>
                    </template>
                  </td>
                </template>
              </tr>
              <tr v-if="lines.current !== null" class="playing">
                <th scope="row" class="num">{{ lines.current }}</th>
                <td colspan="2" class="tie">being played…</td>
              </tr>
            </tbody>
          </table>
        </div>
        <table class="tally totals">
          <tbody>
            <tr>
              <th scope="row" class="num">Total</th>
              <td class="us">{{ teams[0].score }}</td>
              <td class="them">{{ teams[1].score }}</td>
            </tr>
            <tr class="to-go">
              <th scope="row" class="num">To go</th>
              <td class="us">{{ Math.max(0, game.target - teams[0].score) }}</td>
              <td class="them">{{ Math.max(0, game.target - teams[1].score) }}</td>
            </tr>
          </tbody>
        </table>
        <p class="score-meta">{{ rulesName(game.rules) }} rules · first to {{ game.target }}</p>
      </div>
    </Transition>
  </section>
</template>

<style scoped>
.score-card {
  width: 100%;
  max-width: 19rem;
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

/* Long games scroll inside the card; the heading and totals stay in view. */
.sheet {
  max-height: 15rem;
  overflow-y: auto;
}

.tally {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.tally th,
.tally td {
  padding: 0.3rem var(--space-3);
  text-align: center;
  vertical-align: middle;
}

/* The match number: a narrow margin column, like the edge of the page. */
.tally .num {
  width: 2.6rem;
  padding-left: 0;
  padding-right: var(--space-2);
  text-align: right;
  font: 700 0.75rem var(--font-body);
  color: var(--color-text-muted);
}

/* The two columns, kept apart by a ruled line down the middle. */
.tally .us {
  border-right: 2px solid var(--line);
}

.tally .them {
  border-left: 2px solid var(--line);
}

.tally thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  padding-bottom: var(--space-2);
  border-bottom: 2px solid var(--color-text);
  font: 400 1.1rem var(--font-display);
  vertical-align: bottom;
  background: var(--color-surface);
}

.tally thead .us {
  color: #2f6f8f;
}

.tally thead .them {
  color: var(--color-primary);
}

.team-names {
  display: block;
  font: 400 0.7rem / 1.2 var(--font-body);
  color: var(--color-text-muted);
  overflow-wrap: anywhere;
}

.tally tbody td {
  font: 400 1.1rem var(--font-display);
}

.tally tbody tr + tr th,
.tally tbody tr + tr td {
  border-top: 1px dashed var(--line);
}

/* Who won each match, at a glance: blue for us, red for them. */
.won-us td.us {
  color: #1f5874;
  background: var(--color-accent-soft);
  box-shadow: inset 4px 0 0 var(--color-accent);
}

.won-them td.them {
  color: var(--color-primary);
  background: rgb(168 58 56 / 0.1);
  box-shadow: inset -4px 0 0 var(--color-primary);
}

.how {
  display: block;
  font: 600 0.65rem var(--font-body);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  opacity: 0.8;
}

.tally .tie {
  font: italic 0.8rem var(--font-body);
  color: var(--color-text-muted);
}

/* Totals under a double line, as on paper, outside the scrolling lines so they always show. */
.totals tr:first-child th,
.totals tr:first-child td {
  padding-top: var(--space-2);
  border-top: 4px double var(--color-text);
}

.totals td {
  font: 400 1.35rem var(--font-display);
}

.totals .us {
  color: #1f5874;
}

.totals .them {
  color: var(--color-primary);
}

.tally.totals .to-go th,
.tally.totals .to-go td {
  padding-top: 0;
  border-top: none;
}

.totals .to-go td {
  font: 0.75rem var(--font-body);
  color: var(--color-text-muted);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

.score-meta {
  margin: var(--space-2) 0 0;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}
</style>
