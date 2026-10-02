import { describe, it, expect, vi } from 'vitest';
import type { Howl } from 'howler';
import { isHowlStalled, restartStalledHowl } from '../howlStall';

type FakeSound = { _paused: boolean; _ended: boolean; _node?: { paused: boolean } };

function fakeHowl(sounds: FakeSound[], playing = true) {
  return {
    _sounds: sounds,
    playing: vi.fn(() => playing),
    pause: vi.fn(),
    play: vi.fn(),
  } as unknown as Howl & { pause: ReturnType<typeof vi.fn>; play: ReturnType<typeof vi.fn> };
}

describe('isHowlStalled', () => {
  it('is true when Howler thinks it plays but the element was paused externally', () => {
    expect(isHowlStalled(fakeHowl([{ _paused: false, _ended: false, _node: { paused: true } }]))).toBe(true);
  });

  it('is false while the element is really playing', () => {
    expect(isHowlStalled(fakeHowl([{ _paused: false, _ended: false, _node: { paused: false } }]))).toBe(false);
  });

  it('is false when Howler itself paused it', () => {
    expect(isHowlStalled(fakeHowl([{ _paused: true, _ended: false, _node: { paused: true } }], false))).toBe(false);
  });

  it('ignores ended sounds and Web Audio sounds without an element', () => {
    expect(isHowlStalled(fakeHowl([{ _paused: false, _ended: true, _node: { paused: true } }]))).toBe(false);
    expect(isHowlStalled(fakeHowl([{ _paused: false, _ended: false }]))).toBe(false);
  });

  it('is false for a missing howl', () => {
    expect(isHowlStalled(null)).toBe(false);
  });
});

describe('restartStalledHowl', () => {
  it('pauses through Howler then plays, so the existing sound resumes instead of a second one starting', () => {
    const howl = fakeHowl([{ _paused: false, _ended: false, _node: { paused: true } }]);
    expect(restartStalledHowl(howl)).toBe(true);
    expect(howl.pause).toHaveBeenCalledBefore(howl.play);
  });

  it('leaves a healthy howl alone', () => {
    const howl = fakeHowl([{ _paused: false, _ended: false, _node: { paused: false } }]);
    expect(restartStalledHowl(howl)).toBe(false);
    expect(howl.play).not.toHaveBeenCalled();
  });
});
