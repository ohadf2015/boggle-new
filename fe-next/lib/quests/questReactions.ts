export type QuestTier = 'quest' | 'pvp' | 'weekly' | 'grandSlam' | 'allComplete';
export type QuestConfetti = 'victory' | 'streak' | 'levelUp' | 'fireworks';
export type QuestSound = 'quest' | 'achievement' | 'perfect' | 'epic' | 'crown';

interface TierPool {
  cheers: string[];
  mascots: string[];
  confetti: QuestConfetti[];
  sounds: QuestSound[];
}

const cheers = (tier: QuestTier, n: number) =>
  Array.from({ length: n }, (_, i) => `quests.completion.cheers.${tier}.${i + 1}`);

// Common tier keeps to the ~20KB cutouts; the ~500KB animated ones only show on rare tiers.
export const QUEST_REACTIONS: Record<QuestTier, TierPool> = {
  quest: {
    cheers: cheers('quest', 6),
    mascots: ['/mascot/bridge-cheer-nobg.webp', '/mascot/victory-nobg.webp', '/mascot/hello-nobg.webp', '/mascot/streak-spark-nobg.webp'],
    confetti: ['victory', 'streak', 'levelUp'],
    sounds: ['quest', 'achievement', 'perfect'],
  },
  pvp: {
    cheers: cheers('pvp', 4),
    mascots: ['/mascot/onfire-nobg.webp', '/mascot/streak-supernova-nobg.webp', '/mascot/victory-nobg.webp'],
    confetti: ['fireworks', 'streak'],
    sounds: ['achievement', 'epic'],
  },
  weekly: {
    cheers: cheers('weekly', 3),
    mascots: ['/mascot/trophy-nobg.webp', '/mascot/streak-supernova-nobg.webp', '/mascot/powerup-nobg.webp'],
    confetti: ['fireworks', 'levelUp'],
    sounds: ['epic', 'achievement'],
  },
  grandSlam: {
    cheers: cheers('grandSlam', 4),
    mascots: ['/mascot/powerup-nobg.webp', '/mascot/mindblown-nobg.webp', '/mascot/streak-supernova-nobg.webp'],
    confetti: ['fireworks'],
    sounds: ['epic', 'crown'],
  },
  allComplete: {
    cheers: cheers('allComplete', 3),
    mascots: ['/mascot/trophy-nobg.webp', '/mascot/mindblown-nobg.webp'],
    confetti: ['fireworks'],
    sounds: ['crown'],
  },
};

export interface QuestReaction {
  cheerKey: string;
  mascot: string;
  confetti: QuestConfetti;
  sound: QuestSound;
}

const last = new Map<QuestTier, QuestReaction>();

const pick = <T,>(list: T[], rnd: number, skip?: T): T => {
  const pool = list.length > 1 && skip !== undefined ? list.filter((x) => x !== skip) : list;
  return pool[Math.min(pool.length - 1, Math.floor(rnd * pool.length))];
};

/** Random reaction for a tier that never repeats the previous cheer or mascot of that tier. */
export function pickQuestReaction(tier: QuestTier, random: () => number = Math.random): QuestReaction {
  const p = QUEST_REACTIONS[tier];
  const prev = last.get(tier);
  const reaction: QuestReaction = {
    cheerKey: pick(p.cheers, random(), prev?.cheerKey),
    mascot: pick(p.mascots, random(), prev?.mascot),
    confetti: pick(p.confetti, random()),
    sound: pick(p.sounds, random()),
  };
  last.set(tier, reaction);
  return reaction;
}
