<script setup lang="ts">
// The password rules, ticked off as the person types. The server judges the password
// (so the page and the server never disagree); `ok` is true once every rule is met.
import { ref, watch } from "vue";
import { passwordWeaknesses } from "../session.ts";

const props = defineProps<{ username: string; password: string }>();
const ok = defineModel<boolean>("ok", { default: false });

/** The rules in the words the page uses, keyed by the server's names. */
const RULES = [
  { rule: "LENGTH", text: "10 or more characters" },
  { rule: "VARIETY", text: "Three of: lowercase, uppercase, a number, a symbol" },
  { rule: "CONTAINS_USERNAME", text: "Doesn't contain your username" },
  { rule: "COMMON", text: "Not a common password" },
] as const;
/** What the server said the password breaks; null until it has answered. */
const broken = ref<string[] | null>(null);
let asked = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
watch(
  () => [props.username, props.password],
  () => {
    clearTimeout(timer);
    ok.value = false;
    if (props.password.length === 0) {
      broken.value = null;
      return;
    }
    // Ask once typing pauses, and only keep the answer to the latest question.
    timer = setTimeout(async () => {
      const question = ++asked;
      const answer = await passwordWeaknesses(props.username, props.password);
      if (question !== asked) return;
      broken.value = answer;
      ok.value = answer !== null && answer.length === 0;
    }, 250);
  },
  { immediate: true },
);
</script>

<template>
  <ul class="rules" aria-live="polite">
    <li
      v-for="{ rule, text } in RULES"
      :key="rule"
      class="rule"
      :class="{ 'rule--met': broken !== null && !broken.includes(rule), 'rule--missed': broken?.includes(rule) }"
    >
      <span class="rule-mark" aria-hidden="true" />
      <span>{{ text }}</span>
      <span class="visually-hidden">{{ broken === null ? "" : broken.includes(rule) ? "(not yet)" : "(done)" }}</span>
    </li>
  </ul>
</template>

<style scoped>
/* The password rules: grey until judged, then green ticks or red dots. */
.rules {
  display: grid;
  gap: var(--space-1);
  margin: var(--space-1) 0 0;
  padding: 0;
  list-style: none;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.rule {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.rule-mark {
  flex: none;
  display: grid;
  place-items: center;
  width: 1.1rem;
  height: 1.1rem;
  border: 2px solid var(--line);
  border-radius: 50%;
  font-size: 0.7rem;
  line-height: 1;
  transition:
    background-color 0.15s,
    border-color 0.15s;
}

.rule--met {
  color: #2f6b3a;
}

.rule--met .rule-mark {
  border-color: #2f6b3a;
  background: #2f6b3a;
}

.rule--met .rule-mark::after {
  content: "✓";
  color: var(--white);
  font-weight: 800;
}

.rule--missed {
  color: var(--red-700);
}

.rule--missed .rule-mark {
  border-color: var(--red-600);
}

/* Read out by screen readers, not shown. */
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
