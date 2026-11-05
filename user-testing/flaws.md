# Design flaws and opportunities

Three to five issues found in the two studies, worst first. **Level:** physical (seeing
or reaching a control), linguistic (words, labels, icons) or conceptual (the user's
model of how the app works). **Severity:** minor (some friction, recovered alone),
moderate, major, critical (needed the facilitator's help to go on).

| # | Flaw | Level | Severity | Seen in |
|---|---|---|---|---|
| 1 | Bad side selection | _conceptual_ | _major_ | _Study 2, task 4_ |
| 2 | Account menu indiscoverability| _conceptual_| _moderate_| _Study 1 & 2, task 7_|
| 3 | Turn indication based on hand tiles lighting up| _physical_| _minor_| _Study 1, task 4_|
| 4 | Ruleset picked before playing | _conceptual_| _minor_| _Study 2, Task 3_|
| 5 | Rules pop-up indiscoverability | _linguistic_| _minor_| _Study 1 & 2, task 2_|

## 1. _Bad side selection_

- **What happens:** User tries to play a tile that can be played on both sides on what they think is the (WLOG) left end of the board, but its the right end of the board that snaked back further left than the left end, and so the tile is played on the unintended end of the board.
- **Why it happens:** The side selection using "left" and "right" to choose which side to play on only consider what arm of the board to play on, which might not match the position of the arm's end relative to the other.
- **Possible improvements:** Hovering over one of the options shows a silhouette of where the tile would be played before playing it; changing the wording to be dependant on if the board has snaked vertically (changing it to "top" or "bottom"); changing selection so that users have to click the end of the board they want to play the tile on to play it there.

## 2. _Account menu indiscoverability_

- **What happens:** Users have a hard time realizing where to access the account menu, attempting to access it through the signed-in-as display instead.
- **Why it happens:** Users do not associate a "≡" button in the middle of the screen with and account menu.
- **Possible improvements:** Including access to the menu through the signed-in-as display; including the "≡" in the top left of the screen and renaming it to "≡ [USERNAME]"

## 3. _Turn indication based on hand tiles lighting up_

- **What happens:** User focuses more on their hand than their profile display which is what lights up to show turn order, using the contrast between playable tiles to know its their turn, leading to situations where the lack of this contrast (all playable / non playable) leads to confusion.
- **Why it happens:** Player is too focused on their hand and fails to realize their profile display lit up.
- **Possible improvements:** Add a sound (a short ding, perhaps) to indicate turn; have a pop-up show up after 10 secs of thinking reminding user its their turn; have tiles in hand shake / bounce / hover a little when it's user's turn


## 4. _Ruleset picked before playing_

- **What happens:** User attempts to join a game with a certain ruleset, but incorrectly joins a lobby with a different ruleset.
- **Why it happens:** User believes they will be given the option to change the ruleset after selecting to join a lobby.
- **Possible improvements:** Add a "Confirm ruleset" pop-up as soon "play" is selected

## 5. _Rules pop-up indiscoverability_

- **What happens:** Users struggle a bit to find the rules pop-up.
- **Why it happens:** Users don't associate "?" with the rules button, and the button is easy to miss either way.
- **Possible improvements:** Change the button to "About" or "Rules" and make it bigger
