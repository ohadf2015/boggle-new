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
    title: 'How the LexiClash Leaderboard Actually Works: ELO, Tiers, and Seasons Explained',
    subtitle: 'I read the actual rating code so you do not have to. Here is exactly what happens to your rating after every ranked game.',
    category: 'Guide',
    readTime: '9 min read',
    authorName: 'Ohad Fisher',
    authorBio: 'Obsessive word game player, amateur neuroscience reader, and the person who ruins game night by taking too long on their turn.',
    sections: [
      {
        content: `Every competitive game has a leaderboard, and every leaderboard has a forum thread full of people insisting the rating system is rigged against them. I know because I have written some of those posts.

So when we built ranked play for LexiClash, I wanted the system to be genuinely explainable — not a black box, not vibes, but math you can interrogate. This post is that explanation. Not a marketing approximation of how ratings work. The actual mechanics, from the actual code, with the real numbers.

Fair warning: once you understand how rating systems work, you lose the ability to blame them. Proceed carefully.`,
      },
      {
        title: 'Everyone starts at 1000',
        content: `Your LexiClash rating is a single number that estimates your skill. Every new player starts at 1000. Not because we think you are average — because the system has literally never seen you play, and 1000 is the center of the scale.

Alongside your rating, the system tracks a second number most players never hear about: your rating deviation, or RD. RD measures how UNCERTAIN the system is about you. New players start with an RD of 350, which is the system shrugging and saying "this person could be anyone." Every game you play shrinks your RD — the system gets more confident — down to a floor of 50, which means "we have watched this player for a long time and we are pretty sure."

This one mechanic explains almost everything that feels weird about ratings. Keep reading.`,
      },
      {
        title: 'Why your first 30 games swing so wildly',
        content: `In your early games, your rating moves are deliberately huge. That is not a bug. It is the system trying to figure out where you belong as fast as possible.

The mechanism is called the K-factor — the maximum number of points a single game can move your rating. For your first 30 ranked games, your K-factor is 40. After that, it drops to 32 and stays there. High K plus high RD means a new player can jump or drop 30+ points in a single game, while a veteran with hundreds of games might see the same result move them 8 points.

This is the same philosophy chess federations use (FIDE gives new players K=40 too). The system is not punishing you in those early games — it is calibrating you. Losing five in a row at the start stings, but it is also dropping you toward opponents you can actually beat. Which is the entire point.`,
      },
      {
        title: 'The math behind a 1v1 game',
        content: `Head-to-head games use classic ELO math, the same formula that has rated chess players since the 1960s.

Before the game, the system computes your expected score: the probability you should win, given both ratings. The formula is 1 divided by (1 plus 10 to the power of ((their rating minus your rating) divided by 400)). In plain English: if your opponent is rated 400 points above you, the system expects you to win about 1 time in 10.

Then the update is beautifully simple. Your rating change equals your K-factor multiplied by (your actual result minus your expected result). Win a game you were expected to win 90% of the time? You gain only a sliver — about 10% of K — because the system learned almost nothing. Win a game you were supposed to lose? You gain most of K, because that result carries real information.

This is why beating stronger players rockets you up and beating weaker players barely moves the needle. The system is not counting wins. It is measuring surprise.`,
      },
      {
        title: 'Multiplayer rooms use a different algorithm entirely',
        content: `Here is the part almost nobody gets right about multiplayer ratings: you cannot just run 1v1 ELO on a 20-player room. Treating a 5th-place finish as "four losses" would wreck your rating even if you beat fourteen people.

So multiplayer games use the Weng-Lin algorithm (via the openskill library), a proper N-player ranking model in the same family as Microsoft's TrueSkill. Instead of "win or lose," it processes final placements across the whole field at once. Finishing 2nd out of 12 players is correctly read as a strong result. Finishing 2nd out of 3 is read as mediocre. Field size matters, and the math knows it.

Practical takeaway: in big rooms, a consistent top-third finish climbs your rating even without wins. You do not need to take first place every game. You need to reliably beat most of the field.`,
      },
      {
        title: 'The tier ladder, with real thresholds',
        content: `Your rating maps to a rank tier. These are the exact cutoffs, straight from the code:

Bronze starts at 800. Silver at 1000 — which means everyone begins their career at Silver, and dropping below 1000 sends you to Bronze, which is a genuinely humbling experience I can personally confirm. Gold at 1200. Platinum at 1400. Diamond at 1600. Master at 1800. And Grandmaster at 2000, where the people who haunt my dreams live.

Two things worth knowing. First, the gaps are not cosmetic — remember the 400-point rule. A Gold player (1200) beats a Bronze player (800) about nine times out of ten. Each tier represents a real, measurable skill jump. Second, the system also records your peak rating separately, so a bad week cannot erase the fact that you once touched Diamond. Your peak is yours forever.`,
      },
      {
        title: 'What seasons change (and what they do not)',
        content: `Ranked play runs in seasons — themed competitive windows with their own rewards and bragging rights. Seasons give the ladder a rhythm: a reason to push now rather than someday, and a natural moment to celebrate the players who grinded hardest.

What a season does not do is delete your skill. Your rating is an estimate built from your entire history, and the system keeps that memory. A new season is a new chapter, not a new identity — you will not wake up at 1000 again. (Your RD can loosen after a long break, though. Come back after two months away and your rating will swing more for a few games while the system re-calibrates. That is working as intended.)`,
      },
      {
        title: 'How to actually climb',
        content: `Everything above, turned into advice:

One, play more games early. Your first 30 games are calibration with an oversized K-factor — they are the cheapest rating you will ever earn or lose. Do not cherry-pick opponents during calibration; play everyone and let the math place you.

Two, in multiplayer rooms, optimize for consistent placement, not highlight-reel wins. Second place out of fifteen climbs faster over time than alternating first and last.

Three, protect your mental game after losses. A single loss costs you at most one K-factor — 32 to 40 points, less against strong opponents. It feels catastrophic. It is arithmetically minor. The players who climb are the ones who queue the next game instead of writing forum posts.

Four, remember what the number is. It is an estimate that follows your skill — not the other way around. Get better at finding words and the rating takes care of itself. Conveniently, we wrote a whole strategy guide for that part too.

See you on the ladder. I will be the one at Platinum, insisting I belong in Diamond.`,
      },
    ],
    backToBlog: 'Back to Blog',
    tryDaily: 'View the Leaderboard',
    practice: 'Play a Ranked Game',
  },
};
