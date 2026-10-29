<script setup lang="ts">
// The first page: play as a guest under any name, log in to an account, or make one.
import { computed, ref } from "vue";
import { logIn, NAME_MAX, say, signUp, startSession, state, USERNAME_PATTERN } from "../session.ts";
import PasswordRules from "./PasswordRules.vue";

type Mode = "guest" | "login" | "signup";
const modes: { mode: Mode; label: string }[] = [
  { mode: "guest", label: "Guest" },
  { mode: "login", label: "Log in" },
  { mode: "signup", label: "Sign up" },
];
const mode = ref<Mode>("guest");

const displayName = ref("");
const nameLength = computed(() => displayName.value.trim().length);

const username = ref("");
const password = ref("");
const showPassword = ref(false);
const usernameOk = computed(() => USERNAME_PATTERN.test(username.value.trim()));

const passwordOk = ref(false);

function choose(next: Mode) {
  mode.value = next;
  say("");
  showPassword.value = false;
}

async function submitLogIn() {
  if (await logIn(username.value, password.value)) password.value = "";
}

async function submitSignUp() {
  if (await signUp(username.value, password.value)) password.value = "";
}
</script>

<template>
  <section class="panel welcome">
    <h2 class="panel-title">¡Bienvenido!</h2>
    <div class="modes" role="tablist" aria-label="How to play">
      <button
        v-for="option in modes"
        :id="`mode-${option.mode}`"
        :key="option.mode"
        class="mode"
        :class="{ 'mode--on': mode === option.mode }"
        role="tab"
        type="button"
        :aria-selected="mode === option.mode"
        :aria-controls="`panel-${option.mode}`"
        @click="choose(option.mode)"
      >
        {{ option.label }}
      </button>
    </div>

    <Transition name="screen" mode="out-in">
      <form
        v-if="mode === 'guest'"
        id="panel-guest"
        key="guest"
        class="mode-panel"
        role="tabpanel"
        aria-labelledby="mode-guest"
        @submit.prevent="startSession(displayName)"
      >
        <p class="panel-text">Pick a name and play. No account needed.</p>
        <div class="field">
          <label class="field-label" for="display-name">Your name</label>
          <input
            id="display-name"
            v-model="displayName"
            class="input"
            placeholder="e.g. Abuelo"
            :maxlength="NAME_MAX"
            autocomplete="nickname"
            aria-describedby="display-name-hint"
            required
          />
          <span id="display-name-hint" class="field-hint">Others at the table see this. Up to {{ NAME_MAX }} characters.</span>
        </div>
        <button class="btn btn--block" :disabled="state.busy || nameLength === 0">Play as guest</button>
      </form>

      <form
        v-else-if="mode === 'login'"
        id="panel-login"
        key="login"
        class="mode-panel"
        role="tabpanel"
        aria-labelledby="mode-login"
        @submit.prevent="submitLogIn"
      >
        <p class="panel-text">Welcome back. Log in to play as yourself on this device.</p>
        <div class="field">
          <label class="field-label" for="login-username">Username</label>
          <input id="login-username" v-model="username" class="input" autocomplete="username" autocapitalize="none" spellcheck="false" required />
        </div>
        <div class="field">
          <label class="field-label" for="login-password">Password</label>
          <div class="secret">
            <input
              id="login-password"
              v-model="password"
              class="input"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              required
            />
            <button type="button" class="reveal" :aria-pressed="showPassword" @click="showPassword = !showPassword">
              {{ showPassword ? "Hide" : "Show" }}
            </button>
          </div>
        </div>
        <button class="btn btn--block" :disabled="state.busy || username.trim() === '' || password === ''">Log in</button>
      </form>

      <form
        v-else
        id="panel-signup"
        key="signup"
        class="mode-panel"
        role="tabpanel"
        aria-labelledby="mode-signup"
        @submit.prevent="submitSignUp"
      >
        <p class="panel-text">An account keeps you the same player on any device.</p>
        <div class="field">
          <label class="field-label" for="signup-username">Username</label>
          <input
            id="signup-username"
            v-model="username"
            class="input"
            placeholder="e.g. abuelo_pr"
            maxlength="20"
            autocomplete="username"
            autocapitalize="none"
            spellcheck="false"
            aria-describedby="signup-username-hint"
            required
          />
          <span
            id="signup-username-hint"
            class="field-hint"
            :class="{ 'field-hint--error': username.length > 0 && !usernameOk }"
          >
            Everyone sees this. 3 to 20 letters, numbers, <code>_</code> <code>.</code> or <code>-</code>, starting with a letter or number.
          </span>
        </div>
        <div class="field">
          <label class="field-label" for="signup-password">Password</label>
          <div class="secret">
            <input
              id="signup-password"
              v-model="password"
              class="input"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="new-password"
              aria-describedby="signup-rules"
              maxlength="128"
              required
            />
            <button type="button" class="reveal" :aria-pressed="showPassword" @click="showPassword = !showPassword">
              {{ showPassword ? "Hide" : "Show" }}
            </button>
          </div>
          <PasswordRules id="signup-rules" v-model:ok="passwordOk" :username="username" :password="password" />
        </div>
        <p class="field-hint">There's no email, so a forgotten password can't be recovered. Keep it somewhere safe.</p>
        <button class="btn btn--block" :disabled="state.busy || !usernameOk || !passwordOk">Create account</button>
      </form>
    </Transition>
  </section>
</template>

<style scoped>
.welcome {
  max-width: 32rem;
  margin: var(--space-6) auto 0;
}

/* Three choices in one pill, the chosen one filled. */
.modes {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-1);
  padding: var(--space-1);
  border-radius: var(--radius-pill);
  background: var(--color-accent-soft);
}

.mode {
  min-height: 2.5rem;
  padding: var(--space-1) var(--space-2);
  border: 0;
  border-radius: var(--radius-pill);
  font: 700 0.95rem/1.15 var(--font-body);
  color: var(--color-text-muted);
  background: transparent;
  cursor: pointer;
  transition:
    background-color 0.15s,
    color 0.15s;
}

.mode:hover {
  color: var(--color-text);
}

.mode:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 1px;
}

.mode--on,
.mode--on:hover {
  color: var(--color-on-primary);
  background: var(--color-primary);
  box-shadow: var(--shadow-sm);
}

.mode-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

/* A password box with a Show/Hide button inside its right edge. */
.secret {
  position: relative;
}

.secret .input {
  padding-right: 4.5rem;
}

.reveal {
  position: absolute;
  top: 50%;
  right: var(--space-2);
  transform: translateY(-50%);
  padding: var(--space-1) var(--space-2);
  border: 0;
  border-radius: var(--radius-sm);
  font: 700 0.85rem/1 var(--font-body);
  color: var(--color-primary);
  background: transparent;
  cursor: pointer;
}

.reveal:hover {
  background: var(--color-accent-soft);
}

code {
  padding: 0 0.2em;
  border-radius: 0.25rem;
  font-size: 0.9em;
  background: var(--color-accent-soft);
}
</style>
