
# Problem Statement

My goal with this project is to create an easily accessible application for playing Puerto Rican dominoes online that also allows users to review their games. Here is a detailed breakdown.

## Domain

The app resides in the domain of Puerto Rican dominoes. The name "dominoes" may refer to a great variety of different board games depending on the country and culture, but they are all different rulesets of a turn-based board game that uses a domino tileset, meaning that each tile is a rectangle divided into two squares that each contain a number. In Puerto Rico, where I am from, the game is commonplace at family gatherings and friend reunions, making it an utter cultural staple. \

The Puerto Rican variant uses the standard double-six domino tileset in a 2-versus-2 match, where teams race to reach a certain point threshold to be crowned winners, earning points by winning separate rounds. In a quick summary of the rules, each player is dealt 7 tiles, and turns go by cyclically, with players "playing" a tile by placing it from their hand onto one of the extremes of a snaking board of tiles such that the ends of the tiles match numbers. The goal is to be the first player to run out of tiles. Once that happens, the winning player's team is awarded some amount of points and a new round is started. \

Besides how common it is at gatherings, the reason so many people are drawn into playing is that the game has a low floor for entry (the rules are simple enough that anyone can understand how to play in a minute) while retaining a very high skill ceiling (seasoned players can consistently beat rookie contenders). \


## Bad Situations

**Playing requires being in person.** One bad situation I want to address is that the only real way to play the game is in person. I will describe what I mean by recounting how I found out about this situation. \

Three or so years ago, my grandfather started chemotherapy, which meant he would be sitting in a room by himself for hours at a time, multiple times a month. After his third or fourth visit, he told me that he would get really bored, and he asked me if I could find him a way to play dominoes on his phone, a game he absolutely loves. I looked deep into the App Store, downloading dozens of domino-branded applications, but they all shared one problem: they did not implement our version, the Puerto Rican variant, of the game. He, of course, refused to play any other variant, and so I dug deeper to find one application that actually implemented our ruleset. The thing is, that application had no online multiplayer functionality; one could only play against machines. \

This story exemplifies the bad situation I want to tackle: there is currently little to no way to actually play Puerto Rican dominoes online, meaning that fans of the game need to gather three other people in person in order to play at all. \

**Logging games is tedious and unreasonable.** The best way to get better at the game is to run a match and trace back what happened at each turn to identify suboptimal plays, with the goal of correcting those tendencies in later games. Each round in the game lasts a bare minimum of 25 turns, and games take on average 10 rounds. Manually logging the play made by each player, at each turn, of each round, in a single game, is monstrously tedious. Players who want to analyze their games tend to rely on their memory of the positions to reconstruct a board state after a round is over so it can be analyzed immediately, momentarily interrupting the game. \


## Corroboration

**On the first bad situation.** It is a bit hard to provide evidence here, given that the evidence is the absence of alternatives online, but I will provide what led me to reach the conclusion I reached. When searching the Google Play Store for "Domino online," the top ten search results are the following: \

- *Domino – Dominos online game* by ZiMAD
- *Dominoes: Classic Dominos Game* by NewPubGo
- *Dominoes* by Loop Games
- *Dominoes Online – Classic Game* by MegaJogos
- *Dominoes online – play Domino!* by AppForge Interactive Entertainment
- *Domino Duel – Online Dominoes* by ZARIBA GAMES
- *Domino Go – Online Board Game* by Beach Bum Ltd.
- *Domino Dreams* by SuperPlay
- *Domino Legends: Classic Game* by Bluetile
- *Classic Dominoes: Dominos Game* by Big Cake

I downloaded all of these apps, and more than I care to admit, to test whether any implemented the Puerto Rican ruleset. None of them did. An easy way to know at a glance that the ruleset is incorrect is by looking at pictures of the board states: in the Puerto Rican ruleset, tiles must be added at one of the two ends of the board, making a snaking pattern. Many of the most common versions of the game allow bifurcations of the board, leading to it having more ends, which is an easy giveaway that the ruleset is not ours. Other tells include fewer than four players playing at once, a tileset that does not contain exactly 28 tiles, the ability to draw extra tiles, and additional restrictions on valid plays beyond simply matching numbers. \

Many of these tells can be seen in the apps' promotional videos, but I still verified directly that they do not follow the Puerto Rican ruleset. In total, I downloaded the top results across the Google Play Store for searches such as "Domino," "Domino game," and "Domino online," totaling around 25 different downloads, and I had my sister download the top six or so results on the App Store for the same searches. We came away mostly empty-handed. I also called many of my family members and friends back on the Island to ask whether they knew where to play dominoes online. None of them did. Together with the lack of websites offering this service, this points to the bad situation of needing people present in person in order to play. \

**On the second bad situation.** Again, providing concrete, citable evidence is challenging, but I can back it up by appealing to reason. In a standard game of Puerto Rican dominoes, play is separated into many rounds, in each of which every player is dealt 7 tiles. The fastest a round can possibly end is in 10 turns, if the board gets "locked" (meaning both extremes of the board show the same number and no tile with that number is left to be played) as early as it possibly could. Granted, I have never seen this occur. Most rounds, more than 90%, do not end in a *tranque*, or locked state, which means a round takes at the very least 25 turns to conclude, and possibly more once skips are factored in. \

Because a standard game lasts from 8 to 20 rounds on average, a whole game of dominoes can run from roughly 200 to 500 total turns across all rounds. Imagine trying to log what happened in every single one of those hundreds of turns manually, and on top of that while the game is still being played. To log a full game of Puerto Rican dominoes by hand, either a fifth person would have to do nothing but log it, or multiple gigabytes of video footage would have to be recorded, or one of the players would have to completely split their attention between logging and playing. I hope that suffices to explain why logging games is a bad situation. \

There are currently no tools that solve this either. I looked hard, and the closest things available are point-tracking apps that record the scores after each round, not reconstructions of the rounds themselves. \


## Workarounds and Comparables

Although I have been painting a picture of there being no alternatives for playing Puerto Rican dominoes online, in my search I did find one application that does a pretty good job: **Mesa28**. It is a fairly new app from what I can tell, with the earliest records I found dating to May 2026, so it appears someone was slightly ahead of me with the idea. It is a good workaround for online play, but it is not perfect. \

- **No ruleset customization.** Although I have been describing the Puerto Rican ruleset as a single ruleset, there are actually small variations of it that this app does not offer. The variations are minor enough that I did not mention them earlier: changing the point threshold for a game win between 500 with bonuses and 200 (an option Mesa28 does not have, as it only offers 500-plus and 100), the different ways *tranques* are decided and how ties are broken, and specific redeal rules when a hand contains too many doubles. Mesa28 does not offer any way to truly customize these details, which creates a bad situation of its own.
- **Private tables cost in-game currency.** To make a private table and play with friends, one must spend in-game currency that has to be earned by winning many, many games of random matchmaking, or bought with real money. This adds a layer of complication to playing with friends online that does not need to be there, even if it is better than nothing.
- **Accounts are mandatory.** It is impossible to play without registering an account with an email, which means that to get friends to play with you, they all need registered accounts as well. This cuts out a large portion of the Puerto Rican domino playerbase: older people, like my grandfather, who do not really know how to deal with email verifications and that whole ordeal.
- **No turn-by-turn logging.** Mesa28 does offer an automatic game logger that records round-by-round scores, but it does not offer a full log of the turn-by-turn plays within each round, which is what is essential for game analysis.

I discuss Mesa28 at length because it is quite honestly the closest thing I have seen, in years of searching, to a truly accessible online Puerto Rican domino service. All the other domino apps mentioned above either lack core online multiplayer functionality or avoid the Puerto Rican ruleset altogether. So while Mesa28 partially solves the bad situation of instant access to games from anywhere, it introduces additional, albeit smaller, bad situations through its implementation. And since no other application offers turn-by-turn logging either, that second bad situation remains entirely unaddressed. \


## Solution Sketch

My idea for solving these bad situations is to implement something similar to Mesa28 in what it offers, that is, Puerto Rican ruleset dominoes, but this time with the complete ruleset including its small variants. For matchmaking, I would take the approach early *Among Us* used: codes and links for private games, plus simple random matchmaking for quick games, all without requiring an account. In addition, a file breakdown of each game could be downloaded once the game is over, and the app would offer a visualizer to replay the game for analysis purposes. \


## Stakeholder list 

The main stakeholders in the game are Puerto Rican Domino players, which we can call *Players* (or, more generically *Users*). These are the people that need a way to be able to play remotely and currently have none, which is what the app aims to solve.

