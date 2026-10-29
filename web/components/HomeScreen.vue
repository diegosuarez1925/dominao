<script setup lang="ts">
// The home screen: pick public or private games, each with its picture front and
// centre, the rules beside one big button, and (for an account) a side menu.
import { computed, nextTick, ref, watch } from "vue";
import { CODE_PATTERN, findGame, joinTable, newInvites, newRequests, openTable, rulesName, state } from "../session.ts";
import FriendToasts from "./FriendToasts.vue";
import HowToPlay from "./HowToPlay.vue";
import PrivateArt from "./PrivateArt.vue";
import PublicArt from "./PublicArt.vue";
import RulesButton from "./RulesButton.vue";
import SideMenu from "./SideMenu.vue";

type Tab = "public" | "private";
const tabs: { tab: Tab; label: string }[] = [
  { tab: "public", label: "Public games" },
  { tab: "private", label: "Private games" },
];
// The tab last used, remembered on this device.
const TAB_KEY = "dominao.homeTab";
const tab = ref<Tab>("public");
try {
  if (localStorage.getItem(TAB_KEY) === "private") tab.value = "private";
} catch {}
watch(tab, (now) => {
  try {
    localStorage.setItem(TAB_KEY, now);
  } catch {}
});

// Each tab keeps its own choice of rules; a table joined by code keeps its own.
const strangerRules = ref("DEFAULT");
const tableRules = ref("DEFAULT");
const target = (rules: string) => state.rulesets.find((row) => row.rules === rules)?.target;
const code = ref("");
const howOpen = ref(false);
// Joining by code happens in a pop-up, with the cursor already in the code box.
const joinOpen = ref(false);
const codeInput = ref<HTMLInputElement | null>(null);
watch(joinOpen, async (now) => {
  if (!now) return;
  await nextTick();
  codeInput.value?.focus();
});
const menuOpen = ref(false);
/** New friend requests and invites, counted on the menu button. */
const fresh = computed(() => newRequests().length + newInvites().length);
// Whether the player is happy to be dropped into a game of strangers already going on,
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
/** Shown once the player has typed a whole code that can't be one. */
const codeHint = computed(() =>
  cleanCode.value.length === 6 && !CODE_PATTERN.test(cleanCode.value)
    ? "Codes use letters and the digits 2 to 9 (no I, O, 0 or 1)."
    : "",
);
</script>

<template>
  <div class="home">
    <div class="home-top">
      <button
        v-if="state.me?.username"
        class="round-btn menu-btn"
        :aria-label="fresh > 0 ? `Open menu (${fresh} new)` : 'Open menu'"
        :aria-expanded="menuOpen"
        @click="menuOpen = true"
      >
        <span class="burger" aria-hidden="true"><span /><span /><span /></span>
        <span v-if="fresh > 0" class="count-bubble menu-btn-count" aria-hidden="true">{{ fresh }}</span>
      </button>
      <div class="tabs" role="tablist" aria-label="Kind of game">
        <button
          v-for="option in tabs"
          :id="`tab-${option.tab}`"
          :key="option.tab"
          class="tab"
          :class="{ 'tab--on': tab === option.tab }"
          role="tab"
          type="button"
          :aria-selected="tab === option.tab"
          aria-controls="home-panel"
          @click="tab = option.tab"
        >
          {{ option.label }}
        </button>
      </div>
      <button class="round-btn" aria-label="How to play" title="How to play" @click="howOpen = true">?</button>
    </div>

    <section id="home-panel" class="home-panel" role="tabpanel" :aria-labelledby="`tab-${tab}`">
      <Transition name="screen" mode="out-in">
        <div :key="tab" class="stage">
          <PublicArt v-if="tab === 'public'" class="stage-art" />
          <PrivateArt v-else class="stage-art" />
          <h2 class="stage-title">{{ tab === "public" ? "Play the world" : "Play with your people" }}</h2>
          <p class="stage-text">
            {{
              tab === "public"
                ? "We'll seat you with three players from anywhere who picked the same rules. Partners are drawn at random."
                : "Open a table and share its code with family and friends. You choose who partners with whom."
            }}
          </p>
        </div>
      </Transition>

      <div class="play-bar">
        <RulesButton v-if="tab === 'public'" v-model="strangerRules" />
        <RulesButton v-else v-model="tableRules" />
        <button
          v-if="tab === 'public'"
          class="big-btn"
          :disabled="state.busy"
          @click="findGame(strangerRules, midway)"
        >
          <span class="big-btn-title">Play</span>
          <span class="big-btn-sub">Public table · {{ rulesName(strangerRules) }} to {{ target(strangerRules) }}</span>
        </button>
        <button v-else class="big-btn" :disabled="state.busy" @click="openTable(tableRules)">
          <span class="big-btn-title big-btn-title--long">Create private table</span>
          <span class="big-btn-sub">{{ rulesName(tableRules) }} to {{ target(tableRules) }}</span>
        </button>
      </div>

      <label v-if="tab === 'public'" class="toggle extra">
        <input v-model="midway" type="checkbox" class="toggle-input" />
        <span class="toggle-track" aria-hidden="true"><span class="toggle-thumb" /></span>
        <span class="toggle-text">
          <span class="toggle-label">Join games in progress</span>
          <span class="field-hint">Take over the seat of someone who left a game with the same rules. You keep their tiles and their team's score.</span>
        </span>
      </label>

      <template v-else>
        <div class="or-line" aria-hidden="true">or</div>
        <button class="big-btn big-btn--light" :disabled="state.busy" @click="joinOpen = true">
          <span class="big-btn-title big-btn-title--long">Join private table</span>
          <span class="big-btn-sub">With the code from the host</span>
        </button>
      </template>
    </section>
  </div>
  <Transition name="pop">
    <div v-if="joinOpen" class="backdrop" @click.self="joinOpen = false" @keydown.esc="joinOpen = false">
      <form class="panel join" role="dialog" aria-modal="true" aria-labelledby="join-title" @submit.prevent="joinTable(code)">
        <header class="join-head">
          <h2 id="join-title" class="panel-title">Join private table</h2>
          <button type="button" class="join-close" aria-label="Close" @click="joinOpen = false">×</button>
        </header>
        <div class="field">
          <label class="field-label" for="join-code">Invite code</label>
          <input
            id="join-code"
            ref="codeInput"
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
        <button class="btn btn--block" :disabled="state.busy || cleanCode.length !== 6">Join table</button>
      </form>
    </div>
  </Transition>
  <HowToPlay v-model:open="howOpen" />
  <SideMenu v-if="state.me?.username" v-model:open="menuOpen" />
  <FriendToasts v-if="state.me?.username" />
</template>

<style scoped>
/* One column, phone-like even on a wide screen, as in game apps. */
.home {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  max-width: 34rem;
  margin: 0 auto;
}

.home-top {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

/* A round button on the red background: the menu, and how to play. */
.round-btn {
  flex: none;
  display: grid;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  border: 2px solid rgb(255 255 255 / 0.6);
  border-radius: 50%;
  font: 400 1.2rem/1 var(--font-display);
  color: var(--white);
  background: rgb(0 0 0 / 0.15);
  cursor: pointer;
}

.round-btn:hover {
  background: rgb(255 255 255 / 0.12);
}

.round-btn:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 2px;
}

.menu-btn {
  position: relative;
}

.menu-btn-count {
  position: absolute;
  top: -0.35rem;
  right: -0.35rem;
}

.burger {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.burger span {
  display: block;
  width: 1.1rem;
  height: 2px;
  border-radius: 1px;
  background: currentColor;
}

/* The two kinds of game, as one pill with the chosen half filled. */
.tabs {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-1);
  padding: var(--space-1);
  border-radius: var(--radius-pill);
  background: rgb(0 0 0 / 0.22);
}

.tab {
  min-height: 2.5rem;
  padding: var(--space-1) var(--space-2);
  border: 0;
  border-radius: var(--radius-pill);
  font: 800 0.95rem/1.15 var(--font-body);
  color: rgb(255 255 255 / 0.85);
  background: transparent;
  cursor: pointer;
  transition:
    background-color 0.15s,
    color 0.15s;
}

.tab:hover {
  color: var(--white);
}

.tab:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 1px;
}

.tab--on,
.tab--on:hover {
  color: var(--red-800);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.home-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

/* The picture, front and centre, on a lit card. */
.stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-4) var(--space-4) var(--space-5);
  border-radius: var(--radius-lg);
  text-align: center;
  background: radial-gradient(120% 90% at 50% 30%, var(--white), var(--color-surface) 55%, #f1e4da);
  box-shadow: var(--shadow-md);
}

.stage-art {
  max-width: 26rem;
}

.stage-title {
  margin: var(--space-2) 0 0;
  font: 400 clamp(1.4rem, 5vw, 1.8rem) / 1.1 var(--font-display);
  color: var(--color-primary);
}

.stage-text {
  max-width: 26rem;
  margin: var(--space-2) 0 0;
  color: var(--color-text-muted);
}

/* The rules card, then the one big button, in one bar. */
.play-bar {
  display: flex;
  align-items: stretch;
  gap: var(--space-3);
}

.big-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  min-height: 5.5rem;
  padding: var(--space-2) var(--space-4);
  border: 3px solid var(--white);
  border-radius: var(--radius-md);
  color: var(--white);
  background: linear-gradient(180deg, var(--red-500), var(--red-600) 60%, var(--red-700));
  box-shadow:
    0 4px 0 var(--red-900),
    var(--shadow-md);
  cursor: pointer;
  transition: transform 0.1s;
}

.big-btn:active {
  transform: translateY(3px);
  box-shadow: 0 1px 0 var(--red-900);
}

.big-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.big-btn:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 3px;
}

.big-btn-title {
  font: 400 clamp(1.8rem, 7vw, 2.3rem) / 1 var(--font-display);
  text-shadow: 0 2px 0 var(--red-900);
}

.big-btn-title--long {
  font-size: clamp(1.1rem, 4.5vw, 1.45rem);
  line-height: 1.15;
}

.big-btn-sub {
  font: 700 0.9rem/1.2 var(--font-body);
  opacity: 0.9;
}

/* The line under the bar on Public: the switch, on a light card. */
.extra {
  padding: var(--space-4);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

/* "—— OR ——" between creating and joining, on the red background. */
.or-line {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font: 400 1rem/1 var(--font-display);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--white);
}

.or-line::before,
.or-line::after {
  content: "";
  flex: 1;
  border-top: 2px solid rgb(255 255 255 / 0.55);
}

/* The join button: as big as Create, but white, so the two read as a pair. */
.big-btn--light {
  min-height: 4.5rem;
  border-color: var(--red-600);
  color: var(--red-700);
  background: linear-gradient(180deg, var(--white), var(--color-surface) 60%, #efe1d6);
  box-shadow:
    0 4px 0 var(--red-800),
    var(--shadow-md);
}

.big-btn--light:active {
  box-shadow: 0 1px 0 var(--red-800);
}

.big-btn--light .big-btn-title {
  text-shadow: none;
}

.backdrop {
  position: fixed;
  z-index: 40;
  inset: 0;
  display: grid;
  place-items: center;
  padding: var(--gutter);
  background: rgb(40 8 10 / 0.55);
}

.join {
  width: min(24rem, 100%);
}

.join-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.join-close {
  padding: 0 var(--space-2);
  border: none;
  font-size: 1.75rem;
  line-height: 1;
  color: var(--color-text-muted);
  background: none;
  cursor: pointer;
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
