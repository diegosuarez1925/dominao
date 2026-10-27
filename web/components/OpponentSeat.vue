<script setup lang="ts">
// Another player at the game table: who they are and their hand face down, so the
// number of tiles they hold shows at a glance. Players across the table hold their
// tiles in a row; players at the sides hold them in a column.
import DominoTile from "./DominoTile.vue";
import PlayerBadge from "./PlayerBadge.vue";

defineProps<{
  name: string;
  note: string;
  tileCount: number;
  active: boolean;
  passed: boolean;
  side: "top" | "left" | "right";
  bot?: boolean;
  away?: boolean;
  empty?: boolean;
}>();
</script>

<template>
  <div class="opponent" :class="`opponent--${side}`">
    <PlayerBadge :name="name" :note="note" :active="active" :passed="passed" :bot="bot" :away="away" :empty="empty" stacked />
    <TransitionGroup tag="div" name="tile" class="backs" :class="{ waiting: empty }" :aria-label="`${tileCount} tiles`">
      <DominoTile v-for="n in tileCount" :key="n" face-down :vertical="side === 'top'" class="back" />
    </TransitionGroup>
  </div>
</template>

<style scoped>
.opponent {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.opponent--top {
  justify-content: center;
  flex-wrap: wrap;
}

.opponent--left,
.opponent--right {
  flex-direction: column;
}

.backs {
  display: flex;
  gap: 3px;
  transition: opacity 0.3s;
}

/* An empty seat's tiles wait for whoever sits down. */
.backs.waiting {
  opacity: 0.4;
}

.opponent--left .backs,
.opponent--right .backs {
  flex-direction: column;
}

.back {
  width: 2.4rem;
  height: 1.2rem;
}

.opponent--top .back {
  width: 1.2rem;
  height: 2.4rem;
}

/* On phones every hand is a short row of small backs under the player. */
@media (max-width: 34rem) {
  .opponent--top {
    flex-direction: column;
    gap: var(--space-2);
  }

  .opponent .backs {
    flex-direction: row !important;
    flex-wrap: wrap;
    justify-content: center;
    max-width: 6.5rem;
  }

  .opponent .back {
    width: 0.8rem !important;
    height: 1.6rem !important;
  }
}

@media (max-width: 40rem) {
  .back {
    width: 1.8rem;
    height: 0.9rem;
  }

  .opponent--top .back {
    width: 0.9rem;
    height: 1.8rem;
  }
}
</style>
