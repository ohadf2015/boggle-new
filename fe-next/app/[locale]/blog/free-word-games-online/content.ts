// Article content — "Ohad Fisher" persona
// English-only at launch; other locales fall back to EN and are noindex via hasTranslation gate

export type LocaleContent = {
  title: string;
  subtitle: string;
  category: string;
  readTime: string;
  authorName: string;
  authorBio: string;
  sections: Array<{
    title?: string;
    content: string;
  }>;
  backToBlog: string;
  playDaily: string;
  startPracticing: string;
};

export const contentByLocale: Record<string, LocaleContent> = {
  en: {
    title: 'Free Word Games Online: The Honest Guide (No Pay-to-Win)',
    subtitle: 'A field guide to word games that respect your time, your wallet, and your attention span. Updated for 2026.',
    category: 'Guide',
    readTime: '11 min read',
    authorName: 'Ohad Fisher',
    authorBio: 'Has installed and uninstalled more "free" word game apps than he\'d like to admit. Now writes about which ones actually deserve your taps.',
    sections: [
      {
        content: `Here is the dirty secret of "free" word games on the internet: most of them are not free. They are demos. You play three rounds, the app politely informs you that you need to wait six hours for your "energy" to refill, and a banner offers to sell you a refill for $4.99. That is not a game. That is a slot machine wearing a dictionary costume.

I have spent the last five years installing, playing, uninstalling, and quietly hating about forty different word games on my phone. Some of them are genuinely free. Some of them are free the way a timeshare presentation is free. This is my attempt to tell you the difference, in plain language, with no affiliate links and no "top 10" filler.

If you want to skip ahead: the things that matter are no energy systems, no paywalls on words, and a daily mode you can finish in five minutes. Everything else is taste.`,
      },
      {
        title: 'What "Free" Should Actually Mean',
        content: `A free word game should have three properties, and almost none of them do.

First, you should be able to play as much as you want. Energy systems — the ones that limit you to five rounds and then make you wait — were invented by Candy Crush and have since infected the entire mobile gaming ecosystem. They do not exist because they make games better. They exist because they make people pay. A word game with an energy system is a word game that does not trust you to enjoy it on your own terms.

Second, no part of the actual word game should be paywalled. This sounds obvious, and it is the rule that gets broken most often. "Word Radar" that shows you the best move? Paywalled. Tile swaps that let you ditch a bad rack? Paywalled. Extra time on the clock? Paywalled. These features do not enhance the game; they sell you a shortcut around the game. If the developers thought their actual gameplay was good, they would not need to sell you ways to skip it.

Third, ads should be optional or unobtrusive. A single banner at the bottom of the screen is fine. A 30-second unskippable video before every match is not. The honest model is: show me an ad when I open the app, run a small banner while I play, and offer me a one-time payment to remove both. The dishonest model is: show me an ad every time I do anything, and also sell me power-ups.

You can apply these three tests to any word game in about ninety seconds. Most will fail at least one.`,
      },
      {
        title: 'The Daily Puzzle: Five Minutes That Stick',
        content: `The single most successful design pattern in modern word games is the daily puzzle. One puzzle. Once a day. Same puzzle for everyone. It is over in five minutes.

Wordle did not invent this format, but Wordle proved it could be massive. Josh Wardle's original version, before The New York Times bought it, had no ads, no app, no account. You went to a webpage, you played the puzzle, you shared a grid of colored squares with your friends, and you came back tomorrow. The genius was the constraint. You could not binge it. You could not buy your way to a better score. You played the same puzzle as your sister and your boss and a stranger in Helsinki, and that shared experience is what made the colored-square share image go viral.

The daily format works because it respects two things modern apps do not: your time and your attention. You finish in one sitting. You do not get pulled back in. You feel a small accomplishment and you go on with your day. Then tomorrow there is a new one waiting, but only one. The scarcity is the feature.

LexiClash's Word of the Day works on this principle, in five languages including Hebrew with proper right-to-left support. The Hebrew version was the part that took the longest, because the daily puzzle format had no good Hebrew implementation before 2024 — most "Wordle in Hebrew" clones treated the script as an afterthought. We had to think about it from the start. If you read Hebrew, you will notice.`,
      },
      {
        title: 'Real-Time Multiplayer: Humans, Not Bots',
        content: `Most word games marketed as "multiplayer" are actually solo games with a bot playing the other side. The bot has a name like "AlexW87" and makes plausible mistakes and occasionally messages you to say "good game." Then you find out it took your turn at 3am while you were asleep and you realize, slowly, that AlexW87 is not real.

Real-time multiplayer is different. You and another human, both online right now, both staring at the same grid, both racing the same clock. The game ends when the timer hits zero, not when one of you remembers to open the app three days later. The stakes are immediate. The trash talk is immediate. The schadenfreude when you find a seven-letter word they missed is immediate.

This format is harder to build. You need actual servers maintaining state, you need anti-cheat that catches dictionary lookups, you need matchmaking that does not pair beginners against experts. It is also harder to monetize because there are no asynchronous moments to interrupt with ads. So most "multiplayer" games quietly skip it and use bots instead.

If you want to know whether a game's multiplayer is real, look at two things: how fast you get matched, and whether the opponent ever pauses mid-game in a human-like way. Real opponents have weird hesitations. Bots play at suspiciously consistent speeds.`,
      },
      {
        title: 'Word Hunt Modes: Targets Beat Free-for-All',
        content: `Classic Boggle has a problem, which is that staring at a random grid for three minutes is much harder than it sounds. Your brain freezes. You see the same six letters over and over. You write down THE and AND and THAT and feel like an idiot. This is a real failure mode that most word games do not solve.

The fix is target words. Instead of "find every word," the game shows you a small set of specific words to hunt — six-letter words, words starting with a particular letter, words on a theme. Your brain has a goal. It is no longer scanning randomly; it is searching. The cognitive load drops dramatically and the game gets much more fun.

LexiClash Daily Survival escalates this across days, so Day 1 might give you forgiving six-letter targets and Day 30 will hand you eight-letter words with rare letters. The progression matters because it keeps the game from feeling the same every day. The escalation is the loop.

I bring this up because the difference between "find words" and "find these specific words" is the difference between a frustrating game and a satisfying one, and most reviews never mention it. If you are bouncing off classic Boggle-style grids, try a word hunt mode before you decide word games are not for you.`,
      },
      {
        title: 'Family and Classroom Play: The TV Mode Test',
        content: `One thing free word games almost never advertise is whether they work on a TV. This sounds niche until you have tried to play a phone game with your family at Thanksgiving. Everyone leaning over one phone is awful. Passing the phone around is awful. You need a shared screen.

The test is whether the game has any kind of party mode, host mode, or TV view. LexiClash has a party-game architecture where one screen hosts the game and players join from their phones, similar to how Jackbox Party Pack works. This is rare in word games specifically — most word game developers think of the phone as the entire universe.

The same architecture works for classrooms. A teacher displays the game on the smart board, students play on their own devices, and the leaderboard updates in real time. This is the model that actually works for the "educational game" pitch, as opposed to the model where you make the game a worksheet and pretend that is fun.

If you have a family or a classroom you want to play with, ask whether the game has a shared-screen mode. The answer is usually no. When the answer is yes, the game tends to be better for everyone, because the developers had to think about more than a single user.`,
      },
      {
        title: 'Mobile Without the App Store',
        content: `Here is something that nobody tells you: you do not need to install an app to play a word game on your phone. Modern web games run in your phone's browser, install themselves to your home screen if you want, and work offline once they have loaded. This is called a Progressive Web App, or PWA, and it solves a problem the app store has created.

The problem is friction. To install a normal app, you have to go to the app store, search, read reviews, hit install, wait for the download, accept permissions, and find the app in your launcher. Maybe 70% of people drop off at some point in this funnel. With a PWA, you just open a link. The game loads in your browser. If you like it, you tap "Add to Home Screen" and it acts like a regular app from then on. If you do not, you close the tab and forget it ever existed.

PWAs also dodge the worst part of the app store: the "free download, $9.99/month subscription you forgot you signed up for" pattern. Browser games have to convince you to come back. They cannot bury a subscription in a settings menu.

LexiClash runs as a PWA. Most browser-based word games do. If you find yourself reading a review for a word game and feeling that nag about installing yet another app, check whether there is a web version first. There almost always is.`,
      },
      {
        title: 'The Red-Flag Checklist',
        content: `Run any free word game through this list before you commit to it. You will save yourself hours.

First, does it have an energy system? Look for any phrase like "lives," "stars," "hearts," or "wait to play more." If yes, walk away.

Second, does it let you buy power-ups that affect gameplay? Tile swaps, hint reveals, extra time, score multipliers. If you can pay money to play better, the game is selling you the win, not the experience.

Third, how often does it interrupt you with ads? One ad on launch and a banner during play is fine. Ads between every round, especially video ads, mean the game's business model is your attention rather than your enjoyment.

Fourth, does it have a daily mode? A daily puzzle is a signal that the developers trust their game to be worth coming back to. Games without a daily mode usually rely on the energy-system trap to keep you returning.

Fifth, does it support languages other than English? Word games that only ship in English have not thought about scripts that work differently — Hebrew right-to-left, Japanese kanji, Spanish accented characters. A game that supports multiple languages well has probably been thought about more carefully overall.

Five questions, two minutes per app, and you will avoid most of the bad ones. The good ones — and there are not many — tend to pass all five.`,
      },
      {
        title: 'Where to Start',
        content: `If you are starting from zero, here is the order I would try things, in 2026.

Start with a daily puzzle. One small thing, once a day, finishable in five minutes. You will know within a week whether the format suits you. If it does, you have a free habit. If it does not, you have lost five minutes a day for a week and learned something about yourself.

If the daily clicks and you want more, add a hunt mode or a real-time multiplayer game. The hunt mode gives you progression — you can get measurably better at it over time. The multiplayer gives you social stakes. Both are antidotes to the loneliness problem of single-player phone games.

If you have people you want to play with, look for a party mode or a TV-friendly version. Word games are unexpectedly good with families, and the shared-screen format makes them work for people who would never download a word game app on their own.

That is the whole pitch. The good free word games exist. They are not in the top ten lists, because the top ten lists are paid placements. They are mostly browser-based, mostly daily-puzzle-shaped, mostly built by small teams who care about the words.

Try the Word of the Day, see if it sticks. If it does not, you have lost three minutes. If it does, you have a free habit for a year.`,
      },
    ],
    backToBlog: 'Back to Blog',
    playDaily: 'Try the Daily Challenge',
    startPracticing: 'Play Now',
  },
};
