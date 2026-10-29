<script setup lang="ts">
// The Friends section, opened from the side menu over the home screen: the friend list
// (online friends first), friend requests (find someone by username, and answer the
// requests sent to you) and game invites to friends' private tables. Opening a tab
// counts as seeing what is in it, so its bubble goes away.
import { computed, onBeforeUnmount, ref, watch } from "vue";
import type { FoundAccount } from "../api.ts";
import {
  acceptFriendRequest,
  acceptInvite,
  declineInvite,
  isOnline,
  markSeen,
  newInvites,
  newlyAccepted,
  newRequests,
  rejectFriendRequest,
  rulesName,
  searchAccounts,
  sendFriendRequest,
  state,
} from "../session.ts";

export type FriendsTab = "list" | "requests" | "invites";
const tab = defineModel<FriendsTab>("tab", { default: "list" });

const tabs = computed(() => [
  { tab: "list" as const, label: "Friend list", count: 0 },
  { tab: "requests" as const, label: "Friend requests", count: newRequests().length },
  { tab: "invites" as const, label: "Game invites", count: newInvites().length },
]);

// What was new when the section opened keeps a "New" tag while it stays open.
const seenBefore = { ...(state.friends?.seen[0] ?? { requests: 0, invites: 0, friends: 0 }) };

const PART = { list: "FRIENDS", requests: "REQUESTS", invites: "INVITES" } as const;
const looked = new Set<FriendsTab>();
const freshIn = (which: FriendsTab) =>
  which === "requests" ? newRequests().length : which === "invites" ? newInvites().length : newlyAccepted().length;
watch(
  [tab, () => freshIn(tab.value)],
  () => {
    if (looked.has(tab.value) && freshIn(tab.value) === 0) return;
    looked.add(tab.value);
    void markSeen(PART[tab.value]);
  },
  { immediate: true },
);

const friends = computed(() =>
  [...(state.friends?.friends ?? [])].sort(
    (a, b) => Number(isOnline(b)) - Number(isOnline(a)) || a.username.localeCompare(b.username),
  ),
);
const onlineCount = computed(() => friends.value.filter(isOnline).length);
const incoming = computed(() => state.friends?.incoming ?? []);
const outgoing = computed(() => state.friends?.outgoing ?? []);
const invites = computed(() => state.friends?.invites ?? []);

// Searching usernames, a moment after typing stops.
const query = ref("");
const found = ref<FoundAccount[]>([]);
const searching = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;
watch(query, (text) => {
  clearTimeout(timer);
  if (text.trim() === "") {
    found.value = [];
    searching.value = false;
    return;
  }
  searching.value = true;
  timer = setTimeout(async () => {
    const answer = await searchAccounts(text);
    if (query.value === text) {
      found.value = answer;
      searching.value = false;
    }
  }, 250);
});
onBeforeUnmount(() => clearTimeout(timer));

/** Where the account stands with someone found by the search. */
function standing(player: string) {
  if (friends.value.some((row) => row.player === player)) return "friends";
  if (outgoing.value.some((row) => row.to === player)) return "asked";
  const theirs = incoming.value.find((row) => row.from === player);
  if (theirs !== undefined) return theirs.request;
  return "none";
}

const seatsTaken = (invite: (typeof invites.value)[number]) => invite.seats.length;
const initial = (username: string) => username.charAt(0).toUpperCase();
</script>

<template>
  <section class="panel friends" aria-labelledby="friends-title">
    <h2 id="friends-title" class="panel-title">Friends</h2>

    <div class="friends-tabs" role="tablist" aria-label="Friends">
      <button
        v-for="option in tabs"
        :id="`friends-tab-${option.tab}`"
        :key="option.tab"
        class="friends-tab"
        :class="{ 'friends-tab--on': tab === option.tab }"
        role="tab"
        type="button"
        :aria-selected="tab === option.tab"
        aria-controls="friends-panel"
        @click="tab = option.tab"
      >
        {{ option.label }}
        <span v-if="option.count > 0" class="count-bubble" :aria-label="`${option.count} new`">{{ option.count }}</span>
      </button>
    </div>

    <div id="friends-panel" class="friends-body" role="tabpanel" :aria-labelledby="`friends-tab-${tab}`">
      <!-- Friend list -->
      <template v-if="tab === 'list'">
        <p v-if="friends.length > 0" class="field-hint">
          {{ friends.length }} {{ friends.length === 1 ? "friend" : "friends" }}, {{ onlineCount }} online
        </p>
        <ul v-if="friends.length > 0" class="people">
          <li v-for="friend in friends" :key="friend.player" class="person">
            <span class="person-pic">
              <span class="avatar" aria-hidden="true">{{ initial(friend.username) }}</span>
              <span class="online-dot person-dot" :class="{ 'online-dot--off': !isOnline(friend) }" aria-hidden="true" />
            </span>
            <span class="person-text">
              <span class="person-name">{{ friend.username }}</span>
              <span class="person-note" :class="{ 'person-note--on': isOnline(friend) }">
                {{ isOnline(friend) ? "Online" : "Offline" }}
              </span>
            </span>
            <span v-if="friend.asker === state.me?.player && friend.since > seenBefore.friends" class="new-tag">New</span>
          </li>
        </ul>
        <p v-else class="empty">No friends yet. Find someone by their username under Friend requests.</p>
      </template>

      <!-- Friend requests -->
      <template v-else-if="tab === 'requests'">
        <div class="field">
          <label class="field-label" for="friend-search">Add a friend</label>
          <input
            id="friend-search"
            v-model="query"
            class="input"
            placeholder="Search by username"
            autocomplete="off"
            maxlength="20"
            aria-describedby="friend-search-hint"
          />
          <span id="friend-search-hint" class="field-hint">Only people with an account can be friends.</span>
        </div>
        <ul v-if="found.length > 0" class="people" aria-label="Search results">
          <li v-for="account in found" :key="account.player" class="person">
            <span class="avatar" aria-hidden="true">{{ initial(account.username) }}</span>
            <span class="person-text"><span class="person-name">{{ account.username }}</span></span>
            <span v-if="standing(account.player) === 'friends'" class="person-state">Friends</span>
            <span v-else-if="standing(account.player) === 'asked'" class="person-state">Request sent</span>
            <button
              v-else-if="standing(account.player) !== 'none'"
              class="btn btn--small"
              :disabled="state.busy"
              @click="acceptFriendRequest(standing(account.player))"
            >
              Accept their request
            </button>
            <button v-else class="btn btn--small" :disabled="state.busy" @click="sendFriendRequest(account.username)">
              Add friend
            </button>
          </li>
        </ul>
        <p v-else-if="query.trim() !== '' && !searching" class="empty">No account's username starts with "{{ query.trim() }}".</p>

        <h3 class="friends-subtitle">Requests for you</h3>
        <ul v-if="incoming.length > 0" class="people">
          <li v-for="row in incoming" :key="row.request" class="person">
            <span class="avatar" aria-hidden="true">{{ initial(row.username) }}</span>
            <span class="person-text">
              <span class="person-name">{{ row.username }}</span>
              <span class="person-note">wants to be your friend</span>
            </span>
            <span v-if="row.sentAt > seenBefore.requests" class="new-tag">New</span>
            <span class="person-actions">
              <button class="btn btn--small" :disabled="state.busy" @click="acceptFriendRequest(row.request)">Accept</button>
              <button class="btn btn--small btn--secondary" :disabled="state.busy" @click="rejectFriendRequest(row.request)">
                Reject
              </button>
            </span>
          </li>
        </ul>
        <p v-else class="empty">No requests right now. Requests run out after a week.</p>

        <template v-if="outgoing.length > 0">
          <h3 class="friends-subtitle">Waiting for an answer</h3>
          <ul class="people">
            <li v-for="row in outgoing" :key="row.request" class="person person--quiet">
              <span class="avatar" aria-hidden="true">{{ initial(row.username) }}</span>
              <span class="person-text"><span class="person-name">{{ row.username }}</span></span>
              <span class="person-state">Request sent</span>
            </li>
          </ul>
        </template>
      </template>

      <!-- Game invites -->
      <template v-else>
        <ul v-if="invites.length > 0" class="people">
          <li v-for="row in invites" :key="row.invite" class="person">
            <span class="avatar" aria-hidden="true">{{ initial(row.username) }}</span>
            <span class="person-text">
              <span class="person-name">{{ row.username }}</span>
              <span class="person-note">
                {{ rulesName(row.rules || "DEFAULT") }} rules · {{ seatsTaken(row) }} of 4 seated
              </span>
            </span>
            <span v-if="row.sentAt > seenBefore.invites" class="new-tag">New</span>
            <span class="person-actions">
              <button class="btn btn--small" :disabled="state.busy || seatsTaken(row) >= 4" @click="acceptInvite(row.invite)">
                {{ seatsTaken(row) >= 4 ? "Full" : "Join" }}
              </button>
              <button class="btn btn--small btn--secondary" :disabled="state.busy" @click="declineInvite(row.invite)">
                Decline
              </button>
            </span>
          </li>
        </ul>
        <p v-else class="empty">No invites right now. When a friend invites you to their table, it shows up here.</p>
      </template>
    </div>
  </section>
</template>

<style scoped>
.friends {
  width: min(34rem, 100%);
  max-height: calc(100dvh - 2 * var(--gutter));
  overflow-y: auto;
}

.friends .panel-title {
  padding-right: var(--space-6);
}

.friends-tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-1);
  padding: var(--space-1);
  border-radius: var(--radius-md);
  background: var(--line);
}

.friends-tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  min-height: 2.75rem;
  padding: var(--space-1) var(--space-2);
  border: 0;
  border-radius: var(--radius-sm);
  font: 800 0.85rem/1.15 var(--font-body);
  color: var(--color-text-muted);
  background: transparent;
  cursor: pointer;
}

.friends-tab:focus-visible {
  outline: 3px solid var(--color-focus);
}

.friends-tab--on {
  color: var(--red-800);
  background: var(--white);
  box-shadow: var(--shadow-sm);
}

.friends-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.friends-subtitle {
  margin: var(--space-2) 0 0;
  font-size: 0.95rem;
  font-weight: 800;
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
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2) var(--space-3);
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
  min-width: 8rem;
  line-height: 1.2;
}

.person-name {
  overflow: hidden;
  font-weight: 800;
  text-overflow: ellipsis;
}

.person-note {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.person-note--on {
  font-weight: 700;
  color: #2f7d45;
}

.person-state {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-text-muted);
}

.person-actions {
  display: flex;
  gap: var(--space-2);
  margin-left: auto;
}

.new-tag {
  padding: 0.05rem 0.45rem;
  border-radius: var(--radius-pill);
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--white);
  background: #d9302c;
}

.empty {
  margin: 0;
  color: var(--color-text-muted);
}
</style>
