/**
 * Story Beat Configuration
 *
 * Dialogue beats shown between specific levels to build world narrative.
 * Each world has 3 beats: after levels 2, 4, and post-boss (7).
 */

export interface StoryBeat {
  worldId: number;
  afterLevel: number;
  characterKey: string;
  dialogueKey: string;
}

export const STORY_BEATS: StoryBeat[] = [
  // World 1 — Alphabet Meadows
  { worldId: 1, afterLevel: 2, characterKey: 'adventure.story.lexi', dialogueKey: 'adventure.story.w1.after2' },
  { worldId: 1, afterLevel: 4, characterKey: 'adventure.story.lexi', dialogueKey: 'adventure.story.w1.after4' },
  { worldId: 1, afterLevel: 7, characterKey: 'adventure.story.w1.boss', dialogueKey: 'adventure.story.w1.postBoss' },

  // World 2 — Synonym Springs
  { worldId: 2, afterLevel: 2, characterKey: 'adventure.story.lexi', dialogueKey: 'adventure.story.w2.after2' },
  { worldId: 2, afterLevel: 4, characterKey: 'adventure.story.lexi', dialogueKey: 'adventure.story.w2.after4' },
  { worldId: 2, afterLevel: 7, characterKey: 'adventure.story.w2.boss', dialogueKey: 'adventure.story.w2.postBoss' },

  // World 3 — Root Caverns
  { worldId: 3, afterLevel: 2, characterKey: 'adventure.story.lexi', dialogueKey: 'adventure.story.w3.after2' },
  { worldId: 3, afterLevel: 4, characterKey: 'adventure.story.lexi', dialogueKey: 'adventure.story.w3.after4' },
  { worldId: 3, afterLevel: 7, characterKey: 'adventure.story.w3.boss', dialogueKey: 'adventure.story.w3.postBoss' },

  // World 4 — Idiom Archipelago
  { worldId: 4, afterLevel: 2, characterKey: 'adventure.story.lexi', dialogueKey: 'adventure.story.w4.after2' },
  { worldId: 4, afterLevel: 4, characterKey: 'adventure.story.lexi', dialogueKey: 'adventure.story.w4.after4' },
  { worldId: 4, afterLevel: 7, characterKey: 'adventure.story.w4.boss', dialogueKey: 'adventure.story.w4.postBoss' },

  // World 5 — Compound Canyon
  { worldId: 5, afterLevel: 2, characterKey: 'adventure.story.lexi', dialogueKey: 'adventure.story.w5.after2' },
  { worldId: 5, afterLevel: 4, characterKey: 'adventure.story.lexi', dialogueKey: 'adventure.story.w5.after4' },
  { worldId: 5, afterLevel: 7, characterKey: 'adventure.story.w5.boss', dialogueKey: 'adventure.story.w5.postBoss' },
];

/** Get story beat for a world/level, or null if none */
export function getStoryBeat(worldId: number, levelNumber: number): StoryBeat | null {
  return STORY_BEATS.find(b => b.worldId === worldId && b.afterLevel === levelNumber) ?? null;
}
