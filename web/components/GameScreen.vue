<script setup lang="ts">
import { computed } from "vue";
import type { Game } from "../api.ts";
import { rulesName, state } from "../session.ts";
import GameBoard from "./GameBoard.vue";
import MoveLog from "./MoveLog.vue";
import PlayerHand from "./PlayerHand.vue";

const props = defineProps<{ game: Game }>();

const name = (session: string) => props.game.players.find((p) => p.player === session)?.displayName ?? "?";
/** The names of a team: seats 0 and 2 are team 0, seats 1 and 3 team 1. */
const team = (seatOrTeam: number) =>
  props.game.players
    .filter((p) => p.position % 2 === seatOrTeam % 2)
    .map((p) => p.displayName)
    .join(" & ");

const myTurn = computed(() => props.game.status === "ACTIVE" && props.game.turnPlayer === state.me?.session);

/** How the last match ended, and the whole game if it is over. */
const result = computed(() => {
  const { game } = props;
  if (game.status === "ABANDONED") return "This game was stopped because a player left the table.";
  const last = game.lastResult[0];
  let message = "";
  if (last !== undefined) {
    const how = last.ending === "DOMINO" ? `${name(last.winner)} played their last tile` : "Tranque! Nobody could play";
    message =
      last.team === -1
        ? `Match ${last.matchNumber}: ${how}, and it was a tie, so nobody scores.`
        : `Match ${last.matchNumber}: ${how}. ${team(last.team)} score ${last.points}` +
          (last.prize > 0 ? `, including a prize of ${last.prize}.` : ".");
  }
  if (game.status === "FINISHED") message += ` ${team(game.scoreA >= game.target ? 0 : 1)} win the game!`;
  return message;
});
</script>

<template>
  <section>
    <p :title="game.rulesDescription">{{ rulesName(game.rules) }} rules. {{ game.rulesDescription }}</p>
    <p>
      {{ team(0) }}: {{ game.scoreA }} · {{ team(1) }}: {{ game.scoreB }} · first to {{ game.target }} · match
      {{ game.matchNumber }}
    </p>
    <p>{{ result }}</p>
    <ol start="0">
      <li
        v-for="p in game.players"
        :key="p.player"
        :class="{ current: game.status === 'ACTIVE' && p.player === game.turnPlayer }"
      >
        {{ p.displayName }}<template v-if="p.player === state.me?.session"> (you)</template>: {{ p.tileCount }} tiles
        <template v-if="game.status === 'ACTIVE' && p.player === game.turnPlayer"> ← playing</template>
      </li>
    </ol>
    <h3>Board</h3>
    <GameBoard :board="game.board" />
    <h3>Your hand</h3>
    <PlayerHand :hand="game.hand" :board="game.board" :my-turn="myTurn" />
    <h3>Moves</h3>
    <MoveLog :log="game.log" />
  </section>
</template>

<style scoped>
.current {
  font-weight: bold;
}
</style>
