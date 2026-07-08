/**
 * Guards the Hebrew copy for the fast-solve tip. The string previously read
 * "מהיר מהזיו" — a garbled rendering of "Lightning fast" that is not valid
 * Hebrew. This locks the corrected, natural phrasing in place.
 */
import { describe, it, expect } from 'vitest';
import { he } from '@/translations/he';

describe('Hebrew wordHuntTips copy quality', () => {
  const tip = (he as { wordHuntTips: Record<string, string> }).wordHuntTips.fastSolveFarmMore;

  it('does not contain the garbled "מהזיו" token', () => {
    expect(tip).not.toContain('מהזיו');
  });

  it('renders the "lightning fast" idiom in natural Hebrew', () => {
    expect(tip).toContain('כברק');
  });

  it('keeps the attempts placeholder', () => {
    expect(tip).toContain('{{attempts}}');
  });
});
