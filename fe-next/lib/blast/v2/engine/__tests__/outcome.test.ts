import { describe, it, expect } from 'vitest';
import { selectResultOutcome } from '../outcome';

describe('selectResultOutcome', () => {
  it('maps a mastered win to a full celebration that advances via Next', () => {
    const out = selectResultOutcome({ status: 'levelComplete', completionReason: 'mastered' });
    expect(out).toEqual({
      variant: 'mastered',
      cta: 'next',
      advances: true,
      celebration: 'full',
    });
  });

  it('maps a partial finish to a softer celebration that still advances (partial is a WIN)', () => {
    const out = selectResultOutcome({ status: 'levelComplete', completionReason: 'partial' });
    expect(out).toEqual({
      variant: 'partial',
      cta: 'next',
      advances: true,
      celebration: 'soft',
    });
  });

  it('maps a failed level to a calm retry with NO celebration and NO advance', () => {
    const out = selectResultOutcome({ status: 'levelFailed', completionReason: null });
    expect(out).toEqual({
      variant: 'levelFailed',
      cta: 'retry',
      advances: false,
      celebration: 'none',
    });
  });

  it('defensively treats a complete level with an unknown reason as mastered', () => {
    const out = selectResultOutcome({ status: 'levelComplete', completionReason: null });
    expect(out.variant).toBe('mastered');
    expect(out.advances).toBe(true);
  });
});
