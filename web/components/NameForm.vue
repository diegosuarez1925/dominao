<script setup lang="ts">
import { computed, ref } from "vue";
import { NAME_MAX, startSession, state } from "../session.ts";

const displayName = ref("");
const length = computed(() => displayName.value.trim().length);
</script>

<template>
  <section class="panel welcome">
    <h2 class="panel-title">¡Bienvenido!</h2>
    <p class="panel-text">Pick a name to play as a guest. No account needed.</p>
    <form class="row" @submit.prevent="startSession(displayName)">
      <div class="field">
        <label class="field-label" for="display-name">Your name</label>
        <input
          id="display-name"
          v-model="displayName"
          class="input"
          placeholder="e.g. Abuelo"
          :maxlength="NAME_MAX"
          autocomplete="nickname"
          aria-describedby="display-name-hint"
          required
        />
        <span id="display-name-hint" class="field-hint">Others at the table see this. Up to {{ NAME_MAX }} characters.</span>
      </div>
      <button class="btn" :disabled="state.busy || length === 0">Play as guest</button>
    </form>
  </section>
</template>

<style scoped>
.welcome {
  max-width: 32rem;
  margin: var(--space-6) auto 0;
}
</style>
