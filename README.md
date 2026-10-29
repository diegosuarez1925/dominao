# DOMINAO

DOMINAO is a web app for playing Puerto Rican dominoes online with four players. You can play as a guest under any name, or keep an account (a unique username and a password) to be the same player on any device. You can open a private table and share its 6-character code with family, or be matched with strangers who chose the same rules. If someone leaves mid-game, the game waits for someone to take their seat, and a bot plays it in the meantime.

| | |
|---|---|
| Deployed app | https://dominao.mit-sdg.dev/ |
| Demo video (P4) | FINAL_VIDEO_LINK_HERE |
| Design document | [DESIGN.md](DESIGN.md): how the final app differs from the P1 concepts and the P3 visual design |
| Specs | [design/concepts](design/concepts) (concepts), [design/compositions](design/compositions) (how they are composed), [design/types.md](design/types.md) |
| API | [generated/dominao.md](generated/dominao.md): every endpoint with its input, output and errors, generated from the code |
| Design notebook | [design_notes.md](design_notes.md): each step, what was asked, what changed and how it was tested |
| Test results | [tests/output.txt](tests/output.txt) (local), [tests/deploy-output.txt](tests/deploy-output.txt) (deployed app) |

## Running it locally

You need [Bun](https://bun.sh) 1.4 and a MongoDB server.

```sh
bun install
MONGODB_URL=mongodb://127.0.0.1:27017/dominao bun run start   # page and API on http://localhost:3000
```

- `bun run dev` does the same with a local MongoDB in a container (Podman) and reloads on changes.
- `bun run preview` runs the app exactly as the class platform does.

To try a full table on one computer, open four browser windows (or private windows). Each window is its own guest, or its own sign-in.

## Testing

```sh
bun run test:save        # every test, output saved to tests/output.txt (needs MongoDB at MONGODB_URL)
bun run test:memory      # the same with a throwaway in-memory MongoDB
bun run check            # sync-engine checks and the TypeScript compiler
bun run check:design     # checks the specs in design/ against each other
bun run check:deploy     # checks the deployed app from outside; output saved to tests/deploy-output.txt
```

| Tests | What they cover |
|---|---|
| [tests/concepts](tests/concepts) | Each concept on its own, through its actions and queries: every action, its refusals and its principle. Game rules use seeded deals ([tests/support/dominoes.ts](tests/support/dominoes.ts)). |
| [tests/compositions](tests/compositions) | The HTTP API end to end. This covers whole journeys, who may do what, the error each refusal returns, seat replacement and bots, and the server's timer. The clock is moved by hand, so timed rules are tested exactly. |
| [tests/web](tests/web) | The board layout: no overlaps, every tile touches the one before it, turns and doubles. |

## Repository layout

- [src/concepts](src/concepts): the nine concepts.
- [src/compositions](src/compositions): reactions and endpoints that tie the concepts together.
- [src/ticker.ts](src/ticker.ts): the server's one-second timer.
- [src/main.ts](src/main.ts): the server.
- [web](web): the Vue frontend, served by the same process.
- [scripts](scripts): API and deployment checks.

## Known limitations

- A guest who closes their tab or clears their browser storage starts over as a new guest. An account is remembered per tab too, so a regular logs in again in a new tab.
- There is no email, so a forgotten password cannot be recovered.
- Bots play random legal moves. A smarter bot is one function in [src/assembly.ts](src/assembly.ts).
- Two seat swaps sent at the very same instant at one table are not atomic. Only the host can swap, one at a time, so this does not come up in use.

## Earlier deliverables

**P3 (beta).**
- [Journey recording](https://youtu.be/T4UbuC2Oy6U).
- Visual design study: [typography](visual-study/typography.png) (Bungee for big moments, Nunito for reading) and [color](visual-study/color.png) (from the Lares flag, the Puerto Rican flag and Old San Juan).
- Updated user journey: a grandfather on a bus plays a quick public game, then joins his brother's private table for a game to 500.

**P1 (concept design)**, in [P1 TASKS](P1%20TASKS):
- [Problem framing and stakeholders](P1%20TASKS/problem_framing.md)
- [App pitch](P1%20TASKS/app_pitch.md)
- [Concept specifications, reactions and design note](P1%20TASKS/concept_design.md)
- [UI sketches](P1%20TASKS/ui_sketches.jpg)
- [User journey](P1%20TASKS/user_journey.md)
