# User study task list

Each participant works through these tasks in order, on the deployed app at
https://dominao.mit-sdg.dev/, thinking aloud. Together they take about 40 minutes,
followed by a 20-minute debrief. Earlier tasks set up what later ones need: the account
made in task 2 is the one that plays, makes a friend and ends up with statistics.

| # | Task | Instruction (read to the participant) | Rationale |
|---|---|---|---|
| 1 | Learn the rules | "Before you play, find out how many points it takes to win a short game, and what happens when nobody can play." | One step through the "How to play" pop-up. Tests whether a newcomer finds help from the home screen at all (execution) and whether the rule-set descriptions answer a real question in words they understand (evaluation). A walkthrough can't tell us whether the "?" button reads as help. |
| 2 | Make an account | "You'd like the app to remember you and your results. Set that up." | The first page offers Guest, Log in and Sign up. Tests whether "keep my results" maps to signing up rather than playing as a guest, and how the password rules (ticked off as you type) feel to someone choosing a real password. |
| 3 | Play a quick game with strangers | "You have about ten minutes on the bus. Join a game with people you don't know that ends at 100 points, and play until the first hand is over." | The core loop: pick the Short rule set, press Play, wait in the lobby, then play tiles. Tests whether choosing rules before Play is clear, whether the participant can tell whose turn it is, which tiles fit and which end to play on, and whether an automatic skip is understood. The facilitator fills the other three seats with test accounts. |
| 4 | Read the score | "Tell me which team is ahead, by how much, and how the last hand ended." | Purely about the gulf of evaluation: the score card as a hand-kept tally, "us" versus "them", and the match result banner. Shows whether the participant knows which team is theirs. |
| 5 | Step away and come back | "Your stop is coming up. Leave this game. Then get back into a game that's already being played, with the same rules." | Leaving mid-game hands the seat to a bot instead of ending the game, and getting back in needs the "Join games in progress" toggle. Tests whether the participant feels safe leaving, notices the toggle, and understands they took over someone else's seat and score. |
| 6 | Add a friend | "Your cousin plays on DOMINAO as tinycoqui. Add them as a friend." | Finding Friends in the side menu, searching by username and sending a request; then noticing the "accepted" pop-up when the facilitator accepts as tinycoqui. Tests the discoverability of the menu and the feedback for a request that waits on someone else. |
| 7 | Host a family game | "Set up a private game to 500 for your family. Invite your cousin from the app, get two more people in by sending them the table's code, and make your cousin your partner. Then start the game." | The most complex task: opening a private Long table, inviting a friend, sharing the code, swapping seats through a player's menu, and starting. Tests whether partners sitting across is understood, and whether "swap seats" is found without help. The facilitator joins as tinycoqui and two other test accounts. |
| 8 | Check your record | "How often do you win short games, and what's the most points you've won in one hand?" | Reading the Stats section after tasks 3 and 5. Tests whether the participant finds Stats, tells per-rule-set numbers from the overall ones, and understands the difference between a match (a hand) and a game. |

## Setup and facilitation

- **Test data.** The deployed app has 100 accounts with statistics from earlier games
  (made by [src/seed.ts](../src/seed.ts), listed in [seed/users.md](../seed/users.md)).
  The facilitator plays as test accounts in other windows to fill tables and to be the
  cousin, `tinycoqui`.
- **Before starting:** get consent (and consent to record the screen and audio), explain
  that the app is being tested, not them, and ask them to think aloud.
- **When to intervene:** only after about 3 minutes with no progress and after one
  prompt to think aloud ("What are you looking for?"). Then give the smallest hint
  ("There's a menu at the top left") and note it as an intervention.
- **Debrief questions:** What felt easy? Where did you hesitate, and what did you
  expect to happen? Was it ever unclear whose turn it was or which team was yours?
  Would you use this to play with family, and what would stop you?
