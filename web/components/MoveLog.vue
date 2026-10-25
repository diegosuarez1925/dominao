<script setup lang="ts">
// Every turn of the game so far, in a side bar that slides in from the right and can
// be folded away. A tab on the edge of the screen opens and closes it.
import { computed, nextTick, ref, watch } from "vue";
import type { Game } from "../api.ts";

const props = defineProps<{ log: Game["log"] }>();
const open = defineModel<boolean>("open", { default: false });

/** Every turn so far, newest last, with a heading where each match begins. */
const lines = computed(() => {
  const result: { key: string; text: string; kind: "match" | "PLAYED" | "SKIPPED" }[] = [];
  let match = 0;
  for (const turn of [...props.log].sort((a, b) => a.turn - b.turn)) {
    if (turn.matchNumber !== match) {
      match = turn.matchNumber;
      result.push({ key: `match-${match}`, text: `Match ${match}`, kind: "match" });
    }
    const text =
      turn.move === "PLAYED" ? `${turn.displayName} played ${turn.tile.replace("-", "|")}` : `${turn.displayName} passed`;
    result.push({ key: `turn-${turn.turn}`, text, kind: turn.move });
  }
  return result;
});

// Keep the newest turn in sight.
const element = ref<HTMLElement | null>(null);
watch(
  () => [props.log.length, open.value],
  async () => {
    await nextTick();
    if (element.value !== null) element.value.scrollTop = element.value.scrollHeight;
  },
  { immediate: true },
);
</script>

<template>
  <button class="log-tab" :class="{ open }" :aria-expanded="open" @click="open = !open">
    {{ open ? "Close moves" : "Moves" }}
  </button>
  <Transition name="slide">
    <aside v-if="open" class="log-panel" aria-label="Moves">
      <h3 class="log-title">Moves</h3>
      <ol ref="element" class="log">
        <li v-for="line in lines" :key="line.key" :class="line.kind">{{ line.text }}</li>
        <li v-if="lines.length === 0" class="SKIPPED">No moves yet.</li>
      </ol>
    </aside>
  </Transition>
</template>

<style scoped>
.log-panel {
  position: fixed;
  z-index: 20;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  width: min(18rem, 85vw);
  padding: var(--space-5) var(--space-4) var(--space-4);
  border-left: 4px solid var(--color-accent);
  color: var(--color-text);
  background: var(--color-surface);
  box-shadow: var(--shadow-md);
}

.log-title {
  font-family: var(--font-display);
  font-weight: 400;
  color: var(--color-primary);
}

.log {
  flex: 1;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
}

.log li {
  margin: 0;
  padding: var(--space-1) 0;
  border-bottom: 1px solid var(--line);
}

.match {
  margin-top: var(--space-3) !important;
  font-weight: 800;
  color: var(--color-primary);
}

.SKIPPED {
  color: var(--color-text-muted);
  font-style: italic;
}

/* The tab on the right edge; it rides on the panel's edge when the panel is open. */
.log-tab {
  position: fixed;
  z-index: 21;
  top: 50%;
  right: 0;
  padding: var(--space-3) var(--space-2);
  border: none;
  border-radius: var(--radius-sm) 0 0 var(--radius-sm);
  font: 700 0.9rem var(--font-body);
  color: var(--color-on-primary);
  background: var(--color-primary);
  box-shadow: var(--shadow-md);
  writing-mode: vertical-rl;
  transform: translateY(-50%);
  cursor: pointer;
  transition: right 0.3s ease;
}

.log-tab.open {
  right: min(18rem, 85vw);
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}
</style>
