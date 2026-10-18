// A temporary page for trying guest sessions. The Vue frontend replaces it later.
import { createHttpClient } from "@mit-sdg/sync-engine-http/client";
import type { DominaoWireHttp } from "../generated/wire.ts";

const client = createHttpClient<DominaoWireHttp>({ baseUrl: "/api" });

// sessionStorage is per tab, so four tabs can be four different players.
const TOKEN_KEY = "dominao.token";

const startForm = document.querySelector<HTMLFormElement>("#start")!;
const welcome = document.querySelector<HTMLElement>("#welcome")!;
const greeting = document.querySelector<HTMLElement>("#greeting")!;
const leaveButton = document.querySelector<HTMLButtonElement>("#leave")!;
const status = document.querySelector<HTMLParagraphElement>("#status")!;

function show(displayName: string | null) {
  startForm.hidden = displayName !== null;
  welcome.hidden = displayName === null;
  greeting.textContent = displayName === null ? "" : `¡Hola, ${displayName}!`;
}

async function resume() {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (token === null) return show(null);
  const result = await client.guests.me({ token });
  if ("error" in result) {
    sessionStorage.removeItem(TOKEN_KEY);
    status.textContent = "Your guest session expired. Pick a name to play again.";
    return show(null);
  }
  show(result.displayName);
}

startForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const displayName = String(new FormData(startForm).get("displayName"));
  const result = await client.guests.start({ displayName });
  if ("error" in result) {
    status.textContent = "A name must be 1 to 20 characters long.";
    return;
  }
  sessionStorage.setItem(TOKEN_KEY, result.token);
  status.textContent = "";
  await resume();
});

leaveButton.addEventListener("click", async () => {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (token !== null) await client.guests.leave({ token });
  sessionStorage.removeItem(TOKEN_KEY);
  show(null);
});

resume();
