import { httpWire } from "@mit-sdg/sync-engine-http/tooling";
import { assembleApplication } from "./src/assembly.ts";
import { policy } from "./src/http.ts";

export default {
  assemble: assembleApplication,
  title: "Dominao",
  wireName: "DominaoWire",
  design: {
    version: 1,
    documents: [
      new URL("./design/types.md", import.meta.url),
      new URL("./design/compositions/Guests.md", import.meta.url),
      new URL("./design/compositions/Tables.md", import.meta.url),
      new URL("./design/compositions/Games.md", import.meta.url),
      new URL("./design/compositions/Seats.md", import.meta.url),
      new URL("./design/compositions/Matchmaking.md", import.meta.url),
    ],
  },
  projections: [httpWire({ policy, name: "DominaoWireHttp" })],
};
