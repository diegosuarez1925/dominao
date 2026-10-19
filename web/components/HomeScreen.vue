<script setup lang="ts">
import { ref } from "vue";
import { joinTable, openTable } from "../session.ts";

const code = ref("");
</script>

<template>
  <section>
    <button @click="openTable">Create private table</button>
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
