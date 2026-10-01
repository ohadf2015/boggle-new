import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { Howl } from 'howler';
import { useMusicFocusManager } from '../useMusicFocusManager';
import { emitRewardAdActive } from '@/hooks/useRewardAdPause';

vi.mock('howler', () => ({ Howler: {} }));

function stalledHowl(node: { paused: boolean }) {
  return {
    _sounds: [{ _paused: false, _ended: false, _node: node }],
    playing: vi.fn(() => true),
    pause: vi.fn(),
    play: vi.fn(() => { node.paused = false; }),
    stop: vi.fn(),
    volume: vi.fn(() => 0.5),
  };
}

function setup(howl: ReturnType<typeof stalledHowl>, { unlocked = true, muted = false } = {}) {
  return renderHook(() =>
    useMusicFocusManager({
      currentHowlRef: { current: howl as unknown as Howl },
      currentTrackRef: { current: 'bossa' },
      howlsRef: { current: { bossa: howl as unknown as Howl } },
      isMutedRef: { current: muted },
      volumeRef: { current: 0.5 },
      audioUnlockedRef: { current: unlocked },
    })
  );
}

describe('useMusicFocusManager — music the OS paused under Howler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(document, 'hasFocus').mockReturnValue(true);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('restarts the track once it has stayed stalled across two focus polls', () => {
    const howl = stalledHowl({ paused: true });
    setup(howl);
    vi.advanceTimersByTime(1000);
    expect(howl.play).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(howl.pause).toHaveBeenCalledTimes(1);
    expect(howl.play).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(3000);
    expect(howl.play).toHaveBeenCalledTimes(1);
  });

  it('does not touch a muted or still-locked player', () => {
    const muted = stalledHowl({ paused: true });
    setup(muted, { muted: true });
    const locked = stalledHowl({ paused: true });
    setup(locked, { unlocked: false });
    vi.advanceTimersByTime(5000);
    expect(muted.play).not.toHaveBeenCalled();
    expect(locked.play).not.toHaveBeenCalled();
  });

  it('pauses music while a fullscreen ad covers the app and resumes it after', () => {
    const node = { paused: false };
    let playing = true;
    const howl = stalledHowl(node);
    howl.playing.mockImplementation(() => playing);
    howl.pause.mockImplementation(() => { playing = false; node.paused = true; });
    howl.play.mockImplementation(() => { playing = true; node.paused = false; });
    setup(howl);

    act(() => emitRewardAdActive(true));
    expect(howl.pause).toHaveBeenCalledTimes(1);
    expect(playing).toBe(false);

    act(() => emitRewardAdActive(false));
    expect(howl.play).toHaveBeenCalledTimes(1);
    expect(playing).toBe(true);
  });

  it('resumeAudio restarts a stalled track instead of trusting playing()', () => {
    const howl = stalledHowl({ paused: true });
    const { result } = setup(howl);
    result.current.resumeAudio('test');
    expect(howl.play).toHaveBeenCalledTimes(1);
  });
});
