/**
 * waveFailArpeggio — TDD for the descending 3-note empathy sound on wave fail.
 * Pure Web Audio API; never throws if AudioContext unavailable (server, muted).
 */
import { playWaveFailArpeggio, WAVE_FAIL_NOTES_HZ, WAVE_FAIL_NOTE_DURATION_MS } from '../waveFailArpeggio';

describe('waveFailArpeggio', () => {
  it('exposes 3 descending pentatonic-friendly notes (G4 → E4 → C3)', () => {
    expect(WAVE_FAIL_NOTES_HZ).toHaveLength(3);
    expect(WAVE_FAIL_NOTES_HZ[0]).toBeCloseTo(392, 0); // G4
    expect(WAVE_FAIL_NOTES_HZ[1]).toBeCloseTo(330, 0); // E4
    expect(WAVE_FAIL_NOTES_HZ[2]).toBeCloseTo(131, 0); // C3 (low C, empathy-cradled)
  });

  it('frequencies strictly descend (the empathy cue)', () => {
    expect(WAVE_FAIL_NOTES_HZ[0]).toBeGreaterThan(WAVE_FAIL_NOTES_HZ[1]);
    expect(WAVE_FAIL_NOTES_HZ[1]).toBeGreaterThan(WAVE_FAIL_NOTES_HZ[2]);
  });

  it('per-note duration is 150ms (research: gentle, not alarmist)', () => {
    expect(WAVE_FAIL_NOTE_DURATION_MS).toBe(150);
  });

  it('does NOT throw when AudioContext is unavailable', () => {
    const original = (globalThis as unknown as { AudioContext?: unknown }).AudioContext;
    // simulate environment without AudioContext (SSR, old browser)
    delete (globalThis as unknown as { AudioContext?: unknown }).AudioContext;
    delete (globalThis as unknown as { webkitAudioContext?: unknown }).webkitAudioContext;
    expect(() => playWaveFailArpeggio()).not.toThrow();
    if (original) (globalThis as unknown as { AudioContext: unknown }).AudioContext = original;
  });

  it('schedules 3 oscillator nodes when AudioContext is available', () => {
    const startSpy = jest.fn();
    const stopSpy = jest.fn();
    const connectSpy = jest.fn();
    const setValueAtTimeSpy = jest.fn();
    const exponentialRampSpy = jest.fn();

    const fakeOscillator = () => ({
      type: 'sine',
      frequency: { setValueAtTime: setValueAtTimeSpy },
      connect: connectSpy,
      start: startSpy,
      stop: stopSpy,
    });
    const fakeGain = () => ({
      gain: {
        setValueAtTime: setValueAtTimeSpy,
        exponentialRampToValueAtTime: exponentialRampSpy,
      },
      connect: connectSpy,
    });

    class FakeAudioContext {
      currentTime = 0;
      destination = {};
      createOscillator = jest.fn(fakeOscillator);
      createGain = jest.fn(fakeGain);
      close = jest.fn();
    }

    (globalThis as unknown as { AudioContext: typeof FakeAudioContext }).AudioContext = FakeAudioContext;

    playWaveFailArpeggio();

    // 3 oscillators (one per note)
    const ctx = (globalThis as unknown as { __lastFakeCtx?: FakeAudioContext }).__lastFakeCtx;
    // Clean up
    delete (globalThis as unknown as { AudioContext?: unknown }).AudioContext;
    expect(startSpy).toHaveBeenCalledTimes(3);
    expect(stopSpy).toHaveBeenCalledTimes(3);
  });
});
