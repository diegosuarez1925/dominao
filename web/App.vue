<script setup lang="ts">
import AppHeader from "./components/AppHeader.vue";
import GameScreen from "./components/GameScreen.vue";
import HomeScreen from "./components/HomeScreen.vue";
import MatchmakingLobby from "./components/MatchmakingLobby.vue";
import NameForm from "./components/NameForm.vue";
import TableLobby from "./components/TableLobby.vue";
import { state } from "./session.ts";
</script>

<template>
  <AppHeader />
  <main class="page">
    <p v-if="state.message" class="notice" role="status">{{ state.message }}</p>
    <template v-if="!state.loading">
      <NameForm v-if="state.me === null" />
      <template v-else>
        <!-- Lobbies and the game are not restyled yet; a panel keeps them readable. -->
        <div v-if="state.table" class="panel"><TableLobby :table="state.table" /></div>
        <div v-else-if="state.queue" class="panel"><MatchmakingLobby :queue="state.queue" /></div>
        <div v-else-if="state.starting" class="panel"><p>Starting your game…</p></div>
        <HomeScreen v-else />
        <!-- A game is shown while it is played, and after it ends until a new one starts. -->
        <div v-if="state.game" class="panel game-panel"><GameScreen :game="state.game" /></div>
      </template>
    </template>
  </main>
</template>

<style scoped>
.game-panel {
  margin-top: var(--space-5);
}
</style>
