export type LocaleContent = {
  title: string;
  subtitle: string;
  category: string;
  readTime: string;
  authorName: string;
  authorBio: string;
  sections: Array<{ title?: string; content: string }>;
  backToBlog: string;
  tryDaily: string;
  practice: string;
};

export const contentByLocale: Record<string, LocaleContent> = {
  en: {
    title: 'The Multiplayer Strategy Guide: How to Actually Win Word Battles',
    subtitle: 'I lost 23 games in a row to my roommate before I figured this out. Multiplayer is a different sport — here is the playbook.',
    category: 'Strategy',
    readTime: '10 min read',
    authorName: 'Ohad Fisher',
    authorBio: 'Obsessive word game player, amateur neuroscience reader, and the person who ruins game night by taking too long on their turn.',
    sections: [
      {
        content: `I lost 23 multiplayer games in a row to my roommate. Twenty-three. I counted, because I keep a spreadsheet, because I am that person.

The worst part? My vocabulary is bigger than his. Noticeably bigger. He once tried to play "BEANUT" (he meant peanut, or possibly walnut, unclear). And yet he kept beating me, game after game, until I finally swallowed my pride and studied what he was actually doing.

Turns out multiplayer word battles are a completely different sport from playing solo. Practice mode rewards finding good words. Multiplayer rewards finding good words FASTER THAN EVERYONE ELSE, while twenty other people are raiding the same grid. Once I understood that, my win rate flipped. This is everything I learned.`,
      },
      {
        title: 'Understand what you are actually competing over',
        content: `In a LexiClash multiplayer room, everyone plays the same grid, at the same time, against the same clock. Two to twenty players, one shared board, zero mercy.

That single fact changes everything. You are not competing against the grid. You are competing against everyone else's speed on the grid. The words are a shared resource — the obvious ones get found by multiple people, and when two players submit the same word, both get credit but speed becomes the tiebreaker. Sitting on a word you found early is like leaving money on the table.

So the real question of every round is not "what is the best word on this board?" It is "what words will everyone else find, and how do I get mine in first while ALSO finding the ones they will miss?"`,
      },
      {
        title: 'Bank the obvious words immediately',
        content: `My roommate's entire strategy, it turns out, was this: submit every obvious word the instant you see it. THE. CAT. DOG. RUN. Gone in the first fifteen seconds.

I used to hoard words. I would spot a 6-letter word, then keep it "in reserve" while I hunted for something better. Terrible idea. In multiplayer, a word you have not submitted is worth exactly zero points, and there is a decent chance three other people found the same word while you were admiring it.

The math backs this up. Base scoring is exponential by length — 3 letters is 10 points, 4 is 20, 5 is 50, 6 is 100, 7 is 200, and 8+ is a 500-point jackpot. But those points only exist once you hit submit. Three quick 4-letter words banked in twenty seconds beats one brilliant 7-letter word you spent ninety seconds assembling and then lost to a faster player.

New rule for myself: if a word is obvious to me, it is obvious to everyone. Submit it NOW, then go hunting.`,
      },
      {
        title: 'Combos are how you actually pull ahead',
        content: `Here is where multiplayer games are really won and lost. Every word you submit in quick succession builds your combo level, and combos multiply your scoring in two ways.

First, there is a flat combo bonus that scales with word length — longer words earn a bigger combo kicker (a 7-letter word at combo level 5 gets double the bonus of a 5-letter word). Second, sustained combos feed multiplier tiers that reward you for keeping the streak alive: string words together and everything you submit starts scoring noticeably higher.

This creates the central tension of multiplayer play. Spamming tiny words builds combo level fast but earns tiny bonuses. Hunting long words scores big but risks your combo timing out. The sweet spot, and I tested this obsessively, is alternating: quick short words to keep the chain alive while your eyes work on the next medium word. A steady stream of 4 and 5-letter words at a healthy combo beats a heroic 8-letter find followed by thirty seconds of silence.`,
      },
      {
        title: 'Play the clock, not just the board',
        content: `Every multiplayer round is a time-boxed sprint, and the players who treat it that way win.

My pacing framework: the first 20% of the round is for banking obvious words at maximum speed — no thinking, just harvesting. The middle 60% is where you do the real work: longer words, combo building, working the grid systematically (corners first, then edges, then center — corner tiles connect to only 3 neighbors so they are easier to exhaust, and most opponents ignore the edges). The final 20% is cleanup: grab any short word you see, keep the combo warm, and never, ever stop submitting.

The biggest mistake I see in public rooms is players going quiet in the last thirty seconds. They have mentally checked out. Meanwhile the eventual winner is frantically submitting 3-letter words and banking another hundred points while everyone else watches the timer.`,
      },
      {
        title: 'Read the room (literally)',
        content: `Room size changes the correct strategy, and most players never adjust.

In a small room — you plus one or two friends — the grid is roomy. You can afford slower, higher-value play. Long words matter more because nobody is picking the board clean around you.

In a big public room with fifteen strangers, the calculus inverts completely. The obvious words vanish in seconds. Speed is everything, and the winners are the players who find the UNCOMMON words — the ones hiding in awkward corners, the weird 4-letter words (JINX, QUAY, WHEY) that most people's brains skip over. This is where the rare-letter strategy pays: Q, Z, X, and J constrain the search space so heavily that a quick check of their neighborhoods either finds a word fast or rules one out entirely.

And watch for fire rounds. When the board catches fire, scoring doubles. Drop whatever elegant word you were assembling and submit everything you have — a mediocre word at 2x beats a great word you never got in.`,
      },
      {
        title: 'The mental game is real',
        content: `Multiplayer adds something practice mode never does: an audience and a live score feed. Watching someone else's score tick past yours mid-round is genuinely destabilizing, and tilting costs you more games than vocabulary ever will.

Two things that helped me. First, stop watching the live standings during the round. Every glance at the leaderboard is a glance away from the grid. Check at the end. Second, have a reset ritual for bad starts. Mine is embarrassingly simple: one breath, find the easiest word on the board, submit it. Momentum in multiplayer is psychological as much as mathematical — a broken combo feels terrible, but the next word starts a new one.

Also: play the rematch. The fastest improvement I ever made came from losing to the same strong players repeatedly and stealing their habits one by one. Every beatdown is a free coaching session if you are paying attention.`,
      },
      {
        title: 'Steal this pre-game routine',
        content: `Everything above, compressed into the sixty seconds before a round:

One, warm up your eyes. When the grid appears, do not touch anything for five seconds — let your brain catalogue letter clusters before you start tracing. My word count jumped about 30% when I started doing this.

Two, plan your first three words before the timer starts. Opening with a plan beats opening with panic.

Three, scan for rare letters first, then suffixes (-ING, -ED, -TION, -NESS), then common pairs (TH, CH, SH, STR). That order — constraint, then pattern, then noise — is faster than reading the board left to right.

Four, decide your pace based on room size: small room, hunt big; big room, harvest fast.

Then go take someone's crown. If you beat my roommate, tell him I sent you.`,
      },
    ],
    backToBlog: 'Back to Blog',
    tryDaily: 'Create a Multiplayer Room',
    practice: 'Warm Up in Practice Mode',
  },
};
