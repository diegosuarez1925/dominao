<script setup lang="ts">
import { ref } from "vue";
import { findGame, joinTable, openTable, rulesDescription, rulesName, state } from "../session.ts";

const code = ref("");
// Both buttons play by the rules picked here; a table joined by code keeps its own.
const rules = ref("DEFAULT");
</script>

<template>
  <section>
    <label>
      Rules
      <select v-model="rules">
        <option v-for="row in state.rulesets" :key="row.rules" :value="row.rules">
          {{ rulesName(row.rules) }} (to {{ row.target }})
        </option>
      </select>
    </label>
    <p>{{ rulesDescription(rules) }}</p>
    <button @click="findGame(rules)">Play with strangers</button>
    <button @click="openTable(rules)">Create private table</button>
    <form @submit.prevent="joinTable(code)">
      <input v-model="code" placeholder="Join code" maxlength="6" required />
      <button>Join table</button>
    </form>
  </section>
</template>

<style scoped>
form {
  margin-top: 0.5rem;
}
</style>
