# User study task list

Each session's participants work through these tasks in order, on the deployed app at
https://dominao.mit-sdg.dev/, thinking aloud. Together they take about 45 to 50 minutes,
followed by a debrief of about 15 minutes. Earlier tasks set up what later ones need:
the guest from task 1 plays the public game, and the account made in task 6 adds a
friend, plays the private game and is deleted at the end.

| # | Task | Instruction (read to the participant) | Rationale |
|---|---|---|---|
| 1 | Enter as a guest | "You just want to try the app without signing up for anything. Get in under a name of your choice." | Playing as a guest is a key promise of DOMINAO: no email, no password, straight in. Tests whether the Guest option on the first page is the obvious choice for someone who wants to try it, and whether anything (the Log in and Sign up options, the name field) makes them hesitate. |
| 2 | Read the rules | "Before playing, find out how the game is played, and tell me how many points it takes to win a short game." | Tests whether participants find the rules button on the home screen at all (execution), and whether the rules and the rule-set descriptions are understandable to someone who may play dominoes differently (evaluation). |
| 3 | Join a short public game | "Join a quick public game that ends at 100 points." | This is one of the app's primary flows: choosing which ruleset to play, and hopping into a match with strangers with no previous arrangements. Tests whether the rules card reads as something you can change, whether participants confirm they picked Short before joining, and whether the lobby and countdown explain what they are waiting for. |
| 4 | Play and follow the game | "Play until the first hand is over. As you go, tell me whose turn it is, which of your tiles you can play, how many tiles each of the others has left, the score of each hand so far, and what the last few moves were." | This tests the main functionality of the app in its entirety: games. Players need to be able to understand the whole game interface (turn order, legal moves, how many pieces each player has, etc) works and how to read the trackers (score table, move logs) so that the game flows as nicely as possible. The idea is to test this whole understanding here. |
| 5 | Sign out | "You're done playing as a guest for now. Leave the app and return to the sign in screen, and tell me what do you think happens to your current session, like your active games: are you remembered when you sign out as a guest?" | A simple task, but important given the testers will be on guest accounts up until this point and they should understand how guests aren't remembered on sign out. Tests whether participants find Sign out in the header and whether they understand that their guest name and seat do not come back. |
| 6 | Create an account | "Next time you'd like the app to remember you. Make an account you can sign in with from any device." | Creating an account is a primary function. Tests whether "Sign up" is clearly the way to keep a lasting player now that they know guests exist, and how the password rules (ticked off as you type) feel when choosing a real password. |
| 7 | Add a friend | "Add [username given by the facilitator] as a friend." | Friends live in the side menu, which only non-guest accounts see, so this tests discoverability. The hope is that testers are able to find the account menu, the friends section, and can reason through just the UI how to add a friend. It also sets up the invite in task 8. |
| 8 | Play a private game together | Host: "Set up a private game for the four of you, get the others to your table, and play." Others: "Join the game [the host] is setting up, and play." | Four participants do this at the same time: one opens a private table, invites friends from the lobby and shares the table's code; the others join through the invite pop-up or by typing the code. Tests whether everyone understands how private games come together from both sides, whether the invite and the code are both understood as ways in, and whether the host knows when and how to start. |
| 9 | Delete your account | "You're done with the app. Delete your account." | A rare but important action that should be findable and safe. Tests whether participants look in the side menu's account settings, and whether asking for the password again and confirming makes clear that it can't be undone. |

## Setup and facilitation

Each trial of the user testing will be performed with four simultaneous testers  (the exact number required to play domino games). All four testers will receive the exact same tasks, excluding task 8, where one tester will be the host, and the rest the invitees to a private game. To populate the app with data (for task 7), the deployed app has 100 dummy accounts (made by [src/seed.ts](../src/seed.ts), listed in [seed/users.md](../seed/users.md)), so that the app looks like it has more live users. I will have multiple of these accounts open in separate tabs to create the illusion of players hopping into a worldwide queue in task 3, which will be replaced by bots as soon as task 4 starts so that the games run on their own with testers (and so I don't have to manage 12 games at once). I will only present the testers with the instructions as cited above, and will not intervene to help unless around three minutes go by without task progress for a tester. Testers will be constantly prompted to think out loud and I will take notes of their comments as I go. If they allow it, I will also record the whole session. When session is concluded, I will ask the following questions to all testers in a debrief:

- "What did you most like about the app or your experience?"
- "What non-trivial action felt the easiest to do?"
- "What did you most dislike about the app or your experience?"
- "What tasks made you hesitate the most?"
- "Was the thing you expected to happen, always the thing that happened? If not, where did the app surprise you, for better or worse?"
- "Was it ever unclear how to proceed with any task? If so, which and why?"
- "If you could add, remove, or change some things about the app, what would those changes be?"


