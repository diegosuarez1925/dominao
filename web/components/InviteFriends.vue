<script setup lang="ts">
// The host's list of friends to invite to their private table, online friends first.
// A friend already invited, or already sitting here, says so instead of offering again.
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import type { Table } from "../api.ts";
import { inviteFriend, isOnline, state } from "../session.ts";

const props = defineProps<{ table: Table }>();
const open = defineModel<boolean>("open", { default: false });
const close = ref<HTMLButtonElement | null>(null);
watch(open, async (now) => {
  if (!now) return;
  await nextTick();
  close.value?.focus();
});

const friends = computed(() =>
  [...(state.friends?.friends ?? [])].sort(
    (a, b) => Number(isOnline(b)) - Number(isOnline(a)) || a.username.localeCompare(b.username),
  ),
);
function standing(player: string) {
  if (props.table.seats.some((seat) => seat.player === player)) return "here";
  if (state.friends?.sent.some((row) => row.to === player && row.table === props.table.table)) return "invited";
  return "none";
}
// Escape closes it even when the button that had focus went away (it turned into a note).
function onKey(event: KeyboardEvent) {
  if (event.key === "Escape" && open.value) open.value = false;
}
window.addEventListener("keydown", onKey);
onBeforeUnmount(() => window.removeEventListener("keydown", onKey));
</script>

<template>
  <Transition name="pop">
    <div v-if="open" class="invite-backdrop" @click.self="open = false">
      <section class="panel invite" role="dialog" aria-modal="true" aria-labelledby="invite-title">
        <header class="invite-head">
          <h2 id="invite-title" class="panel-title">Invite friends</h2>
          <button ref="close" class="invite-close" aria-label="Close" @click="open = false">×</button>
        </header>
        <p class="panel-text">They'll get a note to join this table. The invite lasts until the game starts.</p>
        <ul v-if="friends.length > 0" class="people">
          <li v-for="friend in friends" :key="friend.player" class="person">
            <span class="person-pic">
              <span class="avatar" aria-hidden="true">{{ friend.username.charAt(0).toUpperCase() }}</span>
              <span class="online-dot person-dot" :class="{ 'online-dot--off': !isOnline(friend) }" aria-hidden="true" />
            </span>
            <span class="person-text">
              <span class="person-name">{{ friend.username }}</span>
              <span class="person-note">{{ isOnline(friend) ? "Online" : "Offline" }}</span>
            </span>
            <span v-if="standing(friend.player) === 'here'" class="person-state">At the table</span>
            <span v-else-if="standing(friend.player) === 'invited'" class="person-state">Invited ✓</span>
            <button v-else class="btn btn--small" :disabled="state.busy" @click="inviteFriend(friend.player)">Invite</button>
          </li>
        </ul>
        <p v-else class="panel-text">
          You have no friends to invite yet. Add some from Friends in the menu on the home screen, or share the code.
        </p>
      </section>
    </div>
  </Transition>
</template>

<style scoped>
.invite-backdrop {
  position: fixed;
  z-index: 40;
  inset: 0;
  display: grid;
  place-items: center;
  padding: var(--gutter);
  background: rgb(40 8 10 / 0.55);
}

.invite {
  width: min(26rem, 100%);
  max-height: calc(100dvh - 2 * var(--gutter));
  overflow-y: auto;
  gap: var(--space-3);
}

.invite-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.invite-close {
  padding: 0 var(--space-1);
  border: none;
  font-size: 1.6rem;
  line-height: 1;
  color: var(--color-text-muted);
  background: none;
  cursor: pointer;
}

.people {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.person {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--line);
}

.person:last-child {
  border-bottom: 0;
}

.person-pic {
  position: relative;
  flex: none;
}

.person-dot {
  position: absolute;
  right: -1px;
  bottom: -1px;
  box-shadow: 0 0 0 2px var(--color-surface);
}

.person-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  line-height: 1.2;
}

.person-name {
  overflow: hidden;
  font-weight: 800;
  text-overflow: ellipsis;
}

.person-note,
.person-state {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.person-state {
  font-weight: 700;
}
</style>
