<script setup lang="ts">
import { ref } from "vue";
import { findGame, joinTable, openTable } from "../session.ts";
import RulesPicker from "./RulesPicker.vue";

// Each panel keeps its own choice of rules; a table joined by code keeps its own.
const strangerRules = ref("DEFAULT");
const tableRules = ref("DEFAULT");
const code = ref("");
</script>

<template>
  <div class="grid-2">
    <section class="panel">
      <h2 class="panel-title">Play with strangers</h2>
      <p class="panel-text">
        We'll seat you with three other players who picked the same rules. Partners are drawn at random.
      </p>
      <RulesPicker v-model="strangerRules" />
      <button class="btn btn--block push-down" @click="findGame(strangerRules)">Find a game</button>
    </section>

    <section class="panel">
      <h2 class="panel-title">Private table</h2>
      <p class="panel-text">Open a table and share its code, so you play with your own people.</p>
      <RulesPicker v-model="tableRules" />
      <button class="btn btn--block" @click="openTable(tableRules)">Create private table</button>
      <div class="divider">or join one</div>
      <form class="row" @submit.prevent="joinTable(code)">
        <div class="field">
          <label class="field-label" for="join-code">Table code</label>
          <input
            id="join-code"
            v-model="code"
            class="input input--code"
            placeholder="ABC123"
            maxlength="6"
            autocomplete="off"
            required
          />
        </div>
        <button class="btn btn--secondary">Join table</button>
      </form>
    </section>
  </div>
</template>

<style scoped>
/* Keeps the strangers panel's button level with the bottom of a taller neighbour. */
.push-down {
  margin-top: auto;
}
</style>
