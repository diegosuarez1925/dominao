## Database

This project uses MongoDB, defined in `compose.yaml`. The connection string is in `.env`.

- `bun run db:up` starts MongoDB and waits until it accepts connections.
- `bun run db:check` checks that the app can connect.
- `bun run db:reset` deletes all local data and starts fresh. It is safe to run at any time.
- `bun run db:logs` shows MongoDB's output.
- Only use the local database. Never connect to a hosted one.


## Running the app

- `bun run dev` starts MongoDB in a container, then the backend at http://127.0.0.1:3000 and the frontend at http://127.0.0.1:8080, both in watch mode.
- `bun run up` runs all three in containers. `bun run down` stops them, and `bun run db:reset` deletes the local data.
- Change `design/` before the code. Check it with `bun run check:design`, then run `bun run generate` and `bun run check`.