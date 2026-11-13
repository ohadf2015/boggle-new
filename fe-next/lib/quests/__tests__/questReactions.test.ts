import { describe, it, expect } from 'vitest';
import { pickQuestReaction, QUEST_REACTIONS, type QuestTier } from '../questReactions';

const TIERS: QuestTier[] = ['quest', 'pvp', 'weekly', 'grandSlam', 'allComplete'];

describe('pickQuestReaction', () => {
  it('given the same random value twice in a row, when picking, then the second reaction differs from the first', () => {
    for (const tier of TIERS) {
      const first = pickQuestReaction(tier, () => 0);
      const second = pickQuestReaction(tier, () => 0);
      expect(second.cheerKey === first.cheerKey && second.mascot === first.mascot).toBe(false);
    }
  });

  it('given many picks, when counting cheers, then every cheer in the pool shows up', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) seen.add(pickQuestReaction('quest').cheerKey);
    expect(seen.size).toBe(QUEST_REACTIONS.quest.cheers.length);
  });

  it('keeps the heavy animated mascots out of the common quest tier', () => {
    const heavy = ['trophy', 'powerup', 'onfire', 'mindblown'];
    for (const m of QUEST_REACTIONS.quest.mascots) expect(heavy.some((h) => m.includes(h))).toBe(false);
  });

  it('every cheer key lives under quests.completion.cheers', () => {
    for (const tier of TIERS) {
      for (const k of QUEST_REACTIONS[tier].cheers) expect(k.startsWith(`quests.completion.cheers.${tier}.`)).toBe(true);
    }
  });
});
