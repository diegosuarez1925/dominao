<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import type { BoardTile } from "../api.ts";
import { BOARD_UNITS, layOut } from "../board.ts";
import DominoTile from "./DominoTile.vue";

const props = defineProps<{ board: BoardTile[] }>();

// The size of one grid unit follows the board's width on screen.
const element = ref<HTMLElement | null>(null);
const width = ref(576);
function measure() {
  if (element.value !== null && element.value.clientWidth > 0) width.value = element.value.clientWidth;
}
onMounted(() => {
  measure();
  window.addEventListener("resize", measure);
});
onBeforeUnmount(() => window.removeEventListener("resize", measure));

const unit = computed(() => Math.floor(width.value / BOARD_UNITS));
const placed = computed(() => layOut(props.board));
const top = computed(() => Math.min(0, ...placed.value.map((p) => p.y)));
const bottom = computed(() => Math.max(1, ...placed.value.map((p) => p.y + (p.vertical ? 2 : 1))));
</script>

<template>
  <div ref="element" class="board" :style="{ height: `${(bottom - top) * unit}px`, '--unit': `${unit}px` }">
    <DominoTile
      v-for="p in placed"
      :key="p.tile"
      :first="p.first"
      :second="p.second"
      :vertical="p.vertical"
      class="placed"
      :style="{ left: `${p.x * unit}px`, top: `${(p.y - top) * unit}px` }"
    />
  </div>
</template>

<style scoped>
/* The board is a grid of square units; each tile is placed on it by layOut. */
.board {
  position: relative;
}

.placed {
  position: absolute;
  width: calc(2 * var(--unit));
  height: var(--unit);
  font-size: calc(0.45 * var(--unit));
}

.placed.vertical {
  width: var(--unit);
  height: calc(2 * var(--unit));
}

.placed :deep(span) {
  padding: 0;
}
</style>
