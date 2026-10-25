<script setup lang="ts">
// A square table seen from above, with one player on each side: the guest at the
// bottom, then counter-clockwise (right, top, left). The middle of the table holds
// whatever the lobby wants to show there, such as the join code or the countdown.
import PlayerBadge from "./PlayerBadge.vue";

export type LobbySeat = { name: string; note?: string } | null;

/** The four seats, in the order bottom, right, top, left. */
defineProps<{ seats: LobbySeat[] }>();
const SIDES = ["bottom", "right", "top", "left"] as const;
</script>

<template>
  <div class="lobby-table">
    <div v-for="(side, index) in SIDES" :key="side" class="seat" :class="`seat--${side}`">
      <Transition name="pop" mode="out-in">
        <PlayerBadge :key="seats[index]?.name ?? 'empty'" :name="seats[index]?.name" :note="seats[index]?.note" />
      </Transition>
    </div>
    <div class="table-top felt">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.lobby-table {
  display: grid;
  grid-template:
    ". top ." auto
    "left table right" auto
    ". bottom ." auto / 1fr minmax(0, auto) 1fr;
  gap: var(--space-3);
  align-items: center;
  justify-items: center;
}

.seat--top {
  grid-area: top;
}

.seat--bottom {
  grid-area: bottom;
}

.seat--left {
  grid-area: left;
  justify-self: end;
}

.seat--right {
  grid-area: right;
  justify-self: start;
}

.seat {
  min-width: 0;
  max-width: 100%;
}

.table-top {
  grid-area: table;
  display: grid;
  place-items: center;
  width: clamp(9rem, 36vw, 16rem);
  aspect-ratio: 1;
  padding: var(--space-3);
  text-align: center;
}

/* On phones the side seats go above and below the table, two by two. */
@media (max-width: 34rem) {
  .lobby-table {
    grid-template:
      "top top" auto
      "left right" auto
      "table table" auto
      "bottom bottom" auto / 1fr 1fr;
  }

  .seat--left,
  .seat--right {
    justify-self: center;
  }

  .table-top {
    width: min(100%, 14rem);
  }
}
</style>
