# User study task list

Each participant works through these tasks in order, on the deployed app at
https://dominao.mit-sdg.dev/, thinking aloud. Together they take about 40 minutes,
followed by a 20-minute debrief. Earlier tasks set up what later ones need: the guest
from task 1 plays the public game, and the account made in task 6 adds a friend, plays
the private game and is deleted at the end.

| # | Task | Instruction (read to the participant) | Rationale |
|---|---|---|---|
| 1 | Enter as a guest | "You just want to try the app without signing up for anything. Get in under a name of your choice." | Playing as a guest is a key promise of DOMINAO: no email, no password, straight in. Tests whether the Guest option on the first page is the obvious choice for someone who wants to try it, and whether anything (the Log in and Sign up options, the name field) makes them hesitate. |
| 2 | Read the rules | "Before playing, find out how the game is played, and tell me how many points it takes to win a short game." | Tests whether participants find the rules button on the home screen at all (execution), and whether the rules and the rule-set descriptions are understandable to someone who may play dominoes differently (evaluation). A walkthrough can't tell us whether the "?" reads as help. |
| 3 | Join a short public game | "Join a game with people you don't know that ends at 100 points." | One of the app's primary flows: changing the rule set on the Public tab, then pressing Play and waiting in the lobby for others. Tests whether the rules card reads as something you can change, whether participants confirm they picked Short before joining, and whether the lobby and countdown explain what they are waiting for. The facilitator fills the other seats. |
| 4 | Play and follow the game | "Play until the first hand is over. As you go, tell me whose turn it is, which of your tiles you can play, how many tiles each of the others has left, the score of each hand so far, and what the last few moves were." | Tests whether the whole game screen can be read without help: (1) whose turn it is, (2) which tiles can be played and on which end, (3) each player's tile count, (4) each match's points in the score table, and (5) the move log. Most of this is the gulf of evaluation, which only a real player's reading of the screen can show. |
| 5 | Sign out | "You're done playing as a guest for now. Leave the app the way you'd leave it on a shared phone." | Signing out of a guest session is simple but has a real consequence: a guest is forgotten. Tests whether participants find Sign out in the header and whether they understand that their guest name and seat do not come back. |
| 6 | Create an account | "Next time you'd like the app to remember you. Make an account you can sign in with from any device." | Creating an account is a primary function. Tests whether "Sign up" is clearly the way to keep a lasting player now that they know guests exist, and how the password rules (ticked off as you type) feel when choosing a real password. |
| 7 | Add a friend | "Add [username given by the facilitator] as a friend." | Friends live in the side menu, which only accounts see, so this tests discoverability: whether participants notice the menu button that appeared after signing up, find Friends inside it, search by username and understand that the request waits for the other person. It also sets up the invite in task 8. |
| 8 | Play a private game together | Host: "Set up a private game for the four of you, get the others to your table, and play." Others: "Join the game [the host] is setting up, and play." | Four participants do this at the same time: one opens a private table, invites friends from the lobby and shares the table's code; the others join through the invite pop-up or by typing the code. Tests whether everyone understands how private games come together from both sides, whether the invite and the code are both understood as ways in, and whether the host knows when and how to start. |
| 9 | Delete your account | "You're done with the app. Delete your account." | A rare but important action that should be findable and safe. Tests whether participants look in the side menu's account settings, and whether asking for the password again and confirming makes clear that it can't be undone. |

## Setup and facilitation

- **Test data.** The deployed app has 100 accounts with statistics from earlier games
  (made by [src/seed.ts](../src/seed.ts), listed in [seed/users.md](../seed/users.md)),
  so search results, public lobbies and the Stats screen look lived in. The facilitator
  plays test accounts in other windows to fill the public game in tasks 3 and 4.
- **Task 8 with four people.** All four participants do task 8 at the same table at
  the same time. Decide beforehand who hosts and which participants each one befriends
  in task 7, so the host has friends to invite and the rest need the code.
- **Before starting:** get consent (and consent to record the screen and audio), explain
  that the app is being tested, not them, and ask them to think aloud.
- **When to intervene:** only after about 3 minutes with no progress and after one
  prompt to think aloud ("What are you looking for?"). Then give the smallest hint
  ("There's a menu at the top left") and note it as an intervention.
- **Debrief questions:** What felt easy? Where did you hesitate, and what did you
  expect to happen? Was it ever unclear whose turn it was or which team was yours?
  Would you use this to play with family, and what would stop you?
