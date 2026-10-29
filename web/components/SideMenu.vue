<script setup lang="ts">
// The side menu of an account: its sections open over the home screen. Account settings,
// Friends (with a bubble counting new requests and invites) and Stats are there.
import { computed, nextTick, ref, watch } from "vue";
import { newInvites, newRequests, state } from "../session.ts";
import AccountPanel from "./AccountPanel.vue";
import FriendsPanel, { type FriendsTab } from "./FriendsPanel.vue";
import StatsPanel from "./StatsPanel.vue";

const open = defineModel<boolean>("open", { default: false });
type Section = "account" | "friends" | "stats";
const CLOSE_LABEL: Record<Section, string> = {
  account: "Close account settings",
  friends: "Close friends",
  stats: "Close stats",
};
/** The section open over the home screen, if any; the home screen can open one too. */
const section = defineModel<Section | null>("section", { default: null });
const friendsTab = defineModel<FriendsTab>("friendsTab", { default: "list" });
const fresh = computed(() => newRequests().length + newInvites().length);
const first = ref<HTMLButtonElement | null>(null);
const closeSection = ref<HTMLButtonElement | null>(null);

watch(open, async (now) => {
  if (!now) return;
  await nextTick();
  first.value?.focus();
});

async function show(next: Section) {
  open.value = false;
  section.value = next;
  await nextTick();
  closeSection.value?.focus();
}
</script>

<template>
  <Transition name="drawer">
    <div v-if="open" class="menu-backdrop" @click.self="open = false" @keydown.esc="open = false">
      <nav class="menu" aria-label="Your account">
        <header class="menu-head">
          <span class="menu-avatar" aria-hidden="true">{{ state.me?.username?.charAt(0).toUpperCase() }}</span>
          <span class="menu-who">
            <span class="menu-label">Logged in as</span>
            <span class="menu-name">{{ state.me?.username }}</span>
          </span>
          <button class="menu-close" aria-label="Close menu" @click="open = false">×</button>
        </header>
        <ul class="menu-items">
          <li>
            <button ref="first" class="menu-item" @click="show('account')">
              <span class="menu-icon" aria-hidden="true">⚙</span>
              <span>Account settings</span>
            </button>
          </li>
          <li>
            <button class="menu-item" @click="show('friends')">
              <span class="menu-icon" aria-hidden="true">☺</span>
              <span>Friends</span>
              <span v-if="fresh > 0" class="count-bubble menu-count" :aria-label="`${fresh} new`">{{ fresh }}</span>
            </button>
          </li>
          <li>
            <button class="menu-item" @click="show('stats')">
              <span class="menu-icon" aria-hidden="true">▤</span>
              <span>Stats</span>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  </Transition>

  <Transition name="pop">
    <div v-if="section" class="overlay" @click.self="section = null" @keydown.esc="section = null">
      <div class="overlay-box" role="dialog" aria-modal="true" :aria-labelledby="`${section}-title`">
        <button
          ref="closeSection"
          class="overlay-close"
          :aria-label="CLOSE_LABEL[section]"
          @click="section = null"
        >
          ×
        </button>
        <AccountPanel v-if="section === 'account'" />
        <FriendsPanel v-else-if="section === 'friends'" v-model:tab="friendsTab" />
        <StatsPanel v-else-if="section === 'stats'" />
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.menu-backdrop,
.overlay {
  position: fixed;
  z-index: 40;
  inset: 0;
  background: rgb(40 8 10 / 0.55);
}

/* The menu slides in from the left, full height. */
.menu {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  width: min(19rem, 85vw);
  height: 100%;
  padding: var(--space-5) var(--space-4);
  background: var(--color-surface);
  box-shadow: var(--shadow-md);
}

.menu-head {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--line);
}

.menu-avatar {
  flex: none;
  display: grid;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  border: 2px solid var(--color-accent);
  border-radius: 50%;
  font: 400 1.2rem/1 var(--font-display);
  color: var(--color-primary);
  background: var(--color-accent-soft);
}

.menu-who {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.menu-label {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.menu-name {
  overflow: hidden;
  font-weight: 800;
  text-overflow: ellipsis;
}

.menu-close,
.overlay-close {
  flex: none;
  width: 2.25rem;
  height: 2.25rem;
  border: 0;
  border-radius: 50%;
  font-size: 1.5rem;
  line-height: 1;
  color: var(--color-text-muted);
  background: transparent;
  cursor: pointer;
}

.menu-close:hover,
.overlay-close:hover {
  background: var(--color-accent-soft);
}

.menu-items {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin: 0;
  padding: 0;
  list-style: none;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-height: 3rem;
  padding: var(--space-2) var(--space-3);
  border: 0;
  border-radius: var(--radius-sm);
  font: 700 1rem/1.2 var(--font-body);
  text-align: left;
  color: var(--color-text);
  background: transparent;
  cursor: pointer;
}

.menu-item:hover,
.menu-item:focus-visible {
  background: var(--color-accent-soft);
  outline: none;
}

.menu-icon {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: var(--radius-sm);
  font-size: 1.1rem;
  color: var(--color-primary);
  background: var(--color-accent-soft);
}

.menu-count {
  margin-left: auto;
}

/* A section opens centred over the home screen. */
.overlay {
  display: grid;
  place-items: center;
  padding: var(--gutter);
}

.overlay-box {
  position: relative;
  display: flex;
  justify-content: center;
  width: min(34rem, 100%);
}

.overlay-close {
  position: absolute;
  z-index: 1;
  top: var(--space-4);
  right: var(--space-4);
}

.drawer-enter-active,
.drawer-leave-active {
  transition: background-color 0.25s;
}

.drawer-enter-active .menu,
.drawer-leave-active .menu {
  transition: transform 0.25s ease;
}

.drawer-enter-from,
.drawer-leave-to {
  background-color: transparent;
}

.drawer-enter-from .menu,
.drawer-leave-to .menu {
  transform: translateX(-100%);
}

@media (prefers-reduced-motion: reduce) {
  .drawer-enter-active .menu,
  .drawer-leave-active .menu {
    transition: none;
  }
}
</style>
