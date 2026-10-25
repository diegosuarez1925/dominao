<script setup lang="ts">
// A domino: two halves of pips split by a line, lying flat or standing up. Face down,
// it shows only its back. Its size comes from the parent (width and height), and the
// pips scale with it.
import { computed } from "vue";

const props = defineProps<{ first?: number; second?: number; vertical?: boolean; faceDown?: boolean }>();

/** Which of a half's 3 by 3 spots hold a pip, read left to right, top to bottom. */
const SPOTS: Record<number, number[]> = {
  0: [],
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
};
function spots(value: number | undefined) {
  if (value === undefined) return [];
  // Six is two lines of three, lying along the domino.
  if (value === 6) return props.vertical ? [0, 3, 6, 2, 5, 8] : [0, 1, 2, 6, 7, 8];
  return SPOTS[value] ?? [];
}
const halves = computed(() => [spots(props.first), spots(props.second)]);
const label = computed(() => (props.faceDown ? "A domino, face down" : `Domino ${props.first}|${props.second}`));
</script>

<template>
  <span class="tile" :class="{ vertical, 'face-down': faceDown }" role="img" :aria-label="label">
    <template v-if="!faceDown">
      <span v-for="(half, index) in halves" :key="index" class="half">
        <span v-for="spot in half" :key="spot" class="pip" :style="{ gridArea: `${Math.floor(spot / 3) + 1} / ${(spot % 3) + 1}` }" />
      </span>
    </template>
  </span>
</template>

<style scoped>
.tile {
  --tile-line: rgb(42 31 31 / 0.35);
  display: inline-flex;
  width: 3.2rem;
  height: 1.6rem;
  flex: none;
  border: 1px solid rgb(42 31 31 / 0.25);
  border-radius: 14% / 28%;
  background: var(--color-tile, #fffdf7);
  box-shadow:
    inset 0 -2px 0 rgb(0 0 0 / 0.08),
    0 1px 2px rgb(0 0 0 / 0.25);
  overflow: hidden;
}

.vertical {
  flex-direction: column;
  width: 1.6rem;
  height: 3.2rem;
  border-radius: 28% / 14%;
}

.half {
  flex: 1;
  display: grid;
  grid-template: repeat(3, 1fr) / repeat(3, 1fr);
  padding: 9%;
  place-items: center;
}

.tile:not(.vertical) .half {
  padding: 9% 4.5%;
}

.half + .half {
  border-left: 1px solid var(--tile-line);
}

.vertical .half + .half {
  border-left: none;
  border-top: 1px solid var(--tile-line);
}

.pip {
  width: 62%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: var(--ink, #2a1f1f);
}

/* The back: red with light-blue stripes, like the rest of the app. */
.face-down {
  border-color: rgb(255 255 255 / 0.5);
  background:
    repeating-linear-gradient(45deg, rgb(169 207 226 / 0.35) 0 2px, transparent 2px 6px),
    var(--red-600, #a83a38);
}
</style>
