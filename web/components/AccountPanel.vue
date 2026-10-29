<script setup lang="ts">
// The account's own corner of the home screen, shown only to someone logged in to an
// account. For now it changes the password and deletes the account; friends and past
// games will join it later as more sections.
import { ref } from "vue";
import { confirmAction } from "../dialog.ts";
import { changePassword, deleteAccount, state } from "../session.ts";
import PasswordRules from "./PasswordRules.vue";

type Section = "password" | "delete";
/** The section that is open; one at a time keeps the panel short. */
const open = ref<Section | null>(null);
const toggle = (section: Section) => {
  open.value = open.value === section ? null : section;
  current.value = "";
  next.value = "";
  confirmPassword.value = "";
  show.value = false;
};

const current = ref("");
const next = ref("");
const show = ref(false);
const nextOk = ref(false);

async function submitPassword() {
  if (await changePassword(current.value, next.value)) toggle("password");
}

const confirmPassword = ref("");

async function submitDelete() {
  const yes = await confirmAction({
    title: "Delete your account?",
    text: `${state.me?.username} will be gone for good, and anyone could take the username. You'll be signed out on every device and leave any table you're at.`,
    confirm: "Delete account",
  });
  if (yes) await deleteAccount(confirmPassword.value);
}
</script>

<template>
  <section class="panel account" aria-labelledby="account-title">
    <div class="account-head">
      <span class="account-avatar" aria-hidden="true">{{ state.me?.username?.charAt(0).toUpperCase() }}</span>
      <div>
        <h2 id="account-title" class="panel-title">Your account</h2>
        <p class="panel-text">Logged in as <strong class="account-name">{{ state.me?.username }}</strong></p>
      </div>
    </div>

    <div class="sections">
      <div class="section">
        <button
          class="section-toggle"
          type="button"
          :aria-expanded="open === 'password'"
          aria-controls="section-password"
          @click="toggle('password')"
        >
          <span>Change password</span>
          <span class="chevron" aria-hidden="true">›</span>
        </button>
        <Transition name="fold">
          <form v-if="open === 'password'" id="section-password" class="section-body" @submit.prevent="submitPassword">
            <p class="field-hint">Every other device signed in to this account will be signed out. This one stays in.</p>
            <div class="field">
              <label class="field-label" for="current-password">Current password</label>
              <input
                id="current-password"
                v-model="current"
                class="input"
                :type="show ? 'text' : 'password'"
                autocomplete="current-password"
                required
              />
            </div>
            <div class="field">
              <label class="field-label" for="new-password">New password</label>
              <input
                id="new-password"
                v-model="next"
                class="input"
                :type="show ? 'text' : 'password'"
                autocomplete="new-password"
                maxlength="128"
                aria-describedby="new-password-rules"
                required
              />
              <PasswordRules id="new-password-rules" v-model:ok="nextOk" :username="state.me?.username ?? ''" :password="next" />
              <span v-if="next !== '' && next === current" class="field-hint field-hint--error">
                The new password must differ from the current one.
              </span>
            </div>
            <label class="show">
              <input v-model="show" type="checkbox" />
              Show passwords
            </label>
            <button class="btn" :disabled="state.busy || current === '' || !nextOk || next === current">Change password</button>
          </form>
        </Transition>
      </div>

      <div class="section section--danger">
        <button
          class="section-toggle"
          type="button"
          :aria-expanded="open === 'delete'"
          aria-controls="section-delete"
          @click="toggle('delete')"
        >
          <span>Delete account</span>
          <span class="chevron" aria-hidden="true">›</span>
        </button>
        <Transition name="fold">
          <form v-if="open === 'delete'" id="section-delete" class="section-body" @submit.prevent="submitDelete">
            <p class="field-hint">This can't be undone. Type your password to confirm it's you.</p>
            <div class="field">
              <label class="field-label" for="delete-password">Password</label>
              <input id="delete-password" v-model="confirmPassword" class="input" type="password" autocomplete="current-password" required />
            </div>
            <button class="btn btn--danger" :disabled="state.busy || confirmPassword === ''">Delete account</button>
          </form>
        </Transition>
      </div>
    </div>
  </section>
</template>

<style scoped>
.account {
  margin-top: var(--space-5);
}

.account-head {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.account-avatar {
  flex: none;
  display: grid;
  place-items: center;
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  font: 400 1.4rem/1 var(--font-display);
  color: var(--color-primary);
  background: var(--color-accent-soft);
  border: 2px solid var(--color-accent);
}

.account-name {
  color: var(--color-text);
}

/* Each section is a row that opens in place. */
.sections {
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--line);
}

.section {
  border-bottom: 1px solid var(--line);
}

.section-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 3rem;
  padding: var(--space-2) var(--space-1);
  border: 0;
  font: 700 1rem/1.2 var(--font-body);
  color: var(--color-text);
  background: transparent;
  cursor: pointer;
}

.section-toggle:hover {
  color: var(--color-primary);
}

.section-toggle:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

.section--danger .section-toggle {
  color: var(--red-700);
}

.chevron {
  font-size: 1.4rem;
  line-height: 1;
  transition: transform 0.2s;
}

[aria-expanded="true"] .chevron {
  transform: rotate(90deg);
}

.section-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  max-width: 28rem;
  padding: 0 var(--space-1) var(--space-4);
}

.section-body .btn {
  align-self: flex-start;
}

.show {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 0.9rem;
  cursor: pointer;
}

/* Only for the one action that cannot be undone. */
.btn--danger {
  background: var(--red-800);
}

.btn--danger:hover {
  background: var(--red-900);
}
</style>
