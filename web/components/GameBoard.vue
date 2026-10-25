<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import type { BoardTile } from "../api.ts";
import { BOARD_UNITS, layOut } from "../board.ts";
import DominoTile from "./DominoTile.vue";

const props = defineProps<{ board: BoardTile[] }>();

// The size of one grid unit follows the board's width on screen, up to a limit so a
// wide screen does not get giant tiles.
const element = ref<HTMLElement | null>(null);
const width = ref(0);
const observer = new ResizeObserver(() => {
  if (element.value !== null && element.value.clientWidth > 0) width.value = element.value.clientWidth;
});
onMounted(() => {
  if (element.value !== null) observer.observe(element.value);
});
onBeforeUnmount(() => observer.disconnect());

const MAX_UNIT = 34;
const placed = computed(() => layOut(props.board));
// The board's box in grid units; doubles across the line can stick out by half a unit.
const left = computed(() => Math.min(0, ...placed.value.map((p) => p.x)));
const right = computed(() => Math.max(BOARD_UNITS, ...placed.value.map((p) => p.x + p.w)));
const top = computed(() => Math.min(0, ...placed.value.map((p) => p.y)));
const bottom = computed(() => Math.max(1, ...placed.value.map((p) => p.y + p.h)));
const unit = computed(() => Math.min(MAX_UNIT, Math.floor(width.value / (right.value - left.value))));
</script>

<template>
  <div ref="element" class="board-frame">
    <div
      class="board"
      :style="{ width: `${(right - left) * unit}px`, height: `${(bottom - top) * unit}px`, '--unit': `${unit}px` }"
    >
      <DominoTile
        v-for="p in placed"
        :key="p.tile"
        :first="p.first"
        :second="p.second"
        :vertical="p.vertical"
        class="placed"
        :style="{
          left: `${(p.x - left) * unit}px`,
          top: `${(p.y - top) * unit}px`,
          width: `${p.w * unit - 2}px`,
          height: `${p.h * unit - 2}px`,
        }"
      />
    </div>
  </div>
</template>

<style scoped>
.board-frame {
  width: 100%;
  min-width: 0;
  overflow: hidden;
  display: flex;
  justify-content: center;
}

/* The board is a grid of square units; each tile is placed on it by layOut. */
.board {
  position: relative;
  transition: height 0.3s ease;
}

.placed {
  position: absolute;
  margin: 1px;
  animation: land 0.35s ease-out;
}

/* A newly played tile drops onto the table. */
@keyframes land {
  from {
    opacity: 0;
    transform: scale(1.3) translateY(-6px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .placed {
    animation: none;
  }
}
</style>
