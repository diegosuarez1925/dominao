<script setup lang="ts">
// The confirmation asked by confirmAction: what will happen, and two clear choices.
// Escape or a click outside counts as "no".
import { nextTick, ref, watch } from "vue";
import { dialog } from "../dialog.ts";

const stay = ref<HTMLButtonElement | null>(null);
watch(
  () => dialog.open,
  async (open) => {
    if (!open) return;
    await nextTick();
    stay.value?.focus();
  },
);
</script>

<template>
  <Transition name="pop">
    <div v-if="dialog.open" class="backdrop" @click.self="dialog.answer(false)" @keydown.esc="dialog.answer(false)">
      <section class="panel confirm" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
        <h2 id="confirm-title" class="panel-title">{{ dialog.title }}</h2>
        <p class="confirm-text">{{ dialog.text }}</p>
        <div class="row confirm-actions">
          <button ref="stay" class="btn btn--secondary" @click="dialog.answer(false)">Stay</button>
          <button class="btn" @click="dialog.answer(true)">{{ dialog.confirm }}</button>
        </div>
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

.confirm {
  width: min(26rem, 100%);
}

.confirm-text {
  margin: 0;
}

.confirm-actions {
  justify-content: flex-end;
}
</style>
