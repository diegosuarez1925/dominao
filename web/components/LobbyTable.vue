<script setup lang="ts">
// A square table seen from above, with one player on each side: the guest at the
// bottom, then counter-clockwise (right, top, left). The middle of the table holds
// whatever the lobby wants to show there, such as the join code or the countdown.
// With `pickable`, each seat is a button, so the host can pick two seats to swap; with
// `tappable`, each taken seat is a button, to open that player's menu.
import PlayerBadge from "./PlayerBadge.vue";

export type LobbySeat = { name: string; note?: string; guest?: boolean } | null;

/** The four seats, in the order bottom, right, top, left; `picked` is the index of a picked seat. */
const props = defineProps<{ seats: LobbySeat[]; pickable?: boolean; tappable?: boolean; picked?: number | null }>();
const isButton = (index: number) => props.pickable || (props.tappable && props.seats[index] !== null);
const emit = defineEmits<{ pick: [index: number] }>();
const SIDES = ["bottom", "right", "top", "left"] as const;
</script>

<template>
  <div class="lobby-table">
    <div v-for="(side, index) in SIDES" :key="side" class="seat" :class="`seat--${side}`">
      <component
        :is="isButton(index) ? 'button' : 'div'"
        class="seat-pick"
        :class="{ pickable: isButton(index), picked: picked === index }"
        :aria-pressed="pickable ? picked === index : undefined"
        :aria-label="isButton(index) ? `Seat of ${seats[index]?.name ?? 'nobody (empty)'}` : undefined"
        @click="isButton(index) && emit('pick', index)"
      >
        <Transition name="pop" mode="out-in">
          <PlayerBadge
            :key="seats[index]?.name ?? 'empty'"
            :name="seats[index]?.name"
            :note="seats[index]?.note"
            :guest="seats[index]?.guest"
          />
        </Transition>
      </component>
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

.seat-pick {
  display: block;
  max-width: 100%;
  padding: 0;
  border: none;
  border-radius: var(--radius-pill);
  font: inherit;
  color: inherit;
  background: none;
}

/* The host's seats: a dashed ring on hover, a solid light-blue ring once picked. */
.pickable {
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.2s;
}

.pickable:hover,
.pickable:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px rgb(255 255 255 / 0.55);
}

.pickable.picked {
  box-shadow: 0 0 0 3px var(--color-accent);
  transform: translateY(-2px);
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
