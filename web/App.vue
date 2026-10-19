<script setup lang="ts">
import GameScreen from "./components/GameScreen.vue";
import HomeScreen from "./components/HomeScreen.vue";
import NameForm from "./components/NameForm.vue";
import TableLobby from "./components/TableLobby.vue";
import { endSession, state } from "./session.ts";
</script>

<template>
  <h1>DOMINAO</h1>
  <template v-if="!state.loading">
    <NameForm v-if="state.me === null" />
    <template v-else>
      <p>¡Hola, {{ state.me.displayName }}! <button @click="endSession">Leave</button></p>
      <TableLobby v-if="state.table" :table="state.table" />
      <HomeScreen v-else />
      <!-- A game is shown while it is played, and after it ends until a new one starts. -->
      <GameScreen v-if="state.game" :game="state.game" />
    </template>
  </template>
  <p class="message">{{ state.message }}</p>
</template>
