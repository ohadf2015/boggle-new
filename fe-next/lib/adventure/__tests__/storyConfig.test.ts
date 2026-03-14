/**
 * storyConfig Tests
 */

import { getStoryBeat, STORY_BEATS } from '../storyConfig';

describe('storyConfig', () => {
  it('returns story beat for world 1 after level 2', () => {
    const beat = getStoryBeat(1, 2);
    expect(beat).not.toBeNull();
    expect(beat!.worldId).toBe(1);
    expect(beat!.afterLevel).toBe(2);
  });

  it('returns null for non-existent beat', () => {
    expect(getStoryBeat(1, 3)).toBeNull();
    expect(getStoryBeat(99, 1)).toBeNull();
  });

  it('has 3 beats per world for worlds 1-5', () => {
    for (let w = 1; w <= 5; w++) {
      const beats = STORY_BEATS.filter(b => b.worldId === w);
      expect(beats).toHaveLength(3);
    }
  });

  it('has 15 total beats', () => {
    expect(STORY_BEATS).toHaveLength(15);
  });

  it('returns correct beat for world 3 after level 7', () => {
    const beat = getStoryBeat(3, 7);
    expect(beat).not.toBeNull();
    expect(beat!.dialogueKey).toContain('w3');
  });
});
