<script setup lang="ts">
// The guest's own tiles, face up and standing. On their turn, tiles that fit an end can
// be played; a tile that fits both ends asks which one.
import { computed, ref, watch } from "vue";
import type { Game, Side } from "../api.ts";
import { play, state } from "../session.ts";
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
    return { tile, a, b, playable: fitsLeft || fitsRight, fitsLeft, fitsRight };
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
    pending.value = pending.value === tile.tile ? null : tile.tile;
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
  <div class="player-hand">
    <Transition name="pop">
      <div v-if="pending" class="side-choice">
        <span>Play on which end?</span>
        <button class="btn btn--small" @click="send(pending, 'LEFT')">Left ({{ ends.left }})</button>
        <button class="btn btn--small" @click="send(pending, 'RIGHT')">Right ({{ ends.right }})</button>
        <button class="btn btn--ghost btn--small" @click="pending = null">Cancel</button>
      </div>
    </Transition>
    <TransitionGroup tag="div" name="tile" class="hand" :class="{ 'my-turn': myTurn }">
      <button
        v-for="t in tiles"
        :key="t.tile"
        class="hand-tile"
        :class="{ chosen: pending === t.tile, playable: myTurn && t.playable }"
        :disabled="!myTurn || !t.playable || state.busy"
        :aria-label="`Play ${t.a}|${t.b}`"
        @click="choose(t)"
      >
        <DominoTile :first="t.a" :second="t.b" vertical class="hand-face" />
      </button>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.player-hand {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
}

.hand {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-2);
  min-height: 4.6rem;
}

.hand-tile {
  padding: 0;
  border: none;
  background: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition:
    transform 0.15s,
    opacity 0.2s,
    filter 0.2s;
}

.hand-face {
  width: 2.3rem;
  height: 4.6rem;
}

/* On the guest's turn, tiles that cannot be played fade back. */
.my-turn .hand-tile:disabled {
  opacity: 0.45;
  filter: grayscale(0.4);
}

.hand-tile:disabled {
  cursor: default;
}

.playable:hover,
.playable:focus-visible,
.chosen {
  transform: translateY(-0.5rem);
}

.playable .hand-face {
  box-shadow:
    0 0 0 2px var(--color-accent),
    0 4px 10px rgb(0 0 0 / 0.3);
}

.side-choice {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-pill);
  color: var(--color-text);
  background: var(--color-surface);
  box-shadow: var(--shadow-md);
  font-weight: 700;
}

@media (max-width: 40rem) {
  .hand-face {
    width: 1.9rem;
    height: 3.8rem;
  }

  .hand {
    gap: var(--space-1);
    min-height: 3.8rem;
  }
}
</style>
