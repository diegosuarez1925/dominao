<script setup lang="ts">
// The rules of Puerto Rican dominoes as DOMINAO plays them, in a pop-up the home
// screen opens. Escape, the close button or a click outside closes it. The rule sets
// come from the server, so a new one shows up here too.
import { nextTick, ref, watch } from "vue";
import { rulesName, state } from "../session.ts";
import DominoTile from "./DominoTile.vue";

const open = defineModel<boolean>("open", { default: false });
const close = ref<HTMLButtonElement | null>(null);
watch(open, async (now) => {
  if (!now) return;
  await nextTick();
  close.value?.focus();
});
</script>

<template>
  <Transition name="pop">
    <div v-if="open" class="backdrop" @click.self="open = false" @keydown.esc="open = false">
      <section class="panel how" role="dialog" aria-modal="true" aria-labelledby="how-title">
        <header class="how-header">
          <h2 id="how-title" class="panel-title">How to play</h2>
          <button ref="close" class="how-close" aria-label="Close how to play" @click="open = false">×</button>
        </header>

        <div class="how-body">
          <section>
            <h3>The table</h3>
            <p>
              Four players, two teams: you and the partner sitting <strong>across</strong> from you play against the
              other two. Each player gets 7 tiles from a double-six set, and nobody sees anyone else's hand.
            </p>
          </section>

          <section>
            <h3>Your turn</h3>
            <div class="example felt" aria-hidden="true">
              <DominoTile :first="4" :second="6" class="ex-tile" />
              <DominoTile :first="6" :second="6" vertical class="ex-tile ex-tile--up" />
              <DominoTile :first="6" :second="2" class="ex-tile" />
            </div>
            <p>
              Play one tile whose number matches either open end of the line. The tiles that fit are lit up in your hand;
              if one fits both ends, you pick the side. Doubles lie crossways.
            </p>
            <p>
              If nothing fits, you pass on your own ("¡Paso!"). You can't pass while you have a tile that fits.
            </p>
          </section>

          <section>
            <h3>Who starts</h3>
            <p>
              The first match opens with the <strong>double six</strong>, played for whoever holds it. After that, the
              winner of the last match starts with any tile.
            </p>
          </section>

          <section>
            <h3>Winning a match</h3>
            <dl class="terms">
              <dt>Domino</dt>
              <dd>Play your last tile. Your team scores every pip left in the other three hands.</dd>
              <dt>Tranque</dt>
              <dd>
                The line is blocked and nobody can play. The team holding fewer pips scores every pip left on the table. A
                tie scores nothing.
              </dd>
              <dt>Capicú</dt>
              <dd>Win with a last tile that could have gone on either end.</dd>
              <dt>Chuchazo</dt>
              <dd>Win with the double blank as your last tile.</dd>
            </dl>
            <p>Matches keep being dealt until a team reaches the rule set's target score.</p>
          </section>

          <section>
            <h3>Rule sets</h3>
            <ul class="rulesets">
              <li v-for="set in state.rulesets" :key="set.rules">
                <strong>{{ rulesName(set.rules) }}.</strong> {{ set.description }}
              </li>
            </ul>
          </section>

          <section>
            <h3>Playing here</h3>
            <ul class="tips">
              <li><strong>Private table:</strong> open one and share its 6-character code with your people.</li>
              <li><strong>Play with strangers:</strong> you're matched with three players who chose the same rules.</li>
              <li>
                <strong>If someone leaves,</strong> the game pauses. Whoever sits down next takes their tiles and carries
                on; after 30 seconds a bot plays the seat until a person takes it.
              </li>
              <li>
                <strong>Join games in progress</strong> lets you take over such a seat in a game of strangers with your
                rules.
              </li>
            </ul>
          </section>
        </div>

        <button class="btn btn--block" @click="open = false">Got it</button>
      </section>
    </div>
  </Transition>
</template>

<style scoped>
.backdrop {
  position: fixed;
  z-index: 40;
  inset: 0;
  display: grid;
  place-items: center;
  padding: var(--gutter);
  background: rgb(40 8 10 / 0.55);
}

.how {
  width: min(36rem, 100%);
  max-height: min(44rem, calc(100dvh - 2 * var(--gutter)));
}

.how-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.how-close {
  padding: 0 var(--space-2);
  border: none;
  font-size: 1.75rem;
  line-height: 1;
  color: var(--color-text-muted);
  background: none;
  cursor: pointer;
}

/* The rules scroll; the title and the button stay put. */
.how-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-height: 0;
  margin-right: calc(-1 * var(--space-2));
  padding-right: var(--space-2);
  overflow-y: auto;
}

.how-body section {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.how-body h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 800;
  color: var(--color-primary);
}

.how-body p,
.how-body ul,
.how-body dl {
  margin: 0;
}

.terms {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--space-1) var(--space-3);
}

.terms dt {
  font-weight: 800;
}

.terms dd {
  margin: 0;
}

.rulesets,
.tips {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding-left: 1.2rem;
}

/* Three tiles meeting at matching numbers: 4|6, the double six crossways, 6|2. */
.example {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-3);
  border-width: 4px;
}

.ex-tile {
  width: 3.6rem;
  height: 1.8rem;
}

.ex-tile--up {
  width: 1.8rem;
  height: 3.6rem;
}

@media (max-width: 34rem) {
  .terms {
    grid-template-columns: 1fr;
  }

  .terms dd {
    margin-bottom: var(--space-2);
  }
}
</style>
