<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import type { Game } from "../api.ts";

const props = defineProps<{ log: Game["log"] }>();

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
      turn.move === "PLAYED" ? `${turn.displayName} played ${turn.tile.replace("-", "|")}` : `${turn.displayName} was skipped`;
    result.push({ key: `turn-${turn.turn}`, text, kind: turn.move });
  }
  return result;
});

// Keep the newest turn in sight.
const element = ref<HTMLElement | null>(null);
watch(
  () => props.log.length,
  async () => {
    await nextTick();
    if (element.value !== null) element.value.scrollTop = element.value.scrollHeight;
  },
  { immediate: true },
);
</script>

<template>
  <ol ref="element" class="log">
    <li v-for="line in lines" :key="line.key" :class="line.kind">{{ line.text }}</li>
  </ol>
</template>

<style scoped>
.log {
  max-height: 12rem;
  overflow-y: auto;
  list-style: none;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 0.4rem;
}

li {
  margin: 0.15rem 0;
}

.match {
  font-weight: bold;
  margin-top: 0.5rem;
}

.SKIPPED {
  color: #777;
}
</style>
