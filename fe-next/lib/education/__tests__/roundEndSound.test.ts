/**
 * The mute contract, pinned.
 *
 * A results screen that plays a fanfare through a muted laptop in a silent
 * classroom is a bug a teacher never forgives. Every gate is tested because
 * every gate is one `&&` away from being dropped in a refactor.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { playRoundEndCue, ROUND_WIN_SOUND, CLASS_SWEEP_SOUND } from '../roundEndSound';

const play = vi.fn(() => Promise.resolve());

class FakeAudio {
  src: string;
  volume = 1;
  play = play;
  pause = vi.fn();
  constructor(src: string) {
    this.src = src;
  }
}

const open = { unlocked: true, muted: false, volume: 1 };

describe('playRoundEndCue', () => {
  beforeEach(() => {
    play.mockClear();
    vi.stubGlobal('Audio', FakeAudio as unknown as typeof Audio);
    vi.stubGlobal('window', { Audio: FakeAudio } as unknown as Window & typeof globalThis);
    vi.stubGlobal('document', { visibilityState: 'visible' } as unknown as Document);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('plays the cue when nothing is muted', () => {
    const audio = playRoundEndCue(ROUND_WIN_SOUND, open);
    expect(audio).not.toBeNull();
    expect(play).toHaveBeenCalledTimes(1);
  });

  it('stays silent when SFX are muted', () => {
    expect(playRoundEndCue(ROUND_WIN_SOUND, { ...open, muted: true })).toBeNull();
    expect(play).not.toHaveBeenCalled();
  });

  it('stays silent before audio has been unlocked by a gesture', () => {
    expect(playRoundEndCue(ROUND_WIN_SOUND, { ...open, unlocked: false })).toBeNull();
    expect(play).not.toHaveBeenCalled();
  });

  it('stays silent in a backgrounded tab', () => {
    vi.stubGlobal('document', { visibilityState: 'hidden' } as unknown as Document);
    expect(playRoundEndCue(ROUND_WIN_SOUND, open)).toBeNull();
  });

  it('scales the sting under the SFX volume rather than over it', () => {
    const audio = playRoundEndCue(CLASS_SWEEP_SOUND, { ...open, volume: 0.5 });
    expect(audio!.volume).toBeCloseTo(0.35);
  });

  it('never throws when the browser refuses to construct audio', () => {
    vi.stubGlobal('window', {
      Audio: function Broken() {
        throw new Error('NotAllowedError');
      },
    } as unknown as Window & typeof globalThis);
    expect(() => playRoundEndCue(ROUND_WIN_SOUND, open)).not.toThrow();
  });
});
