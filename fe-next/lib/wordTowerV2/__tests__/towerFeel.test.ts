import { describe, expect, it } from 'vitest';
import { HapticPattern } from '@/utils/haptics/types';
import { feelCues, type FeelSnapshot } from '../towerFeel';

const base: FeelSnapshot = { floors: 0, combo: 0, over: false, collapsed: false, risk: 0 };

describe('feelCues', () => {
  it('given nothing changed, when compared, then no cues', () => {
    expect(feelCues(base, base, 4)).toEqual([]);
  });

  it('given a floor landed, when compared, then the mascot hears the word and the phone taps', () => {
    const cues = feelCues(base, { ...base, floors: 1 }, 5);
    expect(cues).toContainEqual({ mascot: { kind: 'word-submitted', wordLength: 5, gemLetterUsed: false } });
    expect(cues).toContainEqual({ haptic: HapticPattern.TAP });
  });

  it('given a landing that grew the combo, when compared, then the haptic is a success pulse', () => {
    const cues = feelCues({ ...base, floors: 2, combo: 1 }, { ...base, floors: 3, combo: 2 }, 4);
    expect(cues).toContainEqual({ haptic: HapticPattern.SUCCESS });
    expect(cues).not.toContainEqual({ haptic: HapticPattern.TAP });
  });

  it('given the floor goal was reached, when compared, then the mascot is proud', () => {
    const cues = feelCues({ ...base, floors: 4 }, { ...base, floors: 5 }, 3);
    expect(cues).toContainEqual({ mascot: { kind: 'wave-clear' } });
  });

  it('given the tower starts to wobble into danger, when compared, then the mascot gets nervous once', () => {
    const into = feelCues({ ...base, floors: 6, risk: 0.5 }, { ...base, floors: 6, risk: 0.75 }, 3);
    expect(into).toContainEqual({ mascot: { kind: 'low-moves', movesRemaining: 1 } });
    expect(into).toContainEqual({ haptic: HapticPattern.WARNING });
    const staying = feelCues({ ...base, floors: 6, risk: 0.75 }, { ...base, floors: 6, risk: 0.9 }, 3);
    expect(staying).toEqual([]);
  });

  it('given a collapse ends the run, when compared, then the mascot comforts and the phone rumbles', () => {
    const cues = feelCues({ ...base, floors: 8 }, { ...base, floors: 8, over: true, collapsed: true }, 3);
    expect(cues).toContainEqual({ mascot: { kind: 'wave-fail' } });
    expect(cues).toContainEqual({ haptic: HapticPattern.ERROR });
  });

  it('given a cash-out ends the run, when compared, then the mascot is proud, not sad', () => {
    const cues = feelCues({ ...base, floors: 8 }, { ...base, floors: 8, over: true }, 3);
    expect(cues).toContainEqual({ mascot: { kind: 'wave-clear' } });
    expect(cues).not.toContainEqual({ mascot: { kind: 'wave-fail' } });
  });

  it('given a new run reset the floors, when compared, then nothing fires', () => {
    expect(feelCues({ ...base, floors: 9, over: true }, base, 3)).toEqual([]);
  });
});
