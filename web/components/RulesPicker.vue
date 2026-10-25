<script setup lang="ts">
// A drop-down of the rule sets, with a line on what the chosen one changes.
import { rulesDescription, rulesName, state } from "../session.ts";

const rules = defineModel<string>({ required: true });
const id = `rules-${Math.random().toString(36).slice(2, 8)}`;
</script>

<template>
  <div class="field">
    <label class="field-label" :for="id">Rules</label>
    <select :id="id" v-model="rules" class="select">
      <option v-for="row in state.rulesets" :key="row.rules" :value="row.rules">
        {{ rulesName(row.rules) }} (to {{ row.target }})
      </option>
    </select>
    <p class="field-hint">{{ rulesDescription(rules) }}</p>
  </div>
</template>
