<script setup lang="ts">
// The rules beside the big Play button: a card showing the score to reach, which opens
// a list of every rule set to pick from. Escape or a click elsewhere closes the list.
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { rulesName, state } from "../session.ts";

const rules = defineModel<string>({ required: true });
const open = ref(false);
const root = ref<HTMLElement | null>(null);
const list = ref<HTMLElement | null>(null);
const id = `rules-${Math.random().toString(36).slice(2, 8)}`;
const chosen = computed(() => state.rulesets.find((row) => row.rules === rules.value));

function pick(value: string) {
  rules.value = value;
  open.value = false;
}

function outside(event: PointerEvent) {
  if (root.value && !root.value.contains(event.target as Node)) open.value = false;
}

watch(open, async (now) => {
  if (now) {
    document.addEventListener("pointerdown", outside);
    await nextTick();
    list.value?.querySelector<HTMLElement>("[aria-selected=true]")?.focus();
  } else {
    document.removeEventListener("pointerdown", outside);
  }
});
onBeforeUnmount(() => document.removeEventListener("pointerdown", outside));
</script>

<template>
  <div ref="root" class="rules-pick" @keydown.esc="open = false">
    <button
      class="rules-card"
      type="button"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-controls="id"
      :aria-label="`Rules: ${rulesName(rules)}, to ${chosen?.target ?? ''}. Change rules`"
      @click="open = !open"
    >
      <span class="rules-target">{{ chosen?.target ?? "…" }}</span>
      <span class="rules-name">{{ rulesName(rules) }}</span>
      <span class="rules-swap" aria-hidden="true">⇄</span>
    </button>
    <Transition name="pop">
      <ul v-if="open" :id="id" ref="list" class="rules-list" role="listbox" aria-label="Rules">
        <li v-for="row in state.rulesets" :key="row.rules">
          <button
            class="rules-option"
            :class="{ 'rules-option--on': row.rules === rules }"
            type="button"
            role="option"
            :aria-selected="row.rules === rules"
            @click="pick(row.rules)"
          >
            <span class="option-target">{{ row.target }}</span>
            <span class="option-text">
              <span class="option-name">{{ rulesName(row.rules) }}</span>
              <span class="option-description">{{ row.description }}</span>
            </span>
          </button>
        </li>
      </ul>
    </Transition>
  </div>
</template>

<style scoped>
.rules-pick {
  position: relative;
}

/* A square card, like a chip on the table, with the score to reach in big type. */
.rules-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 6.5rem;
  height: 100%;
  min-height: 5.5rem;
  padding: var(--space-2);
  border: 3px solid var(--white);
  border-radius: var(--radius-md);
  color: var(--red-800);
  background: linear-gradient(180deg, var(--blue-100), var(--blue-300));
  box-shadow:
    0 4px 0 #6fa6c2,
    var(--shadow-md);
  cursor: pointer;
  transition: transform 0.1s;
}

.rules-card:active {
  transform: translateY(3px);
  box-shadow: 0 1px 0 #6fa6c2;
}

.rules-card:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 3px;
}

.rules-target {
  font: 400 1.9rem/1 var(--font-display);
}

.rules-name {
  font: 800 0.9rem/1.2 var(--font-body);
}

.rules-swap {
  position: absolute;
  right: -0.5rem;
  bottom: -0.5rem;
  display: grid;
  place-items: center;
  width: 1.7rem;
  height: 1.7rem;
  border: 2px solid var(--white);
  border-radius: var(--radius-sm);
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--white);
  background: var(--color-primary);
}

.rules-list {
  position: absolute;
  z-index: 30;
  left: 0;
  bottom: calc(100% + var(--space-2));
  width: min(20rem, calc(100vw - 2 * var(--gutter)));
  margin: 0;
  padding: var(--space-2);
  list-style: none;
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: var(--shadow-md);
}

.rules-option {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-2);
  border: 2px solid transparent;
  border-radius: var(--radius-sm);
  text-align: left;
  font: inherit;
  color: var(--color-text);
  background: transparent;
  cursor: pointer;
}

.rules-option:hover,
.rules-option:focus-visible {
  background: var(--color-accent-soft);
  outline: none;
}

.rules-option--on {
  border-color: var(--color-accent);
}

.option-target {
  flex: none;
  width: 3rem;
  font: 400 1.2rem/1 var(--font-display);
  text-align: center;
  color: var(--color-primary);
}

.option-text {
  display: flex;
  flex-direction: column;
}

.option-name {
  font-weight: 800;
}

.option-description {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}
</style>
