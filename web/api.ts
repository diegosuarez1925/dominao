// The typed client for the backend's endpoints, and the shapes of what they answer.
import { createHttpClient } from "@mit-sdg/sync-engine-http/client";
import type { DominaoWireHttp } from "../generated/wire.ts";

export const client = createHttpClient<DominaoWireHttp>({ baseUrl: "/api" });

type Client = typeof client;
type Answer<T> = Exclude<Awaited<T>, { error: unknown }>;

/** The guest's table as the lobby shows it: code, host and who sits where. */
export type Table = Answer<ReturnType<Client["tables"]["lobby"]>>["lobby"]["tables"][number];
/** The game as this guest sees it: scores, board, their own hand, the log, and so on. */
export type Game = Answer<ReturnType<Client["games"]["view"]>>["view"]["games"][number];
/** The matchmaking lobby this guest waits in: who is there, and the countdown. */
export type QueueLobby = Answer<ReturnType<Client["matchmaking"]["view"]>>["queue"]["lobbies"][number];
/** A rule set the guest can pick: its name, the score to reach, and what it changes. */
export type RuleSet = Answer<ReturnType<Client["games"]["rulesets"]>>["view"]["rulesets"][number];
export type BoardTile = Game["board"][number];
export type Side = "LEFT" | "RIGHT";
/** How a match ended, as the game reports it. */
export type MatchResult = Game["lastResult"][number];
/** An account's friends, requests and invites, and when it last looked at each part. */
export type Friends = Answer<ReturnType<Client["friends"]["view"]>>["friends"];
export type Friend = Friends["friends"][number];
export type FriendRequest = Friends["incoming"][number];
export type GameInvite = Friends["invites"][number];
/** An account found by searching usernames. */
/** An account's statistics: a record per rule set it played, and all of them together. */
export type Stats = Answer<ReturnType<Client["stats"]["view"]>>["stats"];
export type StatsRecord = Stats["records"][number];
export type StatsTotals = Stats["overall"][number];
export type FoundAccount = Answer<ReturnType<Client["friends"]["search"]>>["found"]["accounts"][number];
