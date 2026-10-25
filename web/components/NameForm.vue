<script setup lang="ts">
import { ref } from "vue";
import { startSession } from "../session.ts";

const displayName = ref("");
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
          maxlength="20"
          autocomplete="nickname"
          required
        />
      </div>
      <button class="btn">Play as guest</button>
    </form>
  </section>
</template>

<style scoped>
.welcome {
  max-width: 32rem;
  margin: var(--space-6) auto 0;
}
</style>
