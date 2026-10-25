<script setup lang="ts">
import { endSession, state } from "../session.ts";
</script>

<template>
  <header class="app-header">
    <h1 class="logo">DOMINAO<span class="logo-accent">!</span></h1>
    <div v-if="state.me" class="chip">
      <span class="avatar" aria-hidden="true">{{ state.me.displayName.charAt(0).toUpperCase() }}</span>
      <span class="chip-text">
        <span class="chip-label">Playing as</span>
        <span class="chip-name">{{ state.me.displayName }}</span>
      </span>
      <button class="btn btn--ghost btn--small" @click="endSession">Leave</button>
    </div>
  </header>
</template>
