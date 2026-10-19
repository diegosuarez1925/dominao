<script setup lang="ts">
import { ref } from "vue";
import { startSession } from "../session.ts";

const displayName = ref("");
</script>

<template>
  <form @submit.prevent="startSession(displayName)">
    <input v-model="displayName" placeholder="Your name" maxlength="20" required />
    <button>Play as guest</button>
  </form>
</template>
