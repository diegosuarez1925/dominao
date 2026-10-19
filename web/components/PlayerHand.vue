<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { Game, Side } from "../api.ts";
import { play } from "../session.ts";
import DominoTile from "./DominoTile.vue";

const props = defineProps<{ hand: Game["hand"]; board: Game["board"]; myTurn: boolean }>();

const ends = computed(() => ({ left: props.board[0]?.left, right: props.board.at(-1)?.right }));

/** Each tile in hand, with the ends of the board it fits. */
const tiles = computed(() =>
  props.hand.map(({ tile }) => {
    const [a, b] = tile.split("-").map(Number);
    const { left, right } = ends.value;
    const fitsLeft = left === undefined || a === left || b === left;
    const fitsRight = right !== undefined && (a === right || b === right);
    return { tile, a, b, fitsLeft, fitsRight };
  }),
);

/** A tile that fits both ends, waiting for the player to pick a side. */
const pending = ref<string | null>(null);
watch(
  () => props.myTurn,
  () => (pending.value = null),
);

function choose(tile: (typeof tiles.value)[number]) {
  // Ask for a side only when the tile fits two different ends.
  if (tile.fitsLeft && tile.fitsRight && ends.value.left !== ends.value.right) {
    pending.value = tile.tile;
  } else {
    send(tile.tile, tile.fitsLeft ? "LEFT" : "RIGHT");
  }
}

function send(tile: string, side: Side) {
  pending.value = null;
  play(tile, side);
}
</script>

<template>
  <p v-if="myTurn">Your turn: pick a tile that matches an end.</p>
  <div class="hand">
    <button
      v-for="t in tiles"
      :key="t.tile"
      :disabled="!myTurn || !(t.fitsLeft || t.fitsRight)"
      @click="choose(t)"
    >
      <DominoTile :first="t.a" :second="t.b" />
    </button>
  </div>
  <p v-if="pending">
    Play {{ pending.replace("-", "|") }} on
    <button @click="send(pending, 'LEFT')">the left</button> or
    <button @click="send(pending, 'RIGHT')">the right</button>?
  </p>
</template>

<style scoped>
.hand {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  min-height: 2.5rem;
}

.hand button {
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
}

.hand button:disabled {
  opacity: 0.4;
  cursor: default;
}
</style>
