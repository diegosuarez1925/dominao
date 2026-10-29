<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { CODE_PATTERN, findGame, joinTable, openTable, state } from "../session.ts";
import AccountPanel from "./AccountPanel.vue";
import HowToPlay from "./HowToPlay.vue";
import RulesPicker from "./RulesPicker.vue";

// Each panel keeps its own choice of rules; a table joined by code keeps its own.
const strangerRules = ref("DEFAULT");
const tableRules = ref("DEFAULT");
const code = ref("");
const howOpen = ref(false);
// Whether the guest is happy to be dropped into a game of strangers already going on,
// remembered on this device.
const MIDWAY_KEY = "dominao.midway";
const midway = ref(false);
try {
  midway.value = localStorage.getItem(MIDWAY_KEY) === "1";
} catch {}
watch(midway, (now) => {
  try {
    localStorage.setItem(MIDWAY_KEY, now ? "1" : "0");
  } catch {}
});
const cleanCode = computed(() => code.value.trim().toUpperCase());
/** Shown once the guest has typed a whole code that can't be one. */
const codeHint = computed(() =>
  cleanCode.value.length === 6 && !CODE_PATTERN.test(cleanCode.value)
    ? "Codes use letters and the digits 2 to 9 (no I, O, 0 or 1)."
    : "",
);
</script>

<template>
  <div class="how-row">
    <p class="how-hint">New to Puerto Rican dominoes, or to DOMINAO?</p>
    <button class="btn btn--secondary btn--small" @click="howOpen = true">How to play</button>
  </div>
  <HowToPlay v-model:open="howOpen" />
  <div class="grid-2">
    <section class="panel">
      <h2 class="panel-title">Play with strangers</h2>
      <p class="panel-text">
        We'll seat you with three other players who picked the same rules. Partners are drawn at random.
      </p>
      <RulesPicker v-model="strangerRules" />
      <label class="toggle">
        <input v-model="midway" type="checkbox" class="toggle-input" />
        <span class="toggle-track" aria-hidden="true"><span class="toggle-thumb" /></span>
        <span class="toggle-text">
          <span class="toggle-label">Join games in progress</span>
          <span class="field-hint">Take over the seat of someone who left a game with the same rules. You keep their tiles and their team's score.</span>
        </span>
      </label>
      <button class="btn btn--block push-down" :disabled="state.busy" @click="findGame(strangerRules, midway)">Find a game</button>
    </section>

    <section class="panel">
      <h2 class="panel-title">Private table</h2>
      <p class="panel-text">Open a table and share its code, so you play with your own people.</p>
      <RulesPicker v-model="tableRules" />
      <button class="btn btn--block" :disabled="state.busy" @click="openTable(tableRules)">Create private table</button>
      <div class="divider">or join one</div>
      <form class="row" @submit.prevent="joinTable(code)">
        <div class="field">
          <label class="field-label" for="join-code">Invite code</label>
          <input
            id="join-code"
            v-model="code"
            class="input input--code"
            placeholder="ABC123"
            maxlength="6"
            autocomplete="off"
            aria-describedby="join-code-hint"
            required
          />
          <span id="join-code-hint" class="field-hint" :class="{ 'field-hint--error': codeHint }">
            {{ codeHint || "6 characters, from the host's lobby screen." }}
          </span>
        </div>
        <button class="btn btn--secondary" :disabled="state.busy || cleanCode.length !== 6">Join table</button>
      </form>
    </section>
  </div>
  <!-- Only accounts have one; guests never see it. -->
  <AccountPanel v-if="state.me?.username" />
</template>

<style scoped>
/* The way into the rules, above the two panels. */
.how-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: var(--space-2) var(--space-3);
  margin-bottom: var(--space-4);
  color: var(--white);
}

.how-hint {
  margin: 0;
}

/* Keeps the strangers panel's button level with the bottom of a taller neighbour. */
.push-down {
  margin-top: auto;
}

/* A switch: the checkbox stays in the page for keyboards and screen readers, drawn as a track. */
.toggle {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  cursor: pointer;
}

.toggle-input {
  position: absolute;
  opacity: 0;
  width: 1px;
  height: 1px;
}

.toggle-track {
  flex: none;
  position: relative;
  width: 2.6rem;
  height: 1.5rem;
  margin-top: 0.1rem;
  border-radius: var(--radius-pill);
  background: var(--line);
  transition: background-color 0.2s;
}

.toggle-thumb {
  position: absolute;
  top: 0.2rem;
  left: 0.2rem;
  width: 1.1rem;
  height: 1.1rem;
  border-radius: 50%;
  background: var(--white);
  box-shadow: var(--shadow-sm);
  transition: translate 0.2s;
}

.toggle-input:checked + .toggle-track {
  background: var(--color-primary);
}

.toggle-input:checked + .toggle-track .toggle-thumb {
  translate: 1.1rem 0;
}

.toggle-input:focus-visible + .toggle-track {
  outline: 3px solid var(--color-accent);
  outline-offset: 2px;
}

.toggle-text {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.toggle-label {
  font-weight: 700;
}
</style>
