<script setup lang="ts">
import { confirmAction } from "../dialog.ts";
import { endSession, state } from "../session.ts";

/** Signing out also leaves the table or the queue, so say so first when it matters. */
async function signOut() {
  const playing = state.game?.status === "ACTIVE" && state.game.game !== state.dismissedGame;
  if (playing || state.table || state.queue) {
    const yes = await confirmAction({
      title: "Sign out?",
      text: playing
        ? "You'll leave your table, and the game will stop for all four players."
        : state.table
          ? "You'll leave your table."
          : "You'll stop waiting for a game.",
      confirm: "Sign out",
    });
    if (!yes) return;
  }
  await endSession();
}
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
      <button class="btn btn--ghost btn--small" title="End your guest session" @click="signOut">Sign out</button>
    </div>
  </header>
</template>
