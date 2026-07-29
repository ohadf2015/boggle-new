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

  // World 6 — Anagram Labyrinth
  { worldId: 6, afterLevel: 2, characterKey: 'adventure.story.lexi', dialogueKey: 'adventure.story.w6.after2' },
  { worldId: 6, afterLevel: 4, characterKey: 'adventure.story.lexi', dialogueKey: 'adventure.story.w6.after4' },
  { worldId: 6, afterLevel: 7, characterKey: 'adventure.story.w6.boss', dialogueKey: 'adventure.story.w6.postBoss' },

  // World 7 — Mirror Palace
  { worldId: 7, afterLevel: 2, characterKey: 'adventure.story.lexi', dialogueKey: 'adventure.story.w7.after2' },
  { worldId: 7, afterLevel: 4, characterKey: 'adventure.story.lexi', dialogueKey: 'adventure.story.w7.after4' },
  { worldId: 7, afterLevel: 7, characterKey: 'adventure.story.w7.boss', dialogueKey: 'adventure.story.w7.postBoss' },

  // World 8 — Neologism Nebula
  { worldId: 8, afterLevel: 2, characterKey: 'adventure.story.lexi', dialogueKey: 'adventure.story.w8.after2' },
  { worldId: 8, afterLevel: 4, characterKey: 'adventure.story.lexi', dialogueKey: 'adventure.story.w8.after4' },
  { worldId: 8, afterLevel: 7, characterKey: 'adventure.story.w8.boss', dialogueKey: 'adventure.story.w8.postBoss' },

  // World 9 — Polyglot Peaks
  { worldId: 9, afterLevel: 2, characterKey: 'adventure.story.lexi', dialogueKey: 'adventure.story.w9.after2' },
  { worldId: 9, afterLevel: 4, characterKey: 'adventure.story.lexi', dialogueKey: 'adventure.story.w9.after4' },
  { worldId: 9, afterLevel: 7, characterKey: 'adventure.story.w9.boss', dialogueKey: 'adventure.story.w9.postBoss' },

  // World 10 — Lexicon Throne
  { worldId: 10, afterLevel: 2, characterKey: 'adventure.story.lexi', dialogueKey: 'adventure.story.w10.after2' },
  { worldId: 10, afterLevel: 4, characterKey: 'adventure.story.lexi', dialogueKey: 'adventure.story.w10.after4' },
  { worldId: 10, afterLevel: 7, characterKey: 'adventure.story.w10.boss', dialogueKey: 'adventure.story.w10.postBoss' },
];

/** Get story beat for a world/level, or null if none */
export function getStoryBeat(worldId: number, levelNumber: number): StoryBeat | null {
  return STORY_BEATS.find(b => b.worldId === worldId && b.afterLevel === levelNumber) ?? null;
}
