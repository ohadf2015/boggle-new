/**
 * cringeFirewall — policy-as-code invariants for the Blast mascot/feedback layer.
 *
 * These tests overlap intentionally with unit tests; their purpose is to be
 * explicit about which design decisions are LOAD-BEARING and would constitute
 * regressions if accidentally changed. If one of these tests fails, the fix is
 * a design conversation, not a test edit.
 *
 * Sources behind each invariant:
 *   - Royal Match / Snoopy Pop research: 4s cooldown prevents Clippy fatigue
 *   - Spelling Bee research: 10s same-pose cooldown stops "obviously looped"
 *   - Apple HIG + research: failure cues must comfort, not mock
 *   - candy-shell rollback (2026-05-06): celebrations must stay <800ms
 */
import {
  GLOBAL_COOLDOWN_MS,
  STATE_COOLDOWN_MS,
  MASCOT_GIF_PATHS,
  pickMascotStateForLifecycle,
  reduceMascotEvent,
  createInitialMascotState,
} from '../mascotState';
import {
  WAVE_FAIL_NOTES_HZ,
  WAVE_FAIL_NOTE_DURATION_MS,
} from '../waveFailArpeggio';

describe('CringeFirewall — anti-spam cooldowns', () => {
  it('global cooldown is at least 4 seconds (Clippy-fatigue threshold)', () => {
    expect(GLOBAL_COOLDOWN_MS).toBeGreaterThanOrEqual(4000);
  });

  it('per-state cooldown is at least 10 seconds (no obvious-loop repetition)', () => {
    expect(STATE_COOLDOWN_MS).toBeGreaterThanOrEqual(10000);
  });
});

describe('CringeFirewall — empathy on loss', () => {
  it('wave-fail returns "sad-supportive" — NEVER cheer/dancing/proud', () => {
    const state = pickMascotStateForLifecycle({ kind: 'wave-fail' });
    expect(state).toBe('sad-supportive');
    expect(state).not.toBe('cheer');
    expect(state).not.toBe('dancing');
    expect(state).not.toBe('proud');
    expect(state).not.toBe('awe');
  });

  it('wave-fail asset is the crying empathy gif (not a smug or mocking pose)', () => {
    expect(MASCOT_GIF_PATHS['sad-supportive']).toBe('/mascot/crying-nobg.gif');
  });

  it('wave-fail BYPASSES cooldown (player must always see empathy on loss)', () => {
    const justFired = {
      current: 'cheer' as const,
      lastTransitionAt: 1000,
      perStateLastFiredAt: { cheer: 1000 },
    };
    // 500ms after a cheer (well inside 4s global cooldown) — fail still shows
    const next = reduceMascotEvent(justFired, { kind: 'wave-fail' }, 1500);
    expect(next.current).toBe('sad-supportive');
  });

  it('wave-fail audio descends (G4 → E4 → C3) — not a triumph cue', () => {
    expect(WAVE_FAIL_NOTES_HZ[0]).toBeGreaterThan(WAVE_FAIL_NOTES_HZ[1]);
    expect(WAVE_FAIL_NOTES_HZ[1]).toBeGreaterThan(WAVE_FAIL_NOTES_HZ[2]);
  });
});

describe('CringeFirewall — animation budget', () => {
  it('wave-fail arpeggio total duration < 800ms (no 5-second parade)', () => {
    const total = WAVE_FAIL_NOTES_HZ.length * WAVE_FAIL_NOTE_DURATION_MS;
    expect(total).toBeLessThan(800);
  });
});

describe('CringeFirewall — initial state contract', () => {
  it('createInitialMascotState() always returns idle (no flashy first-impression)', () => {
    expect(createInitialMascotState().current).toBe('idle');
  });

  it('idle asset is a static jpg (no animated GIF on first paint)', () => {
    expect(MASCOT_GIF_PATHS['idle']).toMatch(/\.jpg$/);
  });

  it('focused (mid-drag) asset is also static — no distraction during thought', () => {
    expect(MASCOT_GIF_PATHS['focused']).toMatch(/\.jpg$/);
  });
});

describe('CringeFirewall — reaction tier monotonicity', () => {
  it('animated GIFs are reserved for celebration / surprise / empathy moments', () => {
    // Ensure the high-arousal states use animated GIFs (not static jpgs that
    // would feel undersized for the moment)
    expect(MASCOT_GIF_PATHS['cheer']).toMatch(/\.gif$/);
    expect(MASCOT_GIF_PATHS['wow']).toMatch(/\.gif$/);
    expect(MASCOT_GIF_PATHS['awe']).toMatch(/\.gif$/);
    expect(MASCOT_GIF_PATHS['oh']).toMatch(/\.gif$/);
    expect(MASCOT_GIF_PATHS['sad-supportive']).toMatch(/\.gif$/);
    expect(MASCOT_GIF_PATHS['proud']).toMatch(/\.gif$/);
    expect(MASCOT_GIF_PATHS['dancing']).toMatch(/\.gif$/);
  });

  it('every mascot path lives under /public (no remote URLs that could 404)', () => {
    for (const path of Object.values(MASCOT_GIF_PATHS)) {
      expect(path.startsWith('/')).toBe(true);
      expect(path.startsWith('/http')).toBe(false);
    }
  });
});
