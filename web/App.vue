<script setup lang="ts">
import { computed } from "vue";
import AppHeader from "./components/AppHeader.vue";
import GameScreen from "./components/GameScreen.vue";
import HomeScreen from "./components/HomeScreen.vue";
import MatchmakingLobby from "./components/MatchmakingLobby.vue";
import NameForm from "./components/NameForm.vue";
import TableLobby from "./components/TableLobby.vue";
import { state } from "./session.ts";

/**
 * Which screen to show. A game takes over from its table's lobby while it is played,
 * and stays after it ends until the guest goes back to the lobby or a new one starts.
 */
const screen = computed(() => {
  if (state.loading) return "loading";
  if (state.me === null) return "name";
  if (state.table && state.game && state.game.game !== state.dismissedGame) return "game";
  if (state.table) return "table";
  if (state.queue) return "queue";
  if (state.starting) return "starting";
  return "home";
});
</script>

<template>
  <AppHeader />
  <main class="page" :class="{ 'page--wide': screen === 'game' }">
    <Transition name="pop">
      <p v-if="state.message" class="notice" role="status">{{ state.message }}</p>
    </Transition>
    <!-- Screens fade and slide into each other; out-in so only one shows at a time. -->
    <Transition name="screen" mode="out-in">
      <NameForm v-if="screen === 'name'" />
      <HomeScreen v-else-if="screen === 'home'" />
      <TableLobby v-else-if="screen === 'table' && state.table" :table="state.table" />
      <MatchmakingLobby v-else-if="screen === 'queue' && state.queue" :queue="state.queue" />
      <section v-else-if="screen === 'starting'" class="lobby starting">
        <h2 class="screen-title">Starting your game…</h2>
        <span class="spinner" aria-hidden="true" />
      </section>
      <GameScreen v-else-if="screen === 'game' && state.game" :game="state.game" />
    </Transition>
  </main>
</template>

<style scoped>
.starting {
  align-items: center;
  padding-top: var(--space-7);
}
</style>
